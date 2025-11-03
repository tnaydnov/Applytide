# 🖥️ Applytide Server Command Reference - Complete Guide

**Last Updated:** November 2, 2025  
**Server:** Ubuntu Production Environment

This is your **comprehensive command reference** for managing the Applytide server. Every command you'll ever need, with detailed explanations.

---

## 📚 Table of Contents

1. [Docker Services Management](#docker-services-management)
2. [Application Logs](#application-logs)
3. [Database Operations](#database-operations)
4. [File Management](#file-management)
5. [Backup Operations](#backup-operations)
6. [System Monitoring](#system-monitoring)
7. [Cleanup & Maintenance](#cleanup--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security & Access](#security--access)
10. [Emergency Procedures](#emergency-procedures)

---

## 🐳 Docker Services Management

### Start All Services

```bash
cd /opt/applytide
docker compose -f docker-compose.prod.yml up -d
```
**What it does:** Starts all containers (API, frontend, database, Redis, Nginx, worker) in detached mode (background).  
**When to use:** After server restart, initial deployment, or after stopping services.  
**Safe:** Yes, can run anytime. Won't lose data.

---

### Stop All Services

```bash
cd /opt/applytide
docker compose -f docker-compose.prod.yml down
```
**What it does:** Gracefully stops and removes all containers. **Data in volumes is preserved.**  
**When to use:** Before server maintenance, updating configs, or troubleshooting.  
**Safe:** Yes. Volumes (database, files) are not affected.  
**⚠️ Warning:** Users will lose access during downtime.

---

### Stop Without Removing Containers

```bash
cd /opt/applytide
docker compose -f docker-compose.prod.yml stop
```
**What it does:** Stops containers but doesn't remove them.  
**When to use:** Temporary pause without full shutdown.  
**Difference from `down`:** Faster restart with `docker compose start`.

---

### Restart All Services

```bash
cd /opt/applytide
docker compose -f docker-compose.prod.yml restart
```
**What it does:** Restarts all containers without rebuilding.  
**When to use:** After config changes, to apply environment variable updates, or if services are misbehaving.  
**Safe:** Yes. Brief downtime (~5-10 seconds).

---

### Restart Single Service

```bash
# Restart API only
docker compose -f docker-compose.prod.yml restart backend

# Restart specific services
docker compose -f docker-compose.prod.yml restart backend worker
```
**What it does:** Restarts only specified containers.  
**When to use:** When only one service needs restart (e.g., after code deploy to API).  
**Services available:** `backend`, `frontend`, `pg`, `redis`, `worker`, `nginx`

---

### Rebuild and Restart (After Code Changes)

```bash
cd /opt/applytide

# Pull latest code
git pull origin main

# Rebuild images and restart
docker compose -f docker-compose.prod.yml up -d --build

# Or rebuild specific service
docker compose -f docker-compose.prod.yml up -d --build backend
```
**What it does:** Rebuilds Docker images from Dockerfile, then starts containers.  
**When to use:** After pulling new code, Dockerfile changes, or dependency updates.  
**Time:** 2-10 minutes depending on changes.  
**⚠️ Warning:** Brief downtime during rebuild.

---

### View Running Containers

```bash
docker ps
```
**What it does:** Lists all running containers with status, ports, uptime.  
**Expected output:** Should see 6 containers (pg, redis, backend, frontend, worker, nginx).  
**When to use:** Check if services are running, verify container health.

```bash
# Show all containers (including stopped)
docker ps -a

# Show only container names
docker ps --format '{{.Names}}'

# Show with size
docker ps -s
```

---

### Check Container Status & Health

```bash
# Detailed info on specific container
docker inspect applytide_api

# Check if container is healthy
docker inspect --format='{{.State.Health.Status}}' applytide_api

# View container stats (CPU, memory)
docker stats

# Stats for specific container
docker stats applytide_api applytide_pg
```
**What it does:** Shows detailed container information, health status, resource usage.  
**When to use:** Debugging, performance monitoring, health checks.

---

### Force Recreate All Containers

```bash
cd /opt/applytide
docker compose -f docker-compose.prod.yml up -d --force-recreate
```
**What it does:** Removes and recreates all containers even if configuration hasn't changed.  
**When to use:** When containers are in a weird state, networking issues, or as last resort.  
**Safe:** Yes. Volumes preserved.

---

### Pull Latest Images (Production with GHCR)

```bash
cd /opt/applytide

# Login to GitHub Container Registry first
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Then restart with new images
docker compose -f docker-compose.prod.yml up -d
```
**What it does:** Downloads latest pre-built images from GitHub Container Registry.  
**When to use:** When you've pushed new images via CI/CD.  
**Note:** Requires GITHUB_TOKEN environment variable.

---

## 📋 Application Logs

### View Live Logs (All Services)

```bash
cd /opt/applytide
docker compose -f docker-compose.prod.yml logs -f
```
**What it does:** Shows real-time logs from all containers, follows new output.  
**When to use:** Monitoring live activity, debugging issues as they happen.  
**Stop:** Press `Ctrl+C`

---

### View Logs for Specific Service

```bash
# API logs (most useful for debugging)
docker logs -f applytide_api

# Database logs
docker logs -f applytide_pg

# Worker logs (for background jobs, reminders)
docker logs -f applytide_worker

# Frontend logs
docker logs -f applytide_web

# Nginx logs (web server, access logs)
docker logs -f applytide_nginx

# Redis logs
docker logs -f applytide_redis
```
**What it does:** Shows logs for single container with follow mode.  
**When to use:** Focused debugging on specific service.  
**Stop:** Press `Ctrl+C`

---

### View Last N Lines of Logs

```bash
# Last 100 lines
docker logs --tail 100 applytide_api

# Last 500 lines
docker logs --tail 500 applytide_api

# Last 100 lines and follow
docker logs --tail 100 -f applytide_api
```
**What it does:** Shows recent log entries without loading entire history.  
**When to use:** Quick check for recent errors without scrolling.

---

### Search Logs for Specific Text

```bash
# Search for errors in API logs
docker logs applytide_api 2>&1 | grep -i error

# Search for specific user activity
docker logs applytide_api 2>&1 | grep "user_id=abc-123"

# Search with context (5 lines before/after match)
docker logs applytide_api 2>&1 | grep -C 5 "error"

# Count occurrences
docker logs applytide_api 2>&1 | grep -c "error"
```
**What it does:** Filters logs for specific patterns.  
**When to use:** Finding specific errors, tracking user actions, debugging issues.

---

### Save Logs to File

```bash
# Save all API logs
docker logs applytide_api > ~/api_logs_$(date +%Y%m%d_%H%M%S).log

# Save last hour (with timestamps)
docker logs --since 1h applytide_api > ~/api_recent.log

# Save logs from specific time range
docker logs --since "2025-11-02T10:00:00" --until "2025-11-02T11:00:00" applytide_api > ~/logs.txt
```
**What it does:** Exports logs to file for analysis or sharing.  
**When to use:** Preserving logs for debugging, sending to support, archiving.

---

### View Backup Logs

```bash
# Backup system logs
tail -f /var/backups/applytide/backup.log

# Last 100 backup log lines
tail -n 100 /var/backups/applytide/backup.log

# Cron job logs
tail -f /var/backups/applytide/logs/cron.log

# Search backup logs for errors
grep -i error /var/backups/applytide/backup.log
```
**What it does:** Shows backup system logs (not Docker container logs).  
**When to use:** Verify backups ran successfully, troubleshoot backup failures.

---

### View Nginx Access Logs (Web Traffic)

```bash
# Real-time access log
docker logs -f applytide_nginx

# Count requests by IP
docker logs applytide_nginx 2>&1 | awk '{print $1}' | sort | uniq -c | sort -nr

# Find 404 errors
docker logs applytide_nginx 2>&1 | grep " 404 "

# Find 500 errors (server errors)
docker logs applytide_nginx 2>&1 | grep " 500 "
```
**What it does:** Shows web server access and error logs.  
**When to use:** Monitoring traffic, finding broken links, debugging HTTP errors.

---

## 🗄️ Database Operations

### Access PostgreSQL Shell

```bash
# Interactive SQL prompt
docker exec -it applytide_pg psql -U applytide_user -d applytide_prod
```
**What it does:** Opens PostgreSQL command-line interface.  
**When to use:** Running SQL queries, inspecting data, manual fixes.  
**Exit:** Type `\q` or press `Ctrl+D`

**Common SQL commands inside psql:**
```sql
-- List all tables
\dt

-- Describe table structure
\d users

-- Show table sizes
SELECT 
    schemaname AS schema,
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Count users
SELECT COUNT(*) FROM users;

-- Exit
\q
```

---

### Run SQL Query from Command Line

```bash
# Single query
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "SELECT COUNT(*) FROM users;"

# Multiple queries
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "
SELECT 
    'Users' as type, COUNT(*) as count FROM users
UNION ALL
SELECT 
    'Jobs' as type, COUNT(*) FROM jobs
UNION ALL
SELECT 
    'Applications' as type, COUNT(*) FROM applications;
"
```
**What it does:** Executes SQL without entering interactive mode.  
**When to use:** Quick checks, scripts, automation.

---

### Check Database Size

```bash
# Total database size
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c \
  "SELECT pg_size_pretty(pg_database_size('applytide_prod'));"

# Per-table sizes
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c \
  "SELECT 
     tablename, 
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables 
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 10;"
```
**What it does:** Shows database and table sizes in human-readable format.  
**When to use:** Monitoring growth, identifying large tables, capacity planning.

---

### Backup Database Manually

```bash
# Create backup
docker exec applytide_pg pg_dump -U applytide_user applytide_prod | gzip > ~/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup with password from env
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" applytide_pg \
  pg_dump -U applytide_user applytide_prod | gzip > ~/db_backup.sql.gz
```
**What it does:** Creates compressed SQL dump of entire database.  
**When to use:** Before risky operations, extra safety, exporting data.  
**Size:** Typically 10-50% of actual database size.

---

### Restore Database from Backup

```bash
# ⚠️ DANGER: This will OVERWRITE your database!

# Stop API to prevent connections
docker compose -f docker-compose.prod.yml stop backend worker

# Restore from backup file
gunzip -c ~/db_backup.sql.gz | docker exec -i applytide_pg \
  psql -U applytide_user -d applytide_prod

# Restart services
docker compose -f docker-compose.prod.yml start backend worker
```
**What it does:** Restores database from SQL dump file.  
**When to use:** Disaster recovery, migrating data, fixing corrupted database.  
**⚠️ DANGER:** All current data will be replaced!

---

### Database Connection Info

```bash
# Test connection
docker exec applytide_pg pg_isready -U applytide_user -d applytide_prod

# Show active connections
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c \
  "SELECT pid, usename, application_name, client_addr, state 
   FROM pg_stat_activity 
   WHERE datname = 'applytide_prod';"

# Kill specific connection (if needed)
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c \
  "SELECT pg_terminate_backend(12345);"  # Replace 12345 with actual PID
```
**What it does:** Shows/manages database connections.  
**When to use:** Debugging connection issues, killing hung queries, monitoring.

---

### Vacuum Database (Cleanup & Optimize)

```bash
# Full vacuum (reclaim space)
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "VACUUM FULL VERBOSE;"

# Analyze only (update statistics)
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "ANALYZE VERBOSE;"

# Vacuum specific table
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "VACUUM FULL VERBOSE users;"
```
**What it does:** Reclaims storage, updates query planner statistics, optimizes performance.  
**When to use:** After deleting lots of data, performance issues, weekly maintenance.  
**⚠️ Note:** `VACUUM FULL` locks tables briefly.

---

### Drop Database (DANGER!)

```bash
# ⚠️ EXTREME DANGER: This permanently deletes ALL data!

# First, backup!
docker exec applytide_pg pg_dump -U applytide_user applytide_prod | gzip > ~/FINAL_BACKUP.sql.gz

# Stop all connections
docker compose -f docker-compose.prod.yml stop backend worker

# Drop database
docker exec applytide_pg psql -U applytide_user -d postgres -c \
  "DROP DATABASE applytide_prod;"

# Recreate empty database
docker exec applytide_pg psql -U applytide_user -d postgres -c \
  "CREATE DATABASE applytide_prod OWNER applytide_user;"

# Run migrations to recreate tables
docker exec applytide_api alembic upgrade head
```
**What it does:** Permanently deletes entire database and recreates it empty.  
**When to use:** Fresh start, major migrations, fixing catastrophic corruption.  
**⚠️ IRREVERSIBLE:** Make sure you have backups!

---

## 📁 File Management

### List Uploaded Files

```bash
# List documents
sudo ls -lh /var/lib/docker/volumes/applytide_documents/_data/

# Count documents
sudo find /var/lib/docker/volumes/applytide_documents/_data -type f | wc -l

# List attachments
sudo ls -lh /var/lib/docker/volumes/applytide_attachments/_data/

# Find specific file by UUID
sudo find /var/lib/docker/volumes/applytide_documents/_data -name "*abc-123*"
```
**What it does:** Shows uploaded user files in Docker volumes.  
**When to use:** Verifying uploads, finding specific files, checking storage.  
**Note:** Requires sudo (root access).

---

### Check File Storage Size

```bash
# Documents volume size
sudo du -sh /var/lib/docker/volumes/applytide_documents/_data

# Attachments volume size
sudo du -sh /var/lib/docker/volumes/applytide_attachments/_data

# All volumes
sudo du -sh /var/lib/docker/volumes/applytide_*/_data

# Detailed breakdown
sudo du -h --max-depth=1 /var/lib/docker/volumes/applytide_documents/_data | sort -h
```
**What it does:** Calculates total size of uploaded files.  
**When to use:** Monitoring storage usage, capacity planning, finding large directories.

---

### Download File from Server

```bash
# Copy from server to local machine (run on your computer)
scp user@applytide.com:/var/lib/docker/volumes/applytide_documents/_data/abc-123.pdf ~/Downloads/

# Or use rsync
rsync -avz user@applytide.com:/var/lib/docker/volumes/applytide_documents/_data/abc-123.pdf ~/Downloads/
```
**What it does:** Downloads file from server to your computer.  
**When to use:** Recovering specific files, debugging file issues, user support.

---

### Upload File to Server

```bash
# Copy from local to server (run on your computer)
scp ~/file.pdf user@applytide.com:/tmp/

# Then on server, move to correct location
sudo mv /tmp/file.pdf /var/lib/docker/volumes/applytide_documents/_data/
sudo chown 999:999 /var/lib/docker/volumes/applytide_documents/_data/file.pdf
```
**What it does:** Uploads file to server and places in Docker volume.  
**When to use:** Manual file restoration, testing, data migration.  
**Note:** Fix ownership to match container user (usually 999:999).

---

### Delete Specific File

```bash
# ⚠️ Delete document (cannot be undone!)
sudo rm /var/lib/docker/volumes/applytide_documents/_data/abc-123-def.pdf
sudo rm /var/lib/docker/volumes/applytide_documents/_data/abc-123-def.pdf.meta.json

# Delete all files older than 90 days
sudo find /var/lib/docker/volumes/applytide_documents/_data -type f -mtime +90 -delete
```
**What it does:** Permanently removes files from storage.  
**When to use:** Manual cleanup, removing specific files, compliance (GDPR).  
**⚠️ Warning:** Irreversible! Database references may break.

---

### Find Large Files

```bash
# Top 10 largest documents
sudo find /var/lib/docker/volumes/applytide_documents/_data -type f -exec ls -lh {} \; | sort -k5 -hr | head -10

# Files larger than 10MB
sudo find /var/lib/docker/volumes/applytide_documents/_data -type f -size +10M -exec ls -lh {} \;

# Total size by file extension
sudo find /var/lib/docker/volumes/applytide_documents/_data -type f | sed 's/.*\.//' | sort | uniq -c | sort -nr
```
**What it does:** Identifies large files consuming storage.  
**When to use:** Storage optimization, finding outliers, cleanup planning.

---

### Check File Permissions

```bash
# View permissions
sudo ls -la /var/lib/docker/volumes/applytide_documents/_data/

# Fix permissions if needed (container user is usually 999:999)
sudo chown -R 999:999 /var/lib/docker/volumes/applytide_documents/_data/
sudo chmod -R 755 /var/lib/docker/volumes/applytide_documents/_data/
```
**What it does:** Shows/fixes file ownership and permissions.  
**When to use:** File access errors, after manual file operations, troubleshooting.

---

## 💾 Backup Operations

### Run Manual Backup

```bash
# Run backup script
sudo applytide-backup

# Or from scripts directory
sudo bash /opt/applytide/scripts/backup.sh
```
**What it does:** Creates full backup (database, files, configs) immediately.  
**When to use:** Before major changes, before updates, extra safety.  
**Time:** 2-10 minutes depending on data size.  
**Location:** `/var/backups/applytide/YYYY-MM-DD/`

---

### List All Backups

```bash
# List backup directories
ls -lh /var/backups/applytide/

# Detailed view with sizes
du -sh /var/backups/applytide/*/ | sort -h

# Show backup contents
ls -lh /var/backups/applytide/2025-11-02/

# Count backups
find /var/backups/applytide -maxdepth 1 -type d -name "20*" | wc -l
```
**What it does:** Shows all available backups with sizes and dates.  
**When to use:** Checking backup history, finding specific backup, verification.

---

### Check Backup Status

```bash
# Run status checker
sudo bash /opt/applytide/scripts/check-backup-status.sh

# Quick check - view last backup
tail -n 50 /var/backups/applytide/backup.log | grep "Backup completed"

# Check cron schedule
crontab -l | grep applytide

# View cron execution log
tail -f /var/backups/applytide/logs/cron.log
```
**What it does:** Verifies backup system is working correctly.  
**When to use:** Weekly checks, after setup, troubleshooting.

---

### Restore from Backup

```bash
# Interactive mode (choose from list)
sudo bash /opt/applytide/scripts/restore.sh

# Restore specific date
sudo bash /opt/applytide/scripts/restore.sh 2025-11-02

# Restore latest backup
sudo bash /opt/applytide/scripts/restore.sh latest
```
**What it does:** Restores database and files from backup.  
**When to use:** Disaster recovery, data corruption, user error.  
**⚠️ Warning:** Overwrites current data! Requires confirmation.

---

### Delete Old Backups Manually

```bash
# Delete backups older than 45 days
sudo find /var/backups/applytide -maxdepth 1 -type d -name "20*" -mtime +45 -exec rm -rf {} \;

# Delete specific backup
sudo rm -rf /var/backups/applytide/2025-10-15/

# Keep only last 10 backups
ls -t /var/backups/applytide/20*/ -d | tail -n +11 | xargs sudo rm -rf
```
**What it does:** Removes old backups to free disk space.  
**When to use:** Disk space low, custom retention policy.  
**Note:** Automatic cleanup happens after 30 days by default.

---

### Check Backup Disk Usage

```bash
# Total backup storage
du -sh /var/backups/applytide/

# Individual backup sizes
du -sh /var/backups/applytide/*/

# Available space
df -h /var/backups

# Show only backup folder size percentage
df -h /var/backups | tail -1 | awk '{print "Used: "$3" / "$2" ("$5")"}'
```
**What it does:** Shows how much space backups are using.  
**When to use:** Capacity planning, checking if enough space for backups.

---

### Test Backup Integrity

```bash
# Test database backup
gunzip -t /var/backups/applytide/2025-11-02/postgres_*.sql.gz

# Test tar archives
tar -tzf /var/backups/applytide/2025-11-02/documents_*.tar.gz > /dev/null
tar -tzf /var/backups/applytide/2025-11-02/attachments_*.tar.gz > /dev/null

# List contents of backup
tar -tzf /var/backups/applytide/2025-11-02/documents_*.tar.gz | less
```
**What it does:** Verifies backups are not corrupted and can be restored.  
**When to use:** Monthly verification, before relying on old backups.

---

## 📊 System Monitoring

### Check Disk Space

```bash
# Overall disk usage
df -h

# Docker volumes specifically
df -h | grep docker

# Show only key filesystems
df -h /var/lib/docker/volumes /var/backups /opt

# Alert if disk > 80% full
df -h | awk '{ if($5+0 > 80) print $0 }'
```
**What it does:** Shows available disk space on all filesystems.  
**When to use:** Daily checks, troubleshooting, capacity planning.  
**Alert:** If > 90% full, take action immediately!

---

### Check Docker Disk Usage

```bash
# Comprehensive Docker disk usage
docker system df

# Detailed view (all volumes, images, containers)
docker system df -v

# Show only volumes
docker volume ls
docker system df -v | grep -A 100 "Local Volumes"
```
**What it does:** Shows disk space used by Docker (images, containers, volumes).  
**When to use:** Understanding Docker storage, cleanup planning.

---

### Monitor CPU & Memory

```bash
# Real-time system stats
htop

# Or use top
top

# Docker container stats
docker stats

# Specific containers only
docker stats applytide_api applytide_pg applytide_redis

# One-time snapshot
docker stats --no-stream
```
**What it does:** Shows CPU, memory, network usage for containers.  
**When to use:** Performance monitoring, identifying resource hogs, optimization.  
**Exit:** Press `q` or `Ctrl+C`

---

### Check Memory Usage

```bash
# Overall system memory
free -h

# Per-container memory
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"

# Memory hogs
ps aux | sort -k4 -r | head -10
```
**What it does:** Shows RAM usage system-wide and per-container.  
**When to use:** Performance issues, memory leaks, capacity planning.

---

### Check Network Connections

```bash
# Active connections to app
netstat -ant | grep :443 | wc -l  # HTTPS connections

# Or with ss
ss -ant | grep :443 | wc -l

# Show connections by state
netstat -ant | awk '{print $6}' | sort | uniq -c

# Check if ports are listening
netstat -tulpn | grep -E ':(80|443|5432|6379)'
```
**What it does:** Shows network connections, listening ports.  
**When to use:** Debugging connection issues, monitoring traffic, security checks.

---

### Check System Load

```bash
# Load averages (1, 5, 15 minutes)
uptime

# Detailed load info
cat /proc/loadavg

# Check if system is overloaded (load > CPU cores)
nproc  # Show number of CPU cores
uptime  # Compare load average to core count
```
**What it does:** Shows system load (how busy CPU is).  
**When to use:** Performance issues, capacity planning.  
**Rule of thumb:** Load should be < number of CPU cores.

---

### View System Logs

```bash
# System log (general)
journalctl -xe

# Docker daemon logs
journalctl -u docker

# Cron logs
grep CRON /var/log/syslog | tail -50

# Authentication logs (login attempts)
tail -f /var/log/auth.log
```
**What it does:** Shows system-level logs (not application logs).  
**When to use:** System issues, security monitoring, debugging services.

---

## 🧹 Cleanup & Maintenance

### Clean Docker System (Safe)

```bash
# Remove stopped containers, unused networks, dangling images
docker system prune

# With confirmation
docker system prune -f
```
**What it does:** Cleans up Docker resources no longer in use.  
**What it removes:**
- Stopped containers
- Unused networks
- Dangling images (untagged)
- Build cache

**What it KEEPS:**
- Running containers
- Volumes
- Tagged images

**When to use:** Monthly maintenance, disk space low, cleanup.  
**Safe:** Yes, does NOT delete volumes or data.

---

### Clean Docker System (Aggressive)

```bash
# 🚨 EXTREME DANGER: This DELETES ALL USER DATA! 🚨
docker system prune -a --volumes -f
```

**🔴 THIS COMMAND WILL DELETE:**
- **ALL user uploaded documents** (applytide_documents volume)
- **ALL user uploaded attachments** (applytide_attachments volume)  
- **ENTIRE PostgreSQL database** (applytide_pgdata volume)
  - All user accounts
  - All job applications
  - All saved jobs
  - ALL USER DATA
- **Redis cache** (applytide_redis_data volume)
- All stopped containers
- All unused networks
- All unused images
- All build cache

**✅ WHAT SURVIVES:**
- Your backups in `/var/backups/applytide/` (can restore from here!)
- Your application code in `/opt/applytide/`

**When to use:** 
- ❌ **NEVER use this for routine cleanup!**
- ✅ Only when intentionally wiping everything to start fresh
- ✅ Testing disaster recovery procedures
- ✅ Decommissioning the server

**⚠️ If you accidentally run this:**
```bash
# Your data is gone, but backups are safe!
cd /opt/applytide
docker compose up -d
sudo bash scripts/restore.sh --latest
# You're back online with restored data
```

**✅ SAFE ALTERNATIVE (Use this instead!):**
```bash
# Remove everything EXCEPT volumes - THIS IS SAFE
docker system prune -a -f

# Then manually inspect and remove specific volumes if needed
docker volume ls
docker volume rm volume_name_here
```

---

### Remove Unused Docker Images

```bash
# List all images
docker images

# Remove specific image
docker rmi image_name:tag

# Remove all unused images
docker image prune -a

# Remove dangling images only
docker image prune
```
**What it does:** Frees space by removing old/unused Docker images.  
**When to use:** After many rebuilds, disk space low.  
**Safe:** Yes, won't affect running containers.

---

### Remove Unused Volumes

```bash
# List all volumes
docker volume ls

# Show volume details
docker volume inspect applytide_documents

# Remove specific volume (⚠️ DATA LOSS!)
docker volume rm volume_name

# Remove all unused volumes (⚠️ DANGER!)
docker volume prune
```
**What it does:** Removes Docker volumes not attached to any container.  
**When to use:** After removing old deployments, freeing space.  
**⚠️ DANGER:** Permanently deletes data! Make sure it's backed up!

---

### Clear Application Logs

```bash
# Clear all Docker container logs
sudo sh -c "truncate -s 0 /var/lib/docker/containers/*/*-json.log"

# Clear specific container logs
sudo truncate -s 0 $(docker inspect --format='{{.LogPath}}' applytide_api)

# Set log rotation (prevent future growth) - already configured
# Check docker-compose.prod.yml for logging settings
```
**What it does:** Clears Docker container logs to free disk space.  
**When to use:** Logs consuming too much space, disk full.  
**Note:** Your compose file already has 10MB rotation configured.

---

### Clean Old Docker Logs

```bash
# Find large log files
sudo find /var/lib/docker/containers/ -name "*-json.log" -exec ls -lh {} \; | sort -k5 -hr | head -10

# Remove logs older than 30 days
sudo find /var/lib/docker/containers/ -name "*-json.log" -mtime +30 -delete
```
**What it does:** Removes old container logs.  
**When to use:** Disk space recovery, maintenance.

---

### Clean Package Manager Cache

```bash
# Ubuntu/Debian
sudo apt clean
sudo apt autoclean
sudo apt autoremove

# Check space saved
du -sh /var/cache/apt
```
**What it does:** Removes downloaded package files and unused packages.  
**When to use:** Disk space low, after system updates.  
**Safe:** Yes, can re-download if needed.

---

### Optimize Database

```bash
# Vacuum and analyze (recommended weekly)
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "VACUUM ANALYZE VERBOSE;"

# Reindex database (monthly)
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "REINDEX DATABASE applytide_prod;"
```
**What it does:** Optimizes database performance and reclaims space.  
**When to use:** Weekly (vacuum), monthly (reindex), performance issues.  
**Time:** 1-5 minutes depending on database size.

---

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check what's wrong
docker compose -f docker-compose.prod.yml ps

# View logs for failed service
docker compose -f docker-compose.prod.yml logs backend

# Try starting with detailed output
docker compose -f docker-compose.prod.yml up backend

# Check for port conflicts
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Force recreate
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

---

### Can't Connect to Database

```bash
# Check if database is running
docker ps | grep applytide_pg

# Check database logs
docker logs applytide_pg

# Test connection
docker exec applytide_pg pg_isready

# Check if password is correct
cat /opt/applytide/.env.production | grep POSTGRES_PASSWORD

# Restart database
docker compose -f docker-compose.prod.yml restart pg
```

---

### Application is Slow

```bash
# Check resource usage
docker stats

# Check database performance
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c \
  "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check for slow queries
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c \
  "SELECT pid, now() - query_start as duration, query 
   FROM pg_stat_activity 
   WHERE state = 'active' AND now() - query_start > interval '5 seconds';"

# Optimize database
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "VACUUM ANALYZE;"
```

---

### Disk is Full

```bash
# Find what's using space
du -h --max-depth=1 / | sort -hr | head -20

# Check Docker usage
docker system df -v

# Clean Docker
docker system prune -a -f

# Clean old backups
sudo find /var/backups/applytide -type d -mtime +30 -exec rm -rf {} \;

# Clean logs
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

---

### Container Keeps Restarting

```bash
# Check restart count
docker ps -a | grep applytide_api

# View logs for error
docker logs --tail 100 applytide_api

# Check exit code
docker inspect applytide_api | grep -A 3 "State"

# Try running without restart policy
docker run -it --rm applytide-backend:latest bash
```

---

### Can't Access Website

```bash
# Check if Nginx is running
docker ps | grep nginx

# Check Nginx logs
docker logs applytide_nginx

# Test Nginx config
docker exec applytide_nginx nginx -t

# Check if ports are accessible
curl -I http://localhost
curl -I https://localhost

# Check firewall
sudo ufw status
sudo iptables -L
```

---

## 🔐 Security & Access

### View Environment Variables

```bash
# Production environment file
cat /opt/applytide/.env.production

# Or specific variable
grep DATABASE_URL /opt/applytide/.env.production

# View container environment (not recommended - passwords visible)
docker inspect applytide_api | grep -A 50 "Env"
```
**What it does:** Shows configuration and secrets.  
**When to use:** Debugging config issues, verifying settings.  
**⚠️ Warning:** Contains sensitive passwords!

---

### Change Database Password

```bash
# 1. Stop services
docker compose -f docker-compose.prod.yml down

# 2. Update .env.production
nano /opt/applytide/.env.production
# Change POSTGRES_PASSWORD=new_password_here

# 3. Remove old database volume (⚠️ BACKUP FIRST!)
docker volume rm applytide_pgdata

# 4. Restore from backup with new password
docker compose -f docker-compose.prod.yml up -d
# Then restore database as shown in backup section
```
**What it does:** Changes database password.  
**When to use:** Security breach, password leaked, regular rotation.  
**⚠️ Critical:** BACKUP DATABASE FIRST!

---

### Check File Permissions

```bash
# Application files
ls -la /opt/applytide/

# Docker volumes (requires sudo)
sudo ls -la /var/lib/docker/volumes/applytide_documents/_data

# Backups
sudo ls -la /var/backups/applytide/

# Fix if needed
sudo chown -R www-data:www-data /opt/applytide/
sudo chmod -R 755 /opt/applytide/
```

---

### View Who's Logged In

```bash
# Current users
who

# Login history
last

# Failed login attempts
lastb

# Active SSH sessions
ss -tn sport = :22
```

---

## 🚨 Emergency Procedures

### Complete System Restart

```bash
# 1. Stop application
cd /opt/applytide
docker compose -f docker-compose.prod.yml down

# 2. Reboot server
sudo reboot

# 3. After reboot, SSH back in and start services
cd /opt/applytide
docker compose -f docker-compose.prod.yml up -d

# 4. Verify everything is running
docker ps
```

---

### Emergency Backup (Quick)

```bash
# Fast backup everything important
sudo applytide-backup

# Or manual backup
mkdir -p ~/emergency_backup_$(date +%Y%m%d_%H%M%S)
cd ~/emergency_backup_$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec applytide_pg pg_dump -U applytide_user applytide_prod | gzip > database.sql.gz

# Backup environment
cp /opt/applytide/.env.production ./

# Note volume locations for later recovery
docker volume ls > volumes.txt
```

---

### Disaster Recovery (Total Loss)

```bash
# 1. Provision new server
# 2. Install Docker & Docker Compose
# 3. Clone repository
cd /opt
git clone https://github.com/tnaydnov/applytide.git
cd applytide

# 4. Restore environment file
# Copy .env.production from backup

# 5. Start services
docker compose -f docker-compose.prod.yml up -d

# 6. Restore from backup
sudo bash scripts/restore.sh latest

# 7. Verify
docker ps
curl -I https://applytide.com
```

---

### Kill All Docker Processes (Last Resort)

```bash
# ⚠️ NUCLEAR OPTION: Stop everything Docker-related

# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Restart Docker daemon
sudo systemctl restart docker

# Start fresh
cd /opt/applytide
docker compose -f docker-compose.prod.yml up -d
```

---

## 📝 Quick Reference Card

### Most Used Commands

```bash
# View logs
docker logs -f applytide_api

# Restart service
docker compose -f docker-compose.prod.yml restart backend

# Check running containers
docker ps

# Database query
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "SELECT COUNT(*) FROM users;"

# Manual backup
sudo applytide-backup

# Check disk space
df -h

# Docker stats
docker stats --no-stream

# Clean Docker
docker system prune -f
```

---

## 🎯 Maintenance Schedule

### Daily
- Check disk space: `df -h`
- Review application logs: `docker logs --tail 100 applytide_api`
- Verify backups ran: `tail /var/backups/applytide/backup.log`

### Weekly
- Check backup status: `sudo bash scripts/check-backup-status.sh`
- Vacuum database: `docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "VACUUM ANALYZE;"`
- Review resource usage: `docker stats --no-stream`

### Monthly
- Clean Docker: `docker system prune -a -f`
- Test backup restore (on staging)
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review security logs
- Check SSL certificate expiry

### Quarterly
- Full database maintenance
- Storage capacity review
- Security audit
- Performance optimization review

---

**End of Command Reference** - Save this file for quick access!

