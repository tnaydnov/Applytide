#!/bin/bash
#
# Applytide Backup Status Checker
#
# Displays comprehensive backup system status including:
#   - Recent backups
#   - Disk usage
#   - Schedule verification
#   - Log summaries
#
# Usage: sudo bash scripts/check-backup-status.sh
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

BACKUP_ROOT="/var/backups/applytide"
BACKUP_SCRIPT="/usr/local/bin/applytide-backup"

echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         APPLYTIDE BACKUP SYSTEM - STATUS CHECK            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# CHECK: Backup Directory
# ============================================================================

echo -e "${BOLD}📂 Backup Directory${NC}"
if [ -d "${BACKUP_ROOT}" ]; then
    TOTAL_SIZE=$(du -sh "${BACKUP_ROOT}" 2>/dev/null | cut -f1)
    BACKUP_COUNT=$(find "${BACKUP_ROOT}" -maxdepth 1 -type d -name "20*" 2>/dev/null | wc -l)
    echo -e "  ${GREEN}✓${NC} Directory exists: ${BACKUP_ROOT}"
    echo -e "  ${GREEN}✓${NC} Total size: ${TOTAL_SIZE}"
    echo -e "  ${GREEN}✓${NC} Number of backups: ${BACKUP_COUNT}"
else
    echo -e "  ${RED}✗${NC} Directory not found: ${BACKUP_ROOT}"
    echo -e "  ${YELLOW}!${NC} Run setup: sudo bash scripts/setup-backup-cron.sh"
fi
echo

# ============================================================================
# CHECK: Backup Script
# ============================================================================

echo -e "${BOLD}📜 Backup Script${NC}"
if [ -f "${BACKUP_SCRIPT}" ]; then
    echo -e "  ${GREEN}✓${NC} Script installed: ${BACKUP_SCRIPT}"
    if [ -x "${BACKUP_SCRIPT}" ]; then
        echo -e "  ${GREEN}✓${NC} Script is executable"
    else
        echo -e "  ${RED}✗${NC} Script not executable!"
        echo -e "  ${YELLOW}!${NC} Fix: sudo chmod +x ${BACKUP_SCRIPT}"
    fi
else
    echo -e "  ${RED}✗${NC} Script not installed"
    echo -e "  ${YELLOW}!${NC} Run setup: sudo bash scripts/setup-backup-cron.sh"
fi
echo

# ============================================================================
# CHECK: Cron Job
# ============================================================================

echo -e "${BOLD}⏰ Scheduled Backups${NC}"
if crontab -l 2>/dev/null | grep -q "applytide-backup"; then
    CRON_SCHEDULE=$(crontab -l 2>/dev/null | grep "applytide-backup" | awk '{print $1, $2, $3, $4, $5}')
    echo -e "  ${GREEN}✓${NC} Cron job configured"
    echo -e "  ${GREEN}✓${NC} Schedule: ${CRON_SCHEDULE}"
    
    # Decode schedule
    case "$CRON_SCHEDULE" in
        "0 2 * * *")
            echo -e "  ${BLUE}ℹ${NC} Runs daily at 2:00 AM"
            ;;
        *)
            echo -e "  ${BLUE}ℹ${NC} Custom schedule"
            ;;
    esac
    
    # Calculate next run
    NEXT_RUN=$(crontab -l 2>/dev/null | grep applytide-backup | head -1)
    if command -v next &> /dev/null; then
        echo -e "  ${BLUE}ℹ${NC} Next run: $(echo \"$NEXT_RUN\" | at -l 2>/dev/null || echo 'Unable to determine')"
    fi
else
    echo -e "  ${RED}✗${NC} Cron job not configured!"
    echo -e "  ${YELLOW}!${NC} Run setup: sudo bash scripts/setup-backup-cron.sh"
fi
echo

# ============================================================================
# CHECK: Recent Backups
# ============================================================================

echo -e "${BOLD}📅 Recent Backups${NC}"
if [ -d "${BACKUP_ROOT}" ]; then
    RECENT_BACKUPS=($(ls -1d ${BACKUP_ROOT}/20* 2>/dev/null | sort -r | head -n 5))
    
    if [ ${#RECENT_BACKUPS[@]} -gt 0 ]; then
        for backup_dir in "${RECENT_BACKUPS[@]}"; do
            BACKUP_DATE=$(basename "${backup_dir}")
            BACKUP_SIZE=$(du -sh "${backup_dir}" 2>/dev/null | cut -f1)
            FILE_COUNT=$(find "${backup_dir}" -type f 2>/dev/null | wc -l)
            AGE_DAYS=$(( ($(date +%s) - $(stat -c %Y "${backup_dir}" 2>/dev/null || stat -f %m "${backup_dir}" 2>/dev/null)) / 86400 ))
            
            if [ ${AGE_DAYS} -eq 0 ]; then
                AGE_STR="Today"
            elif [ ${AGE_DAYS} -eq 1 ]; then
                AGE_STR="Yesterday"
            else
                AGE_STR="${AGE_DAYS} days ago"
            fi
            
            echo -e "  ${GREEN}•${NC} ${BACKUP_DATE} - ${BACKUP_SIZE} (${FILE_COUNT} files) - ${AGE_STR}"
            
            # Check for complete backup
            HAS_DB=$(find "${backup_dir}" -name "postgres_*.sql.gz" 2>/dev/null | wc -l)
            HAS_DOCS=$(find "${backup_dir}" -name "documents_*.tar.gz" 2>/dev/null | wc -l)
            HAS_ATTACH=$(find "${backup_dir}" -name "attachments_*.tar.gz" 2>/dev/null | wc -l)
            
            if [ ${HAS_DB} -eq 0 ]; then
                echo -e "    ${YELLOW}⚠${NC} Missing database backup"
            fi
        done
    else
        echo -e "  ${YELLOW}!${NC} No backups found"
        echo -e "  ${BLUE}ℹ${NC} Run manual backup: sudo applytide-backup"
    fi
else
    echo -e "  ${RED}✗${NC} Backup directory not found"
fi
echo

# ============================================================================
# CHECK: Disk Space
# ============================================================================

echo -e "${BOLD}💾 Disk Space${NC}"
DISK_INFO=$(df -h /var/backups 2>/dev/null | tail -1)
if [ -n "${DISK_INFO}" ]; then
    DISK_SIZE=$(echo "${DISK_INFO}" | awk '{print $2}')
    DISK_USED=$(echo "${DISK_INFO}" | awk '{print $3}')
    DISK_AVAIL=$(echo "${DISK_INFO}" | awk '{print $4}')
    DISK_PERCENT=$(echo "${DISK_INFO}" | awk '{print $5}' | tr -d '%')
    
    echo -e "  ${GREEN}•${NC} Total: ${DISK_SIZE}"
    echo -e "  ${GREEN}•${NC} Used: ${DISK_USED}"
    echo -e "  ${GREEN}•${NC} Available: ${DISK_AVAIL}"
    
    if [ ${DISK_PERCENT} -gt 90 ]; then
        echo -e "  ${RED}⚠${NC} Disk usage: ${DISK_PERCENT}% (CRITICAL!)"
        echo -e "  ${YELLOW}!${NC} Consider reducing retention or adding storage"
    elif [ ${DISK_PERCENT} -gt 80 ]; then
        echo -e "  ${YELLOW}⚠${NC} Disk usage: ${DISK_PERCENT}% (Warning)"
        echo -e "  ${BLUE}ℹ${NC} Monitor disk space closely"
    else
        echo -e "  ${GREEN}✓${NC} Disk usage: ${DISK_PERCENT}% (OK)"
    fi
else
    echo -e "  ${RED}✗${NC} Unable to check disk space"
fi
echo

# ============================================================================
# CHECK: Docker Containers
# ============================================================================

echo -e "${BOLD}🐳 Docker Containers${NC}"
REQUIRED_CONTAINERS=("applytide_pg" "applytide_redis" "applytide_api")
ALL_RUNNING=true

for container in "${REQUIRED_CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "${container}" 2>/dev/null)
        echo -e "  ${GREEN}✓${NC} ${container}: ${STATUS}"
    else
        echo -e "  ${RED}✗${NC} ${container}: not running"
        ALL_RUNNING=false
    fi
done

if [ "${ALL_RUNNING}" = false ]; then
    echo -e "  ${YELLOW}!${NC} Some containers are not running - backups may be incomplete"
fi
echo

# ============================================================================
# CHECK: Docker Volumes
# ============================================================================

echo -e "${BOLD}📦 Docker Volumes${NC}"
REQUIRED_VOLUMES=("applytide_pgdata" "applytide_documents" "applytide_attachments" "applytide_redis_data")

for volume in "${REQUIRED_VOLUMES[@]}"; do
    if docker volume ls --format '{{.Name}}' 2>/dev/null | grep -q "^${volume}$"; then
        VOL_SIZE=$(docker system df -v 2>/dev/null | grep "${volume}" | awk '{print $3}' || echo "Unknown")
        echo -e "  ${GREEN}✓${NC} ${volume}"
    else
        echo -e "  ${YELLOW}⚠${NC} ${volume}: not found"
    fi
done
echo

# ============================================================================
# CHECK: Recent Logs
# ============================================================================

echo -e "${BOLD}📋 Recent Log Activity${NC}"
LOG_FILE="${BACKUP_ROOT}/backup.log"

if [ -f "${LOG_FILE}" ]; then
    LAST_BACKUP=$(grep "Backup completed successfully" "${LOG_FILE}" 2>/dev/null | tail -1)
    LAST_ERROR=$(grep "ERROR" "${LOG_FILE}" 2>/dev/null | tail -1)
    
    if [ -n "${LAST_BACKUP}" ]; then
        echo -e "  ${GREEN}✓${NC} Last successful backup:"
        echo -e "    $(echo ${LAST_BACKUP} | cut -c1-80)"
    else
        echo -e "  ${YELLOW}!${NC} No successful backup found in logs"
    fi
    
    if [ -n "${LAST_ERROR}" ]; then
        echo -e "  ${RED}⚠${NC} Last error:"
        echo -e "    $(echo ${LAST_ERROR} | cut -c1-80)"
        echo -e "  ${BLUE}ℹ${NC} View full logs: tail -f ${LOG_FILE}"
    fi
    
    LOG_SIZE=$(du -h "${LOG_FILE}" 2>/dev/null | cut -f1)
    LOG_LINES=$(wc -l < "${LOG_FILE}" 2>/dev/null)
    echo -e "  ${BLUE}ℹ${NC} Log file: ${LOG_SIZE} (${LOG_LINES} lines)"
else
    echo -e "  ${YELLOW}!${NC} Log file not found: ${LOG_FILE}"
fi
echo

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}📊 Summary${NC}"

if [ -d "${BACKUP_ROOT}" ] && [ -f "${BACKUP_SCRIPT}" ] && crontab -l 2>/dev/null | grep -q "applytide-backup"; then
    echo -e "  ${GREEN}✓ Backup system is properly configured${NC}"
    echo
    echo -e "${BOLD}Quick Commands:${NC}"
    echo -e "  • Manual backup:  ${CYAN}sudo applytide-backup${NC}"
    echo -e "  • View backups:   ${CYAN}ls -lh /var/backups/applytide/${NC}"
    echo -e "  • Restore:        ${CYAN}sudo bash scripts/restore.sh${NC}"
    echo -e "  • View logs:      ${CYAN}tail -f /var/backups/applytide/backup.log${NC}"
else
    echo -e "  ${YELLOW}⚠ Backup system needs setup${NC}"
    echo
    echo -e "${BOLD}Setup Command:${NC}"
    echo -e "  ${CYAN}sudo bash scripts/setup-backup-cron.sh${NC}"
fi

echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo

exit 0
