# Applytide Backup System - Implementation Summary

## 🎯 Overview

Implemented a comprehensive **local server backup system** with 30-day retention for Applytide. This replaces the previous OneDrive-based backup approach with a simpler, more reliable solution.

---

## ✅ What Was Created

### 1. Core Backup Scripts

#### `scripts/backup.sh` ⭐
**Main backup script** - Handles complete system backup
- **Database:** PostgreSQL dump (compressed .sql.gz)
- **Files:** Documents and attachments (tar.gz)
- **Cache:** Redis RDB snapshot
- **Config:** Environment files and Docker configs
- **Retention:** Automatic cleanup of backups older than 30 days
- **Logging:** Detailed logs with size tracking

#### `scripts/setup-backup-cron.sh` ⭐
**One-time setup script** - Configures the backup system
- Creates backup directories
- Installs backup script to `/usr/local/bin/applytide-backup`
- Configures daily cron job (2:00 AM)
- Creates Docker volumes
- Runs initial test backup
- Provides detailed output and verification

#### `scripts/restore.sh` ⭐
**Interactive restore tool** - Restores from backups
- Three modes: interactive, specific date, latest
- Safe restoration with confirmation prompts
- Temporary backup before overwriting
- Post-restore verification
- Container restart automation

#### `scripts/check-backup-status.sh`
**Status monitoring tool** - Comprehensive health check
- Backup directory status
- Cron job verification
- Recent backup list with age
- Disk space monitoring with warnings
- Docker container status
- Volume verification
- Log analysis

---

## 📋 Documentation

### `scripts/BACKUP_README.md`
Complete documentation covering:
- Installation instructions
- Usage examples
- Troubleshooting guide
- Disaster recovery procedures
- Customization options
- Security considerations
- Best practices

### `scripts/BACKUP_QUICK_REFERENCE.txt`
Quick reference card with:
- Common commands
- File locations
- Monitoring commands
- Schedule information
- Troubleshooting steps

---

## 🔧 Infrastructure Updates

### `docker-compose.prod.yml` (Updated)
Added persistent volume mounts:
```yaml
volumes:
  pgdata:           # PostgreSQL data
  redis_data:       # Redis persistence
  documents:        # User documents
  attachments:      # Application files
```

### `docker-compose.yml` (Updated)
Same volume configuration for development environment

### Redis Configuration
Updated Redis to enable persistence:
```bash
--save 60 1000  # Save every 60 seconds if 1000+ keys changed
```

---

## 📂 File Structure

```
scripts/
├── backup.sh                      # Main backup script
├── restore.sh                     # Restore utility
├── setup-backup-cron.sh           # Setup installer
├── check-backup-status.sh         # Status checker
├── BACKUP_README.md               # Full documentation
├── BACKUP_QUICK_REFERENCE.txt     # Quick reference
└── backup-to-onedrive.sh          # Deprecated (marked)

/var/backups/applytide/            # Server location
├── 2025-11-01/                    # Daily backups
│   ├── postgres_*.sql.gz
│   ├── documents_*.tar.gz
│   ├── attachments_*.tar.gz
│   ├── redis_*.rdb
│   └── config_*.tar.gz
├── 2025-11-02/
├── backup.log                     # Main log
└── logs/
    └── cron.log                   # Cron output
```

---

## 🚀 Deployment Steps

### On Your Server

1. **Pull the changes:**
   ```bash
   cd /opt/applytide
   git pull origin main
   ```

2. **Run setup script:**
   ```bash
   chmod +x scripts/*.sh
   sudo bash scripts/setup-backup-cron.sh
   ```

3. **Update Docker containers:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify backup system:**
   ```bash
   sudo bash scripts/check-backup-status.sh
   ```

That's it! Backups will now run automatically every day at 2:00 AM.

---

## 🎁 Key Features

### ✅ Automatic Daily Backups
- Scheduled via cron at 2:00 AM
- No manual intervention needed
- Email notifications possible (via cron MAILTO)

### ✅ 30-Day Retention
- Old backups automatically deleted
- Disk space managed automatically
- Configurable retention period

### ✅ Complete Coverage
- PostgreSQL database with all tables
- User-uploaded documents
- Application attachments
- Redis cache/sessions
- Configuration files

### ✅ Easy Restoration
- Interactive mode (choose from list)
- Specific date restoration
- Latest backup restoration
- Safety confirmations

### ✅ Monitoring & Logs
- Detailed backup logs
- Size tracking
- Success/failure notifications
- Status checker tool

### ✅ Zero External Dependencies
- No cloud services required
- No rclone configuration
- No API credentials needed
- Self-contained solution

---

## 📊 Backup Size Estimates

Based on typical usage:

| Your Data | Compressed Backup | 30-Day Total |
|-----------|-------------------|--------------|
| 1 GB      | ~500 MB          | ~15 GB       |
| 5 GB      | ~2.5 GB          | ~75 GB       |
| 10 GB     | ~5 GB            | ~150 GB      |

**Compression ratio:** ~50% (varies by file type)

---

## 🔐 Security Notes

- Backups owned by **root** (chmod 750)
- Database passwords from `.env.production`
- Stored locally on server
- **Not encrypted** (can add GPG if needed)
- Access requires sudo/root

---

## 🛠️ Common Operations

### Manual Backup
```bash
sudo applytide-backup
```

### View Backups
```bash
ls -lh /var/backups/applytide/
```

### Check Status
```bash
sudo bash scripts/check-backup-status.sh
```

### Restore (Interactive)
```bash
sudo bash scripts/restore.sh
```

### View Logs
```bash
tail -f /var/backups/applytide/backup.log
```

### Check Disk Space
```bash
df -h /var/backups
du -sh /var/backups/applytide/*
```

---

## 🔄 Comparison: Old vs New

| Feature | Old (OneDrive) | New (Local) |
|---------|---------------|-------------|
| **Storage** | Cloud (OneDrive) | Server local |
| **Dependencies** | rclone, OAuth | None |
| **Setup complexity** | High | Low |
| **Speed** | Slow (upload time) | Fast |
| **Reliability** | Network dependent | Self-contained |
| **Cost** | OneDrive storage | Server disk |
| **Recovery** | Download first | Instant |
| **Automation** | Manual trigger | Cron scheduled |

---

## 📈 Future Enhancements (Optional)

### 1. Off-site Backup
Add periodic sync to external storage:
```bash
# Weekly rsync to external drive
0 3 * * 0 rsync -av /var/backups/applytide/ /mnt/external/backups/
```

### 2. Encryption
Add GPG encryption for sensitive data:
```bash
gpg --symmetric --cipher-algo AES256 backup.tar.gz
```

### 3. Email Notifications
Configure cron to send email on failure:
```bash
MAILTO=admin@applytide.com
0 2 * * * /usr/local/bin/applytide-backup || echo "Backup failed"
```

### 4. Backup Verification
Automated integrity checks:
```bash
# Test database restore
gunzip -t postgres_*.sql.gz
# Verify tar archives
tar -tzf documents_*.tar.gz > /dev/null
```

### 5. Monitoring Integration
Send metrics to monitoring service:
- Backup size
- Duration
- Success/failure rate
- Disk usage trends

---

## 🎓 Best Practices

1. **Test restores regularly** - Verify backups work
2. **Monitor disk space** - Ensure sufficient capacity
3. **Keep external copies** - Occasional off-site backup
4. **Document passwords** - Store credentials securely
5. **Review logs monthly** - Check for issues
6. **Plan for growth** - Scale storage as data grows

---

## 📞 Support

If issues occur:

1. Check logs: `/var/backups/applytide/backup.log`
2. Run status check: `sudo bash scripts/check-backup-status.sh`
3. Verify containers: `docker ps`
4. Check disk: `df -h /var/backups`
5. Test manual backup: `sudo applytide-backup`

---

## ✨ Summary

You now have a **production-ready backup system** that:
- ✅ Runs automatically every day
- ✅ Keeps 30 days of backups
- ✅ Backs up everything important
- ✅ Can restore with one command
- ✅ Monitors itself
- ✅ Manages disk space
- ✅ Requires no maintenance

**Next Step:** Deploy to your server and run the setup script!

---

**Created:** November 2, 2025  
**System:** Applytide Backup v1.0  
**Method:** Local server storage with automatic rotation
