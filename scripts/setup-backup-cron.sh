#!/bin/bash
#
# Applytide Backup Setup Script
#
# This script:
#   1. Sets up the backup directory structure
#   2. Configures cron job for daily backups at 2 AM
#   3. Performs initial test backup
#   4. Validates the setup
#
# Usage: Run with sudo on your Ubuntu server
#   sudo bash scripts/setup-backup-cron.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"; }

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

log "Applytide Backup Setup"
log "======================"
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run with sudo: sudo bash scripts/setup-backup-cron.sh"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed!"
    exit 1
fi

# Check if running on the server (not on Windows desktop)
if [ ! -d "/opt/applytide" ]; then
    warn "This appears to be run from development environment"
    warn "Make sure to run this script ON THE SERVER at /opt/applytide"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ============================================================================
# DIRECTORY SETUP
# ============================================================================

log "Setting up backup directories..."

BACKUP_ROOT="/var/backups/applytide"
mkdir -p "${BACKUP_ROOT}/logs"
chmod 750 "${BACKUP_ROOT}"

info "  Created: ${BACKUP_ROOT}"
info "  Created: ${BACKUP_ROOT}/logs"

# ============================================================================
# COPY BACKUP SCRIPT
# ============================================================================

log "Installing backup script..."

SCRIPT_SOURCE="/opt/applytide/scripts/backup.sh"
SCRIPT_TARGET="/usr/local/bin/applytide-backup"

if [ ! -f "${SCRIPT_SOURCE}" ]; then
    error "Backup script not found at: ${SCRIPT_SOURCE}"
    error "Please ensure you're in the /opt/applytide directory"
    exit 1
fi

cp "${SCRIPT_SOURCE}" "${SCRIPT_TARGET}"
chmod +x "${SCRIPT_TARGET}"

info "  Installed: ${SCRIPT_TARGET}"

# ============================================================================
# SETUP CRON JOB
# ============================================================================

log "Configuring cron job for daily backups..."

CRON_SCHEDULE="0 2 * * *"  # Daily at 2:00 AM
CRON_COMMAND="${SCRIPT_TARGET} >> ${BACKUP_ROOT}/logs/cron.log 2>&1"
CRON_JOB="${CRON_SCHEDULE} root ${CRON_COMMAND}"
CRON_FILE="/etc/cron.d/applytide-backup"

# Create cron file in /etc/cron.d/
cat > "${CRON_FILE}" <<EOF
# Applytide Backup - Daily at 2:00 AM
${CRON_JOB}
EOF

chmod 644 "${CRON_FILE}"

info "  Schedule: Daily at 2:00 AM (server time)"
info "  Command: ${SCRIPT_TARGET}"
info "  Logs: ${BACKUP_ROOT}/logs/cron.log"
info "  Cron file: ${CRON_FILE}"

# Verify cron file was created
if [ -f "${CRON_FILE}" ]; then
    log "✓ Cron job configured successfully"
else
    error "✗ Failed to configure cron job"
    warn "You may need to add it manually:"
    warn "  sudo crontab -e"
    warn "  Add line: ${CRON_SCHEDULE} ${CRON_COMMAND}"
fi

# ============================================================================
# CREATE VOLUMES IF NEEDED
# ============================================================================

log "Ensuring Docker volumes exist..."

# Create volumes for file storage if they don't exist
docker volume create applytide_documents 2>/dev/null || true
docker volume create applytide_attachments 2>/dev/null || true

info "  Volume: applytide_documents"
info "  Volume: applytide_attachments"

# ============================================================================
# UPDATE DOCKER COMPOSE
# ============================================================================

log "Checking Docker Compose configuration..."

COMPOSE_FILE="/opt/applytide/docker-compose.prod.yml"

if [ -f "${COMPOSE_FILE}" ]; then
    # Check if volumes are defined
    if ! grep -q "applytide_documents" "${COMPOSE_FILE}"; then
        warn "Docker Compose may need volume configuration"
        warn "Please review: ${COMPOSE_FILE}"
        info "Add these volumes to backend service:"
        info "  volumes:"
        info "    - applytide_documents:/app/uploads/documents"
        info "    - applytide_attachments:/app/uploads/app_attachments"
    else
        log "✓ Docker Compose volumes configured"
    fi
else
    warn "Docker Compose file not found: ${COMPOSE_FILE}"
fi

# ============================================================================
# TEST BACKUP
# ============================================================================

log "Running test backup..."
echo

if ${SCRIPT_TARGET}; then
    echo
    log "✓ Test backup completed successfully!"
else
    error "✗ Test backup failed!"
    error "Please check the logs at: ${BACKUP_ROOT}/backup.log"
    exit 1
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo
log "=========================================="
log "Backup System Setup Complete!"
log "=========================================="
echo
info "Configuration:"
info "  • Backup location: ${BACKUP_ROOT}"
info "  • Retention period: 30 days"
info "  • Schedule: Daily at 2:00 AM"
info "  • Log file: ${BACKUP_ROOT}/backup.log"
info "  • Cron log: ${BACKUP_ROOT}/logs/cron.log"
echo
info "What's backed up:"
info "  • PostgreSQL database (compressed SQL)"
info "  • Uploaded documents"
info "  • Application attachments"
info "  • Redis data (RDB snapshot)"
info "  • Configuration files"
echo
info "Manual backup command:"
info "  sudo ${SCRIPT_TARGET}"
echo
info "View recent backups:"
info "  ls -lh ${BACKUP_ROOT}"
echo
info "Check backup logs:"
info "  tail -f ${BACKUP_ROOT}/backup.log"
echo
info "View cron schedule:"
info "  crontab -l | grep applytide"
echo
log "Next scheduled backup: Tomorrow at 2:00 AM"
log "=========================================="

exit 0
