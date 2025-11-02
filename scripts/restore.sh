#!/bin/bash
#
# Applytide Backup Restore Script
#
# Restores backups created by backup.sh
#
# Usage:
#   ./restore.sh                    # Interactive mode (select backup)
#   ./restore.sh 2025-11-02         # Restore specific date
#   ./restore.sh latest             # Restore most recent backup
#
# Components restored:
#   - PostgreSQL database
#   - Uploaded documents
#   - Application attachments
#   - Redis data
#   - Configuration files
#
# ⚠️  WARNING: This will OVERWRITE existing data!
#

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

BACKUP_ROOT="/var/backups/applytide"
PG_CONTAINER="applytide_pg"
REDIS_CONTAINER="applytide_redis"
API_CONTAINER="applytide_api"

# Environment file
ENV_FILE="/opt/applytide/.env.production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"; }

check_container() {
    local container=$1
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        error "Container ${container} is not running!"
        return 1
    fi
    return 0
}

# ============================================================================
# MAIN
# ============================================================================

echo -e "${CYAN}"
echo "╔════════════════════════════════════════╗"
echo "║   Applytide Backup Restore Tool        ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root/sudo
if [ "$EUID" -ne 0 ]; then 
    error "Please run with sudo: sudo bash scripts/restore.sh"
    exit 1
fi

# Load environment
if [ ! -f "${ENV_FILE}" ]; then
    error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

source "${ENV_FILE}"

# ============================================================================
# SELECT BACKUP TO RESTORE
# ============================================================================

if [ -z "$1" ]; then
    # Interactive mode
    log "Available backups:"
    echo
    
    # List available backups
    BACKUPS=($(ls -1d ${BACKUP_ROOT}/20* 2>/dev/null | sort -r))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        error "No backups found in ${BACKUP_ROOT}"
        exit 1
    fi
    
    for i in "${!BACKUPS[@]}"; do
        BACKUP_DIR="${BACKUPS[$i]}"
        BACKUP_DATE=$(basename "${BACKUP_DIR}")
        BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
        FILE_COUNT=$(find "${BACKUP_DIR}" -type f | wc -l)
        
        echo -e "  ${CYAN}[$((i+1))]${NC} ${BACKUP_DATE} - ${BACKUP_SIZE} (${FILE_COUNT} files)"
    done
    
    echo
    read -p "Select backup to restore (1-${#BACKUPS[@]}): " SELECTION
    
    if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt ${#BACKUPS[@]} ]; then
        error "Invalid selection"
        exit 1
    fi
    
    BACKUP_DIR="${BACKUPS[$((SELECTION-1))]}"
    
elif [ "$1" == "latest" ]; then
    # Get most recent backup
    BACKUP_DIR=$(ls -1d ${BACKUP_ROOT}/20* 2>/dev/null | sort -r | head -n1)
    
    if [ -z "${BACKUP_DIR}" ]; then
        error "No backups found"
        exit 1
    fi
    
else
    # Specific date provided
    BACKUP_DIR="${BACKUP_ROOT}/$1"
    
    if [ ! -d "${BACKUP_DIR}" ]; then
        error "Backup not found: ${BACKUP_DIR}"
        exit 1
    fi
fi

BACKUP_DATE=$(basename "${BACKUP_DIR}")
log "Selected backup: ${BACKUP_DATE}"

# ============================================================================
# CONFIRMATION
# ============================================================================

echo
warn "⚠️  WARNING: This will OVERWRITE your current data!"
warn "   Database, files, and configuration will be replaced"
echo
read -p "Are you sure you want to restore from ${BACKUP_DATE}? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    log "Restore cancelled"
    exit 0
fi

echo
log "Starting restore from: ${BACKUP_DIR}"
log "=========================================="
echo

# ============================================================================
# RESTORE: POSTGRESQL DATABASE
# ============================================================================

DB_BACKUP=$(find "${BACKUP_DIR}" -name "postgres_*.sql.gz" | sort -r | head -n1)

if [ -n "${DB_BACKUP}" ]; then
    log "Restoring PostgreSQL database..."
    
    if check_container "${PG_CONTAINER}"; then
        # Drop existing connections
        info "  Terminating existing database connections..."
        docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" "${PG_CONTAINER}" \
            psql -U applytide_user -d postgres -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'applytide_prod' AND pid <> pg_backend_pid();" \
            2>/dev/null || true
        
        # Restore database
        info "  Importing database dump..."
        if gunzip -c "${DB_BACKUP}" | docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD}" "${PG_CONTAINER}" \
            psql -U applytide_user -d applytide_prod; then
            log "  ✓ Database restored successfully"
        else
            error "  ✗ Database restore failed!"
            exit 1
        fi
    else
        error "PostgreSQL container not running!"
        exit 1
    fi
else
    warn "No database backup found, skipping..."
fi

echo

# ============================================================================
# RESTORE: DOCUMENTS
# ============================================================================

DOCS_BACKUP=$(find "${BACKUP_DIR}" -name "documents_*.tar.gz" | sort -r | head -n1)

if [ -n "${DOCS_BACKUP}" ]; then
    log "Restoring documents..."
    
    DOCS_DIR="/var/lib/docker/volumes/applytide_documents/_data"
    
    if [ -d "${DOCS_DIR}" ]; then
        # Backup current documents (just in case)
        TEMP_BACKUP="/tmp/documents_backup_$(date +%s)"
        mkdir -p "${TEMP_BACKUP}"
        cp -r "${DOCS_DIR}"/* "${TEMP_BACKUP}/" 2>/dev/null || true
        info "  Current documents backed up to: ${TEMP_BACKUP}"
        
        # Clear and restore
        rm -rf "${DOCS_DIR}"/*
        if tar -xzf "${DOCS_BACKUP}" -C "$(dirname ${DOCS_DIR})" --strip-components=0; then
            DOC_COUNT=$(find "${DOCS_DIR}" -type f 2>/dev/null | wc -l)
            log "  ✓ Documents restored: ${DOC_COUNT} files"
        else
            error "  ✗ Documents restore failed!"
            warn "  Restoring from temporary backup..."
            cp -r "${TEMP_BACKUP}"/* "${DOCS_DIR}/"
        fi
        
        rm -rf "${TEMP_BACKUP}"
    else
        warn "Documents directory not found: ${DOCS_DIR}"
    fi
else
    warn "No documents backup found, skipping..."
fi

echo

# ============================================================================
# RESTORE: ATTACHMENTS
# ============================================================================

ATTACH_BACKUP=$(find "${BACKUP_DIR}" -name "attachments_*.tar.gz" | sort -r | head -n1)

if [ -n "${ATTACH_BACKUP}" ]; then
    log "Restoring attachments..."
    
    ATTACH_DIR="/var/lib/docker/volumes/applytide_attachments/_data"
    
    if [ -d "${ATTACH_DIR}" ]; then
        # Clear and restore
        rm -rf "${ATTACH_DIR}"/*
        if tar -xzf "${ATTACH_BACKUP}" -C "$(dirname ${ATTACH_DIR})" --strip-components=0; then
            ATTACH_COUNT=$(find "${ATTACH_DIR}" -type f 2>/dev/null | wc -l)
            log "  ✓ Attachments restored: ${ATTACH_COUNT} files"
        else
            error "  ✗ Attachments restore failed!"
        fi
    else
        warn "Attachments directory not found: ${ATTACH_DIR}"
    fi
else
    warn "No attachments backup found, skipping..."
fi

echo

# ============================================================================
# RESTORE: REDIS
# ============================================================================

REDIS_BACKUP=$(find "${BACKUP_DIR}" -name "redis_*.rdb" | sort -r | head -n1)

if [ -n "${REDIS_BACKUP}" ] && check_container "${REDIS_CONTAINER}"; then
    log "Restoring Redis data..."
    
    # Stop Redis, replace dump, restart
    docker stop "${REDIS_CONTAINER}"
    docker cp "${REDIS_BACKUP}" "${REDIS_CONTAINER}:/data/dump.rdb"
    docker start "${REDIS_CONTAINER}"
    
    log "  ✓ Redis data restored"
else
    warn "No Redis backup found or container not available, skipping..."
fi

echo

# ============================================================================
# RESTORE: CONFIGURATION (OPTIONAL)
# ============================================================================

CONFIG_BACKUP=$(find "${BACKUP_DIR}" -name "config_*.tar.gz" | sort -r | head -n1)

if [ -n "${CONFIG_BACKUP}" ]; then
    log "Configuration backup available"
    read -p "Restore configuration files? (y/N): " RESTORE_CONFIG
    
    if [[ "${RESTORE_CONFIG}" =~ ^[Yy]$ ]]; then
        info "  Extracting configuration..."
        tar -xzf "${CONFIG_BACKUP}" -C /opt/applytide/
        log "  ✓ Configuration restored"
    else
        info "  Skipped configuration restore"
    fi
fi

echo

# ============================================================================
# POST-RESTORE
# ============================================================================

log "Running post-restore checks..."

# Restart application containers
info "  Restarting application..."
docker-compose -f /opt/applytide/docker-compose.prod.yml restart api worker

# Wait for services to be ready
sleep 3

# Verify containers are running
if check_container "${API_CONTAINER}"; then
    log "  ✓ API container running"
else
    error "  ✗ API container not running!"
fi

echo
log "=========================================="
log "✓ Restore completed successfully!"
log "=========================================="
echo
info "Restored from backup: ${BACKUP_DATE}"
info "Please verify your application is working correctly:"
info "  • Check website: https://applytide.com"
info "  • Review logs: docker logs applytide_api"
info "  • Test database: docker exec applytide_pg psql -U applytide_user -d applytide_prod -c 'SELECT COUNT(*) FROM users;'"
echo

exit 0
