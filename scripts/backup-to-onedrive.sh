#!/bin/bash
# Applytide Backup Script - Direct to OneDrive
# Creates backups and uploads them directly to OneDrive using rclone
# NO server storage used long-term (temp files cleaned up)
# Usage: Run this ON THE SERVER

set -e

# Configuration
BACKUP_TYPE=${1:-daily}
TEMP_DIR="/tmp/applytide_backup_$$"
ONEDRIVE_REMOTE="onedrive:Applytide_Data/Backups"  # rclone remote name
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)

# Backup retention (in days)
DAILY_RETENTION=7
WEEKLY_RETENTION=30
MONTHLY_RETENTION=365

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        log "Cleaned up temporary files"
    fi
}

trap cleanup EXIT

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    error "rclone is not installed!"
    error "Install with: curl https://rclone.org/install.sh | sudo bash"
    exit 1
fi

# Check if rclone remote is configured
if ! rclone listremotes | grep -q "^onedrive:"; then
    error "OneDrive remote not configured!"
    error "Run: rclone config"
    error "Follow the guide in ONEDRIVE_BACKUP_SETUP.md"
    exit 1
fi

# Check if running in production
if [ ! -f "docker-compose.prod.yml" ]; then
    error "docker-compose.prod.yml not found!"
    exit 1
fi

log "Starting $BACKUP_TYPE backup to OneDrive..."

# Create temp directory
mkdir -p "$TEMP_DIR"/{db,uploads,redis,logs,config}

# ==========================================
# 1. Database Backup
# ==========================================
log "Backing up PostgreSQL database..."

DB_BACKUP_FILE="applytide_db_${DATE}_${TIMESTAMP}.sql.gz"

if docker-compose -f docker-compose.prod.yml exec -T pg pg_dump \
    -U applytide_user \
    -d applytide_prod \
    --clean \
    --if-exists | gzip > "$TEMP_DIR/db/$DB_BACKUP_FILE"; then
    
    DB_SIZE=$(du -h "$TEMP_DIR/db/$DB_BACKUP_FILE" | cut -f1)
    log "✓ Database backed up: $DB_BACKUP_FILE ($DB_SIZE)"
else
    error "Database backup failed!"
    exit 1
fi

# ==========================================
# 2. User Uploads Backup
# ==========================================
log "Backing up user uploads..."

UPLOADS_BACKUP_FILE="applytide_uploads_${DATE}_${TIMESTAMP}.tar.gz"

if [ -d "backend/app/uploads" ]; then
    if tar -czf "$TEMP_DIR/uploads/$UPLOADS_BACKUP_FILE" -C backend/app uploads/; then
        UPLOADS_SIZE=$(du -h "$TEMP_DIR/uploads/$UPLOADS_BACKUP_FILE" | cut -f1)
        log "✓ Uploads backed up: $UPLOADS_BACKUP_FILE ($UPLOADS_SIZE)"
    else
        warn "Uploads backup failed (but continuing...)"
    fi
else
    warn "No uploads directory found - skipping"
fi

# ==========================================
# 3. Redis Backup
# ==========================================
log "Backing up Redis data..."

REDIS_BACKUP_FILE="applytide_redis_${DATE}_${TIMESTAMP}.rdb.gz"

# Trigger Redis save and wait
docker-compose -f docker-compose.prod.yml exec -T redis redis-cli BGSAVE 2>/dev/null || true
sleep 3

# Copy and compress Redis dump
if docker cp applytide_redis:/data/dump.rdb "$TEMP_DIR/redis/dump.rdb" 2>/dev/null; then
    gzip "$TEMP_DIR/redis/dump.rdb"
    mv "$TEMP_DIR/redis/dump.rdb.gz" "$TEMP_DIR/redis/$REDIS_BACKUP_FILE"
    REDIS_SIZE=$(du -h "$TEMP_DIR/redis/$REDIS_BACKUP_FILE" | cut -f1)
    log "✓ Redis backed up: $REDIS_BACKUP_FILE ($REDIS_SIZE)"
else
    warn "Redis backup failed (but continuing...)"
fi

# ==========================================
# 4. Application Logs
# ==========================================
log "Backing up application logs..."

LOGS_BACKUP_FILE="applytide_logs_${DATE}_${TIMESTAMP}.tar.gz"

# Collect logs
docker logs applytide_nginx > "$TEMP_DIR/logs/nginx.log" 2>&1 || true
docker logs applytide_api > "$TEMP_DIR/logs/backend.log" 2>&1 || true
docker logs applytide_worker > "$TEMP_DIR/logs/worker.log" 2>&1 || true
docker logs applytide_pg > "$TEMP_DIR/logs/postgres.log" 2>&1 || true

if tar -czf "$TEMP_DIR/logs/$LOGS_BACKUP_FILE" -C "$TEMP_DIR/logs" \
    nginx.log backend.log worker.log postgres.log 2>/dev/null; then
    LOGS_SIZE=$(du -h "$TEMP_DIR/logs/$LOGS_BACKUP_FILE" | cut -f1)
    log "✓ Logs backed up: $LOGS_BACKUP_FILE ($LOGS_SIZE)"
else
    warn "Logs backup failed (but continuing...)"
fi

# ==========================================
# 5. Configuration Files
# ==========================================
log "Backing up configuration files..."

CONFIG_BACKUP_FILE="applytide_config_${DATE}_${TIMESTAMP}.tar.gz"

# Copy config files to temp
cp docker-compose.prod.yml "$TEMP_DIR/config/" 2>/dev/null || true
cp nginx/conf.d/default.conf "$TEMP_DIR/config/nginx_default.conf" 2>/dev/null || true
cp nginx/main.conf "$TEMP_DIR/config/nginx_main.conf" 2>/dev/null || true
cp backend/alembic.ini "$TEMP_DIR/config/" 2>/dev/null || true

# Save env variable names only (not values)
grep -o '^[^#]*=' .env.production 2>/dev/null | sed 's/=$//' > "$TEMP_DIR/config/env_variables.txt" || true

if tar -czf "$TEMP_DIR/config/$CONFIG_BACKUP_FILE" -C "$TEMP_DIR/config" . 2>/dev/null; then
    CONFIG_SIZE=$(du -h "$TEMP_DIR/config/$CONFIG_BACKUP_FILE" | cut -f1)
    log "✓ Config backed up: $CONFIG_BACKUP_FILE ($CONFIG_SIZE)"
else
    warn "Config backup failed (but continuing...)"
fi

# ==========================================
# 6. Upload to OneDrive
# ==========================================
log "Uploading backups to OneDrive..."

TOTAL_SIZE=$(du -sh "$TEMP_DIR" | cut -f1)
log "Total backup size: $TOTAL_SIZE"

# Upload each component
for component in db uploads redis logs config; do
    if [ "$(ls -A $TEMP_DIR/$component 2>/dev/null)" ]; then
        log "Uploading $component to OneDrive..."
        
        if rclone copy "$TEMP_DIR/$component" "$ONEDRIVE_REMOTE/$BACKUP_TYPE/$component" \
            --progress \
            --transfers 4 \
            --checkers 8 \
            --contimeout 60s \
            --timeout 300s \
            --retries 3 \
            --low-level-retries 10; then
            log "✓ $component uploaded successfully"
        else
            error "Failed to upload $component!"
            exit 1
        fi
    fi
done

log "✓ All backups uploaded to OneDrive"

# ==========================================
# 7. Cleanup Old Backups on OneDrive
# ==========================================
log "Cleaning up old backups on OneDrive..."

case $BACKUP_TYPE in
    daily)
        RETENTION=$DAILY_RETENTION
        ;;
    weekly)
        RETENTION=$WEEKLY_RETENTION
        ;;
    manual)
        RETENTION=$MONTHLY_RETENTION
        ;;
    *)
        RETENTION=7
        ;;
esac

# Delete old backups on OneDrive (files older than retention days)
CUTOFF_DATE=$(date -d "$RETENTION days ago" +%Y%m%d 2>/dev/null || date -v-${RETENTION}d +%Y%m%d)

for component in db uploads redis logs config; do
    log "Cleaning old $component backups..."
    
    # List files and delete old ones
    rclone lsf "$ONEDRIVE_REMOTE/$BACKUP_TYPE/$component" 2>/dev/null | while read -r file; do
        # Extract date from filename (format: applytide_component_YYYYMMDD_HHMMSS.ext)
        FILE_DATE=$(echo "$file" | grep -oP '\d{8}' | head -1)
        
        if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
            log "Deleting old backup: $file"
            rclone delete "$ONEDRIVE_REMOTE/$BACKUP_TYPE/$component/$file" 2>/dev/null || true
        fi
    done
done

log "✓ Cleaned up backups older than $RETENTION days"

# ==========================================
# 8. Summary
# ==========================================
echo ""
log "=========================================="
log "Backup completed successfully!"
log "=========================================="
log "Type: $BACKUP_TYPE"
log "Destination: OneDrive (Applytide_Data/Backups)"
log "Total Size: $TOTAL_SIZE"
log ""
log "Components backed up:"
log "  • Database: $DB_BACKUP_FILE ($DB_SIZE)"
[ -n "$UPLOADS_SIZE" ] && log "  • Uploads: $UPLOADS_BACKUP_FILE ($UPLOADS_SIZE)"
[ -n "$REDIS_SIZE" ] && log "  • Redis: $REDIS_BACKUP_FILE ($REDIS_SIZE)"
[ -n "$LOGS_SIZE" ] && log "  • Logs: $LOGS_BACKUP_FILE ($LOGS_SIZE)"
[ -n "$CONFIG_SIZE" ] && log "  • Config: $CONFIG_BACKUP_FILE ($CONFIG_SIZE)"
log "=========================================="
log "✓ Server disk space freed!"
log "✓ Backups will sync to your PC automatically"
echo ""

exit 0
