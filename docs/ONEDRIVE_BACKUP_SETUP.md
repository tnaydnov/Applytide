# OneDrive Backup Setup Guide

This guide shows you how to set up automatic backups to OneDrive from your AWS server.

## Why OneDrive?

✅ **Always accessible** - No need for your PC to be on  
✅ **Free storage** - Uses your existing OneDrive space  
✅ **Automatic sync** - Appears on your PC when it's on  
✅ **Cloud safety** - Off-site disaster recovery  
✅ **Zero server space** - Backups go straight to cloud  

## Setup Steps

### Step 1: Install rclone on AWS Server

SSH into your AWS server and run:

```bash
curl https://rclone.org/install.sh | sudo bash
```

Verify installation:
```bash
rclone version
```

### Step 2: Configure OneDrive Remote

Run the configuration wizard:

```bash
rclone config
```

Follow these steps:

1. **New remote**: Type `n` and press Enter
2. **Name**: Type `onedrive` and press Enter
3. **Storage type**: Type `onedrive` (or the number for Microsoft OneDrive)
4. **Client ID**: Just press Enter (leave blank)
5. **Client Secret**: Just press Enter (leave blank)
6. **Region**: Choose `1` for Microsoft Cloud Global
7. **Edit advanced config**: Type `n` (No)
8. **Auto config**: Type `n` (No) - because you're on a remote server

9. **You'll see a message like:**
   ```
   Option config_token.
   For this to work, you will need rclone available on a machine that has
   a web browser available.
   
   For more help and alternate methods see: https://rclone.org/remote_setup/
   
   Execute the following on the machine with the web browser (same rclone
   version recommended):
   
       rclone authorize "onedrive"
   
   Then paste the result.
   Enter a value.
   config_token>
   ```

10. **On your LOCAL PC** (Windows), open PowerShell and run:
    ```powershell
    # Install rclone on your PC if not already installed
    # Download from: https://rclone.org/downloads/
    
    # Then run:
    rclone authorize "onedrive"
    ```

11. **This will open a browser** - Login to your Microsoft account and authorize rclone

12. **Copy the token** - You'll get output like:
    ```
    Paste the following into your remote machine --->
    {"access_token":"xxxxx","token_type":"Bearer","refresh_token":"xxxxx","expiry":"2024-..."}
    <---End paste
    ```

13. **Paste the token** back on the AWS server into the `config_token>` prompt

14. **Choose drive type**: Type `1` for OneDrive Personal

15. **Choose drive**: Type `0` to use your main OneDrive

16. **Confirm**: Type `y` (Yes, this is OK)

17. **Quit**: Type `q` to quit config

### Step 3: Verify OneDrive Connection

Test the connection:

```bash
# List your OneDrive contents
rclone lsd onedrive:

# You should see your OneDrive folders
```

Create the backup folder on OneDrive:

```bash
rclone mkdir onedrive:Applytide_Data/Backups
```

### Step 4: Make Backup Script Executable

```bash
cd /root/applytide  # or wherever your project is
chmod +x scripts/backup-to-onedrive.sh
```

### Step 5: Test Manual Backup

Run a test backup:

```bash
./scripts/backup-to-onedrive.sh manual
```

Watch for:
- ✓ All components backed up
- ✓ Upload progress to OneDrive
- ✓ Success message

Check on your PC:
- Open OneDrive folder
- Look for: `Applytide_Data/Backups/manual/`
- You should see folders: `db/`, `uploads/`, `redis/`, `logs/`, `config/`

### Step 6: Set Up Automatic Backups

Add to crontab on AWS server:

```bash
crontab -e
```

Add these lines:

```bash
# Applytide OneDrive Backups
# Daily backup at 2 AM
0 2 * * * cd /root/applytide && ./scripts/backup-to-onedrive.sh daily >> /var/log/applytide-backup.log 2>&1

# Weekly backup every Sunday at 3 AM
0 3 * * 0 cd /root/applytide && ./scripts/backup-to-onedrive.sh weekly >> /var/log/applytide-backup.log 2>&1
```

Save and exit.

### Step 7: Check Backup Logs

View backup logs:

```bash
tail -f /var/log/applytide-backup.log
```

## Usage

### Manual Backup

```bash
./scripts/backup-to-onedrive.sh manual
```

### Daily Backup (7 day retention)

```bash
./scripts/backup-to-onedrive.sh daily
```

### Weekly Backup (30 day retention)

```bash
./scripts/backup-to-onedrive.sh weekly
```

## Backup Location

Backups are stored in:

```
OneDrive:/Applytide_Data/Backups/
├── daily/
│   ├── db/          (Database backups)
│   ├── uploads/     (User uploaded files)
│   ├── redis/       (Sessions & cache)
│   ├── logs/        (Application logs)
│   └── config/      (Configuration files)
├── weekly/
│   └── (same structure)
└── manual/
    └── (same structure)
```

On your PC, this appears at:
```
C:\Users\PC\OneDrive\Applytide_Data\Backups\
```

## Retention Policy

- **Daily backups**: Kept for 7 days
- **Weekly backups**: Kept for 30 days
- **Manual backups**: Kept for 365 days (1 year)

Old backups are automatically deleted to save space.

## Storage Estimates

Approximate OneDrive storage needed:

| Component | Size | Daily (7 days) | Weekly (4 weeks) | Total |
|-----------|------|----------------|------------------|-------|
| Database | 500 MB | 3.5 GB | 2 GB | 5.5 GB |
| Uploads | 200 MB | 1.4 GB | 800 MB | 2.2 GB |
| Redis | 50 MB | 350 MB | 200 MB | 550 MB |
| Logs | 100 MB | 700 MB | 400 MB | 1.1 GB |
| Config | 1 MB | 7 MB | 4 MB | 11 MB |
| **Total** | | **~6 GB** | **~3.4 GB** | **~9.4 GB** |

**OneDrive Free Tier**: 5 GB (might need to upgrade to 100 GB for $1.99/month or use Microsoft 365)

## Troubleshooting

### "rclone: command not found"

Install rclone:
```bash
curl https://rclone.org/install.sh | sudo bash
```

### "Failed to create file system for onedrive"

Your rclone remote is not configured. Run:
```bash
rclone config
```

### "Access token expired"

Refresh the token:
```bash
rclone config reconnect onedrive:
```

### Backups not appearing on PC

1. Check if OneDrive is running on your PC
2. Check OneDrive sync status (right-click OneDrive icon in taskbar)
3. Make sure you're not pausing sync

### Upload is very slow

- Check your AWS server's upload bandwidth
- Increase rclone transfers: Edit script and change `--transfers 4` to `--transfers 8`

## Security Notes

- ✅ Config backups **DO NOT** include environment variable values
- ✅ Only variable names are saved (e.g., `DATABASE_URL=` not the actual value)
- ✅ Sensitive data is protected
- ✅ rclone uses encrypted connection to OneDrive

## Restore Instructions

### Restore from OneDrive

1. Download backups from OneDrive to your PC
2. Copy them to AWS server:
   ```bash
   scp -r "C:\Users\PC\OneDrive\Applytide_Data\Backups\daily" root@applytide.com:/tmp/restore/
   ```

3. On AWS server, restore:
   ```bash
   # Restore database
   gunzip < /tmp/restore/daily/db/applytide_db_*.sql.gz | \
   docker-compose -f docker-compose.prod.yml exec -T pg psql -U applytide_user -d applytide_prod
   
   # Restore uploads
   tar -xzf /tmp/restore/daily/uploads/applytide_uploads_*.tar.gz -C backend/app/
   
   # Restore Redis
   docker cp /tmp/restore/daily/redis/dump.rdb applytide_redis:/data/dump.rdb
   docker-compose -f docker-compose.prod.yml restart redis
   ```

## Alternative: OneDrive Desktop App

If you prefer using OneDrive's desktop app instead of rclone:

1. Install OneDrive sync on AWS (if Linux supports it)
2. Or set up a Windows VM/PC as backup proxy
3. Not recommended for server environments

## Cost Comparison

| Solution | Cost | Reliability | Setup Difficulty |
|----------|------|-------------|------------------|
| **OneDrive (rclone)** | Free (5GB) or $1.99/mo (100GB) | ⭐⭐⭐⭐⭐ | Easy |
| Server + PC sync | Free | ⭐⭐⭐ (PC must be on) | Easy |
| AWS S3 | $0.023/GB/mo (~$2.60/year) | ⭐⭐⭐⭐⭐ | Medium |

## Advantages of OneDrive Solution

✅ **No PC dependency** - Your PC can be off  
✅ **Always accessible** - Access backups from anywhere  
✅ **Automatic to PC** - Syncs to PC when it's on  
✅ **Version history** - OneDrive keeps file versions  
✅ **Easy sharing** - Share backups with team if needed  
✅ **Mobile access** - Access from OneDrive mobile app  

## Next Steps

1. ✅ Install rclone on AWS server
2. ✅ Configure OneDrive remote
3. ✅ Test manual backup
4. ✅ Set up automatic cron jobs
5. ✅ Monitor first few backups
6. ✅ Check OneDrive sync on your PC

---

**Need help?** Check the backup logs: `tail -f /var/log/applytide-backup.log`
