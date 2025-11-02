# Applytide Backup System

Comprehensive backup solution for Applytide that maintains 30 days of rolling backups on your server.

## 📋 Overview

This backup system provides:
- ✅ **Daily automated backups** at 2:00 AM
- ✅ **30-day retention** with automatic cleanup
- ✅ **Complete data coverage**: Database, files, configuration
- ✅ **Easy restoration** with interactive restore tool
- ✅ **Zero external dependencies** - all backups stored locally

## 🗂️ What Gets Backed Up

| Component | Description | Format |
|-----------|-------------|--------|
| **PostgreSQL** | Complete database dump | Compressed SQL (`.sql.gz`) |
| **Documents** | User-uploaded documents | Tar archive (`.tar.gz`) |
| **Attachments** | Application attachments | Tar archive (`.tar.gz`) |
| **Redis** | Cache and session data | RDB snapshot (`.rdb`) |
| **Configuration** | Environment & Docker configs | Tar archive (`.tar.gz`) |

## 📦 Installation

### On Your Server (Ubuntu/Linux)

1. **Navigate to application directory:**
   ```bash
   cd /opt/applytide
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x scripts/backup.sh
   chmod +x scripts/restore.sh
   chmod +x scripts/setup-backup-cron.sh
   ```

3. **Run setup script:**
   ```bash
   sudo bash scripts/setup-backup-cron.sh
   ```

   This will:
   - Create backup directories
   - Install backup script to `/usr/local/bin/applytide-backup`
   - Configure daily cron job at 2:00 AM
   - Create necessary Docker volumes
   - Run initial test backup

4. **Update Docker Compose (if needed):**
   ```bash
   # Pull latest compose file with volume mounts
   git pull origin main
   
   # Recreate containers with new volume configuration
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🚀 Usage

### Manual Backup

Run a backup anytime:
```bash
sudo applytide-backup
```

Or from the scripts directory:
```bash
sudo bash scripts/backup.sh
```

### View Backups

List all available backups:
```bash
ls -lh /var/backups/applytide/
```

Example output:
```
drwxr-x--- 2 root root 4.0K Nov  2 02:00 2025-11-01
drwxr-x--- 2 root root 4.0K Nov  3 02:00 2025-11-02
drwxr-x--- 2 root root 4.0K Nov  4 02:00 2025-11-03
```

View backup contents:
```bash
ls -lh /var/backups/applytide/2025-11-02/
```

### Check Backup Logs

View real-time backup activity:
```bash
tail -f /var/backups/applytide/backup.log
```

View cron job output:
```bash
tail -f /var/backups/applytide/logs/cron.log
```

### Restore from Backup

**⚠️ WARNING: Restoration will OVERWRITE your current data!**

#### Interactive Mode (Recommended)
```bash
sudo bash scripts/restore.sh
```

This will show you a list of available backups to choose from.

#### Restore Specific Date
```bash
sudo bash scripts/restore.sh 2025-11-02
```

#### Restore Latest Backup
```bash
sudo bash scripts/restore.sh latest
```

## 📅 Backup Schedule

Backups run automatically via cron:

| When | Time | Frequency |
|------|------|-----------|
| **Daily** | 2:00 AM | Every day |

View cron schedule:
```bash
crontab -l | grep applytide
```

Expected output:
```
0 2 * * * /usr/local/bin/applytide-backup >> /var/backups/applytide/logs/cron.log 2>&1
```

## 🔄 Retention Policy

- **Retention period:** 30 days
- **Automatic cleanup:** Yes
- **Cleanup schedule:** Daily (after new backup completes)

Backups older than 30 days are automatically deleted to prevent disk space issues.

## 💾 Disk Space Requirements

Estimate required space based on your data:

| Data Size | Backup Size (Compressed) | 30-Day Total |
|-----------|-------------------------|--------------|
| 1 GB | ~500 MB | ~15 GB |
| 5 GB | ~2.5 GB | ~75 GB |
| 10 GB | ~5 GB | ~150 GB |

**Check current usage:**
```bash
# Total backup size
du -sh /var/backups/applytide/

# Individual backup sizes
du -sh /var/backups/applytide/*/

# Available disk space
df -h /var/backups
```

## 🛠️ Troubleshooting

### Backup Failed

1. **Check logs:**
   ```bash
   tail -n 100 /var/backups/applytide/backup.log
   ```

2. **Verify containers are running:**
   ```bash
   docker ps
   ```

3. **Check disk space:**
   ```bash
   df -h /var/backups
   ```

4. **Run manual backup with verbose output:**
   ```bash
   sudo bash -x scripts/backup.sh
   ```

### Cron Job Not Running

1. **Verify cron job exists:**
   ```bash
   crontab -l | grep applytide
   ```

2. **Check cron service:**
   ```bash
   sudo systemctl status cron
   ```

3. **View cron logs:**
   ```bash
   sudo grep CRON /var/log/syslog | grep applytide
   ```

### Disk Space Full

If you're running out of space:

1. **Reduce retention period:**
   Edit `/usr/local/bin/applytide-backup` and change:
   ```bash
   RETENTION_DAYS=30  # Change to 14 or 7
   ```

2. **Manually delete old backups:**
   ```bash
   sudo rm -rf /var/backups/applytide/2025-10-*
   ```

3. **Move backups to external storage:**
   ```bash
   sudo rsync -av /var/backups/applytide/ /mnt/external/backups/
   ```

## 🔐 Security Considerations

- **Permissions:** Backup directory is owned by root (`chmod 750`)
- **Database passwords:** Passed securely via environment variables
- **Access:** Only root/sudo can access backups
- **Encryption:** Backups are NOT encrypted (add GPG encryption if needed)

### Optional: Encrypt Backups

Add GPG encryption to backup script:
```bash
# After creating backup file, encrypt it
gpg --symmetric --cipher-algo AES256 backup_file.tar.gz
rm backup_file.tar.gz  # Remove unencrypted version
```

## 📊 Backup Verification

After backup completes, verify integrity:

```bash
# Check database backup
gunzip -t /var/backups/applytide/2025-11-02/postgres_*.sql.gz

# Check tar archives
tar -tzf /var/backups/applytide/2025-11-02/documents_*.tar.gz > /dev/null
tar -tzf /var/backups/applytide/2025-11-02/attachments_*.tar.gz > /dev/null

# View backup summary
cat /var/backups/applytide/backup.log | grep "Backup Summary" -A 10
```

## 🔄 Disaster Recovery

### Full System Restore

1. **Provision new server** (Ubuntu 22.04+)
2. **Install Docker & Docker Compose**
3. **Clone repository:**
   ```bash
   cd /opt
   git clone https://github.com/tnaydnov/applytide.git
   cd applytide
   ```

4. **Copy backup files to new server:**
   ```bash
   scp -r old-server:/var/backups/applytide /var/backups/
   ```

5. **Deploy application:**
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your credentials
   docker-compose -f docker-compose.prod.yml up -d
   ```

6. **Restore from backup:**
   ```bash
   sudo bash scripts/restore.sh latest
   ```

7. **Verify and test application**

## 📝 Customization

### Change Backup Schedule

Edit cron job:
```bash
crontab -e
```

Common schedules:
```bash
# Every 6 hours
0 */6 * * * /usr/local/bin/applytide-backup

# Twice daily (2 AM and 2 PM)
0 2,14 * * * /usr/local/bin/applytide-backup

# Weekly on Sunday at 3 AM
0 3 * * 0 /usr/local/bin/applytide-backup
```

### Change Retention Period

Edit backup script:
```bash
sudo nano /usr/local/bin/applytide-backup
```

Find and modify:
```bash
RETENTION_DAYS=30  # Change to desired days
```

### Change Backup Location

Edit both backup and restore scripts:
```bash
sudo nano /usr/local/bin/applytide-backup
sudo nano /opt/applytide/scripts/restore.sh
```

Change:
```bash
BACKUP_ROOT="/var/backups/applytide"  # Change path
```

## 🆘 Support

If you encounter issues:

1. Check logs: `/var/backups/applytide/backup.log`
2. Verify Docker containers: `docker ps`
3. Check disk space: `df -h`
4. Review cron logs: `sudo grep CRON /var/log/syslog`

## 📜 Files Overview

```
scripts/
├── backup.sh                 # Main backup script
├── restore.sh                # Interactive restore tool
├── setup-backup-cron.sh      # One-time setup script
└── BACKUP_README.md          # This file

/var/backups/applytide/       # Backup storage location
├── 2025-11-01/               # Daily backup directory
│   ├── postgres_*.sql.gz
│   ├── documents_*.tar.gz
│   ├── attachments_*.tar.gz
│   ├── redis_*.rdb
│   └── config_*.tar.gz
├── 2025-11-02/
├── backup.log                # Main log file
└── logs/
    └── cron.log              # Cron execution log
```

## ✅ Best Practices

1. **Monitor backup sizes** - Watch for unexpected growth
2. **Test restores regularly** - Verify backups actually work
3. **Keep external copies** - Occasionally copy backups off-server
4. **Document credentials** - Store database passwords securely
5. **Review logs monthly** - Check for failures or warnings
6. **Plan disk capacity** - Ensure sufficient space for growth

---

**Last Updated:** November 2, 2025
**Maintainer:** Applytide Team
