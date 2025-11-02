# 📍 Applytide File Storage Locations - Complete Map

## 🗺️ Overview

This document shows **exactly where** every type of file is stored in your Applytide application, both inside Docker containers and on the host server.

---

## 📦 INSIDE DOCKER CONTAINERS

These are the paths as seen from inside the running containers:

### 1. **User Uploaded Documents**
```
Inside Container: /app/uploads/documents/
```
- **What:** User-uploaded resumes, cover letters, PDFs
- **Format:** `{UUID}.{ext}` (e.g., `abc-123-def.pdf`)
- **Metadata:** `{UUID}.{ext}.meta.json` (sidecar files)
- **Mounted From:** Docker volume `documents`

### 2. **Application Attachments**
```
Inside Container: /app/uploads/app_attachments/
```
- **What:** Job application attachments, supporting files
- **Format:** Various file types
- **Mounted From:** Docker volume `attachments`

### 3. **Application Logs**
```
Inside Container: /app/logs/
```
- **Main Log:** `/app/logs/applytide.log`
- **Security Log:** `/app/logs/security.log`
- **Rotation:** 100MB max, 30 backups
- **NOTE:** These are stored in the container (not persistent!)

### 4. **PostgreSQL Database**
```
Inside Container: /var/lib/postgresql/data/
```
- **What:** All database files, tables, indexes
- **Mounted From:** Docker volume `pgdata`

### 5. **Redis Data**
```
Inside Container: /data/
```
- **What:** Cache, sessions, RDB snapshots
- **File:** `/data/dump.rdb` (persistence file)
- **Mounted From:** Docker volume `redis_data`

---

## 🖥️ ON HOST SERVER (Ubuntu)

These are the actual physical locations on your server's disk:

### 1. **Docker Volumes** (Primary Storage)
```
Base Path: /var/lib/docker/volumes/
```

| Volume Name | Host Path | Contains |
|-------------|-----------|----------|
| `applytide_pgdata` | `/var/lib/docker/volumes/applytide_pgdata/_data/` | PostgreSQL database |
| `applytide_documents` | `/var/lib/docker/volumes/applytide_documents/_data/` | User documents |
| `applytide_attachments` | `/var/lib/docker/volumes/applytide_attachments/_data/` | Application files |
| `applytide_redis_data` | `/var/lib/docker/volumes/applytide_redis_data/_data/` | Redis cache/sessions |

**Access Example:**
```bash
# List documents on host
ls -lh /var/lib/docker/volumes/applytide_documents/_data/

# Check size
du -sh /var/lib/docker/volumes/applytide_documents/_data/
```

### 2. **Backups** ⭐
```
/var/backups/applytide/
```

**Structure:**
```
/var/backups/applytide/
├── 2025-11-01/                           # Daily backup folders
│   ├── postgres_20251101_020000.sql.gz   # Database backup
│   ├── documents_20251101_020000.tar.gz  # Documents backup
│   ├── attachments_20251101_020000.tar.gz # Attachments backup
│   ├── redis_20251101_020000.rdb         # Redis backup
│   └── config_20251101_020000.tar.gz     # Config backup
├── 2025-11-02/
├── 2025-11-03/
├── backup.log                             # Backup logs
└── logs/
    └── cron.log                          # Cron job logs
```

**Retention:** 30 days (automatic cleanup)

### 3. **Application Code**
```
/opt/applytide/
```

**Structure:**
```
/opt/applytide/
├── backend/
│   └── app/
│       ├── uploads/          # OLD location (not used in production)
│       └── logs/             # OLD location (not used in production)
├── frontend/
├── nginx/
├── docker-compose.prod.yml
├── .env.production
└── scripts/
```

**NOTE:** In production, `backend/app/uploads/` and `backend/app/logs/` are NOT used. Docker volumes are used instead.

### 4. **Nginx Logs**
```
/var/log/nginx/
```
- **Access Log:** `/var/log/nginx/access.log`
- **Error Log:** `/var/log/nginx/error.log`

### 5. **Docker Logs**
```
/var/lib/docker/containers/
```

**View with Docker:**
```bash
docker logs applytide_api
docker logs applytide_pg
docker logs applytide_redis
```

---

## 🔄 PATH MAPPING TABLE

| Description | Container Path | Host Path | Volume Name |
|-------------|---------------|-----------|-------------|
| User Documents | `/app/uploads/documents/` | `/var/lib/docker/volumes/applytide_documents/_data/` | `documents` |
| Attachments | `/app/uploads/app_attachments/` | `/var/lib/docker/volumes/applytide_attachments/_data/` | `attachments` |
| PostgreSQL | `/var/lib/postgresql/data/` | `/var/lib/docker/volumes/applytide_pgdata/_data/` | `pgdata` |
| Redis Data | `/data/` | `/var/lib/docker/volumes/applytide_redis_data/_data/` | `redis_data` |
| App Logs | `/app/logs/` | (In container only) | - |
| Backups | N/A | `/var/backups/applytide/` | - |
| Code | `/app/` | `/opt/applytide/` | (bind mount) |

---

## 💾 DISK USAGE COMMANDS

### Check Docker Volume Sizes
```bash
# All volumes
docker system df -v

# Specific volumes
sudo du -sh /var/lib/docker/volumes/applytide_*/_data
```

### Check Backup Sizes
```bash
# Total backup storage
du -sh /var/backups/applytide/

# Individual backups
du -sh /var/backups/applytide/*/

# Disk space available
df -h /var/backups
```

### Check Database Size
```bash
# From host
docker exec applytide_pg psql -U applytide_user -d applytide_prod -c "SELECT pg_size_pretty(pg_database_size('applytide_prod'));"

# Inside container
docker exec -it applytide_pg bash
du -sh /var/lib/postgresql/data/
```

### Check Document Sizes
```bash
# From host
sudo find /var/lib/docker/volumes/applytide_documents/_data -type f | wc -l  # Count files
sudo du -sh /var/lib/docker/volumes/applytide_documents/_data              # Total size

# List largest files
sudo find /var/lib/docker/volumes/applytide_documents/_data -type f -exec ls -lh {} \; | sort -k5 -h -r | head -10
```

---

## 🔐 FILE PERMISSIONS

### Docker Volumes
```bash
Owner: root (managed by Docker)
Permissions: Varies by container user
Access: Requires sudo
```

### Backups
```bash
Owner: root
Permissions: 750 (rwxr-x---)
Access: Requires sudo
```

### Application Code
```bash
Owner: Your user or root
Permissions: 755 for directories, 644 for files
Access: Depends on deployment method
```

---

## 🗂️ WHAT GETS BACKED UP

| Data Type | Source (Container) | Source (Host) | Backup Location |
|-----------|-------------------|---------------|-----------------|
| Database | `/var/lib/postgresql/data/` | `applytide_pgdata` volume | `/var/backups/applytide/*/postgres_*.sql.gz` |
| Documents | `/app/uploads/documents/` | `applytide_documents` volume | `/var/backups/applytide/*/documents_*.tar.gz` |
| Attachments | `/app/uploads/app_attachments/` | `applytide_attachments` volume | `/var/backups/applytide/*/attachments_*.tar.gz` |
| Redis | `/data/dump.rdb` | `applytide_redis_data` volume | `/var/backups/applytide/*/redis_*.rdb` |
| Config | `/opt/applytide/.env.production` | Host filesystem | `/var/backups/applytide/*/config_*.tar.gz` |

---

## 🚨 IMPORTANT NOTES

### 1. **Application Logs Are NOT Persistent!**
The `/app/logs/` directory inside containers is **not mounted** to a volume. This means:
- ❌ Logs are lost when containers are recreated
- ❌ Not included in backups
- ✅ Use `docker logs` to view container logs
- ✅ Configure external logging if log persistence is needed

**To make logs persistent, add to docker-compose.prod.yml:**
```yaml
backend:
  volumes:
    - app_logs:/app/logs  # Add this line

volumes:
  app_logs:  # Add this volume
```

### 2. **Database Logs**
Application also logs to PostgreSQL database (table: `application_logs`). These logs ARE backed up as part of database backups.

### 3. **Direct File Access**
To access files in Docker volumes:
```bash
# MUST use sudo
sudo ls /var/lib/docker/volumes/applytide_documents/_data/

# Copy file out
sudo cp /var/lib/docker/volumes/applytide_documents/_data/abc-123.pdf ~/backup.pdf

# Copy file in
sudo cp ~/file.pdf /var/lib/docker/volumes/applytide_documents/_data/
```

### 4. **Development vs Production**
| Environment | Documents Path | Attachments Path |
|-------------|---------------|------------------|
| **Production** | Docker volume → `/var/lib/docker/volumes/` | Docker volume |
| **Development** | Bind mount → `./backend/app/uploads/` | Bind mount |

---

## 📊 STORAGE REQUIREMENTS

### Estimated Storage Needs

| Component | Per User | 1000 Users | 10000 Users |
|-----------|----------|------------|-------------|
| Documents | ~5-10 MB | ~5-10 GB | ~50-100 GB |
| Attachments | ~2-5 MB | ~2-5 GB | ~20-50 GB |
| Database | ~100 KB | ~100 MB | ~1 GB |
| Redis | ~10 KB | ~10 MB | ~100 MB |
| **Total** | **~7-15 MB** | **~7-15 GB** | **~70-150 GB** |

### Backup Storage (30 days)
```
Backup Size = (Total Data Size × 0.5) × 30 days

Example:
- Current data: 10 GB
- Compressed: ~5 GB per backup
- 30 days: ~150 GB backup storage needed
```

---

## 🔍 QUICK REFERENCE

### Find a Specific File
```bash
# Search documents by UUID
sudo find /var/lib/docker/volumes/applytide_documents/_data -name "*abc-123*"

# Search in backups
sudo find /var/backups/applytide -name "*.sql.gz"

# Search container logs
docker logs applytide_api 2>&1 | grep "document"
```

### Monitor Disk Usage
```bash
# Watch disk space
watch -n 60 df -h

# Monitor volume growth
du -sh /var/lib/docker/volumes/applytide_*/_data | sort -h
```

### Cleanup (If Needed)
```bash
# Remove old Docker logs
docker system prune -a --volumes  # CAREFUL: Removes unused volumes!

# Remove old backups manually
sudo rm -rf /var/backups/applytide/2025-10-*

# Remove specific volume (DANGER!)
docker volume rm applytide_attachments  # Only if empty!
```

---

## 📝 SUMMARY

### Primary Storage Locations
1. **User Files:** `/var/lib/docker/volumes/applytide_documents/_data/`
2. **Attachments:** `/var/lib/docker/volumes/applytide_attachments/_data/`
3. **Database:** `/var/lib/docker/volumes/applytide_pgdata/_data/`
4. **Cache:** `/var/lib/docker/volumes/applytide_redis_data/_data/`
5. **Backups:** `/var/backups/applytide/`
6. **Code:** `/opt/applytide/`

### Access Methods
- **Docker volumes:** `sudo ls /var/lib/docker/volumes/applytide_*/_data`
- **Backups:** `sudo ls /var/backups/applytide/`
- **Logs:** `docker logs <container_name>`
- **Code:** `cd /opt/applytide`

---

**Last Updated:** November 2, 2025  
**System:** Docker-based production deployment
