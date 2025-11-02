#!/bin/bash
#
# Applytide Local Backup Script
# 
# Creates daily backups of:
#   - PostgreSQL database (pg_dump)
#   - Uploaded files (documents, attachments)
#   - Redis data (optional RDB snapshot)
#
# Retention: 30 days (automatic cleanup)
# Schedule: Run via cron daily at 2 AM
# Storage: /var/backups/applytide/
#
# Usage: ./backup.sh
# Setup: sudo bash -c "cat scripts/setup-backup-cron.sh | bash"
#

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

# Backup storage location (ensure sufficient disk space!)
BACKUP_ROOT="/var/backups/applytide"
RETENTION_DAYS=30

# Timestamp for this backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"

# Docker container names (adjust if different)
PG_CONTAINER="applytide_pg"
REDIS_CONTAINER="applytide_redis"
API_CONTAINER="applytide_api"

# Database credentials (read from .env.production)
ENV_FILE="/opt/applytide/.env.production"

# Logging
LOG_FILE="${BACKUP_ROOT}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}${msg}${NC}"
    echo "${msg}" >> "${LOG_FILE}"
}

error() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1"
    echo -e "${RED}${msg}${NC}" >&2
    echo "${msg}" >> "${LOG_FILE}"
}

warn() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1"
    echo -e "${YELLOW}${msg}${NC}"
    echo "${msg}" >> "${LOG_FILE}"
}

info() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1"
    echo -e "${BLUE}${msg}${NC}"
    echo "${msg}" >> "${LOG_FILE}"
}

# Check if Docker container is running
check_container() {
    local container=$1
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        error "Container ${container} is not running!"
        return 1
    fi
    return 0
}

# Get human-readable size
get_size() {
    local path=$1
    if [ -f "${path}" ]; then
        du -h "${path}" | cut -f1
    elif [ -d "${path}" ]; then
        du -sh "${path}" | cut -f1
    else
        echo "0B"
    fi
}

# ============================================================================
# INITIALIZATION
# ============================================================================

log "=========================================="
log "Starting Applytide Backup - ${TIMESTAMP}"
log "=========================================="

# Create backup directories
mkdir -p "${BACKUP_DIR}"
mkdir -p "${BACKUP_ROOT}/logs"

# Ensure log file exists
touch "${LOG_FILE}"

# Verify environment file exists
if [ ! -f "${ENV_FILE}" ]; then
    error "Environment file not found: ${ENV_FILE}"
    error "Please ensure the application is properly deployed"
    exit 1
fi

# Load database credentials
source "${ENV_FILE}"

if [ -z "${POSTGRES_PASSWORD}" ]; then
    error "POSTGRES_PASSWORD not found in ${ENV_FILE}"
    exit 1
fi

# ============================================================================
# BACKUP: POSTGRESQL DATABASE
# ============================================================================

log "Starting PostgreSQL backup..."

if check_container "${PG_CONTAINER}"; then
    DB_BACKUP_FILE="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz"
    
    # Create compressed SQL dump
    if docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" "${PG_CONTAINER}" \
        pg_dump -U applytide_user -d applytide_prod --clean --if-exists \
        | gzip > "${DB_BACKUP_FILE}"; then
        
        DB_SIZE=$(get_size "${DB_BACKUP_FILE}")
        log "✓ PostgreSQL backup completed: ${DB_BACKUP_FILE} (${DB_SIZE})"
    else
        error "✗ PostgreSQL backup failed!"
        rm -f "${DB_BACKUP_FILE}"
        exit 1
    fi
else
    error "Skipping PostgreSQL backup - container not running"
    exit 1
fi

# ============================================================================
# BACKUP: UPLOADED FILES
# ============================================================================

log "Starting file uploads backup..."

# Documents directory
DOCS_DIR="/var/lib/docker/volumes/applytide_documents/_data"
ATTACHMENTS_DIR="/var/lib/docker/volumes/applytide_attachments/_data"

# Backup documents if directory exists
if [ -d "${DOCS_DIR}" ]; then
    DOCS_BACKUP_FILE="${BACKUP_DIR}/documents_${TIMESTAMP}.tar.gz"
    
    if tar -czf "${DOCS_BACKUP_FILE}" -C "$(dirname ${DOCS_DIR})" "$(basename ${DOCS_DIR})" 2>/dev/null; then
        DOCS_SIZE=$(get_size "${DOCS_BACKUP_FILE}")
        DOCS_COUNT=$(find "${DOCS_DIR}" -type f 2>/dev/null | wc -l)
        log "✓ Documents backup completed: ${DOCS_COUNT} files (${DOCS_SIZE})"
    else
        warn "Documents directory is empty or inaccessible"
        rm -f "${DOCS_BACKUP_FILE}"
    fi
else
    warn "Documents directory not found: ${DOCS_DIR}"
fi

# Backup attachments if directory exists
if [ -d "${ATTACHMENTS_DIR}" ]; then
    ATTACH_BACKUP_FILE="${BACKUP_DIR}/attachments_${TIMESTAMP}.tar.gz"
    
    if tar -czf "${ATTACH_BACKUP_FILE}" -C "$(dirname ${ATTACHMENTS_DIR})" "$(basename ${ATTACHMENTS_DIR})" 2>/dev/null; then
        ATTACH_SIZE=$(get_size "${ATTACH_BACKUP_FILE}")
        ATTACH_COUNT=$(find "${ATTACHMENTS_DIR}" -type f 2>/dev/null | wc -l)
        log "✓ Attachments backup completed: ${ATTACH_COUNT} files (${ATTACH_SIZE})"
    else
        warn "Attachments directory is empty or inaccessible"
        rm -f "${ATTACH_BACKUP_FILE}"
    fi
else
    warn "Attachments directory not found: ${ATTACHMENTS_DIR}"
fi

# ============================================================================
# BACKUP: REDIS (OPTIONAL)
# ============================================================================

log "Starting Redis backup..."

if check_container "${REDIS_CONTAINER}"; then
    REDIS_BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
    
    # Trigger Redis BGSAVE and copy dump
    docker exec "${REDIS_CONTAINER}" redis-cli -a "${REDIS_PASSWORD}" BGSAVE > /dev/null 2>&1 || true
    sleep 2  # Give Redis a moment to complete
    
    if docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "${REDIS_BACKUP_FILE}" 2>/dev/null; then
        REDIS_SIZE=$(get_size "${REDIS_BACKUP_FILE}")
        log "✓ Redis backup completed: ${REDIS_BACKUP_FILE} (${REDIS_SIZE})"
    else
        warn "Redis backup skipped (no dump.rdb found)"
        rm -f "${REDIS_BACKUP_FILE}"
    fi
else
    warn "Skipping Redis backup - container not running"
fi

# ============================================================================
# BACKUP: CONFIGURATION FILES
# ============================================================================

log "Starting configuration backup..."

CONFIG_BACKUP_FILE="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"

cd /opt/applytide
if tar -czf "${CONFIG_BACKUP_FILE}" \
    .env.production \
    docker-compose.prod.yml \
    nginx/ \
    2>/dev/null; then
    CONFIG_SIZE=$(get_size "${CONFIG_BACKUP_FILE}")
    log "✓ Configuration backup completed (${CONFIG_SIZE})"
else
    warn "Configuration backup incomplete"
fi

# ============================================================================
# CLEANUP: REMOVE OLD BACKUPS
# ============================================================================

log "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."

# Find and delete backup directories older than retention period
DELETED_COUNT=0
while IFS= read -r old_dir; do
    if [ -d "${old_dir}" ]; then
        DELETED_SIZE=$(get_size "${old_dir}")
        rm -rf "${old_dir}"
        DELETED_COUNT=$((DELETED_COUNT + 1))
        info "  Deleted old backup: $(basename ${old_dir}) (${DELETED_SIZE})"
    fi
done < <(find "${BACKUP_ROOT}" -maxdepth 1 -type d -name "20*" -mtime +${RETENTION_DAYS})

if [ ${DELETED_COUNT} -gt 0 ]; then
    log "✓ Cleaned up ${DELETED_COUNT} old backup(s)"
else
    log "✓ No old backups to clean up"
fi

# Rotate log file if it gets too large (keep last 1000 lines)
if [ -f "${LOG_FILE}" ]; then
    LOG_LINES=$(wc -l < "${LOG_FILE}")
    if [ ${LOG_LINES} -gt 1000 ]; then
        tail -n 1000 "${LOG_FILE}" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "${LOG_FILE}"
        info "Log file rotated (was ${LOG_LINES} lines)"
    fi
fi

# ============================================================================
# SUMMARY
# ============================================================================

BACKUP_SIZE=$(get_size "${BACKUP_DIR}")
TOTAL_SIZE=$(get_size "${BACKUP_ROOT}")
BACKUP_COUNT=$(find "${BACKUP_ROOT}" -maxdepth 1 -type d -name "20*" | wc -l)

log "=========================================="
log "Backup Summary:"
log "  Today's backup: ${BACKUP_SIZE}"
log "  Total backups: ${BACKUP_COUNT} (${TOTAL_SIZE})"
log "  Location: ${BACKUP_DIR}"
log "=========================================="
log "✓ Backup completed successfully!"
log ""

exit 0
