#!/bin/bash
set -e

# ==========================
# AUTO-DETECTED PATHS
# ==========================
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

# ==========================
# CONFIG
# ==========================
BACKUP_ROOT="/home/sibli/backups/startech"  # root backup folder
DB_CONTAINER="startech-mysql-1"
DB_NAME="opencart_db"
DB_USER="root"
DB_PASS="root_password"

# Redis anonymous volume (optional)
REDIS_VOLUME="6c1252b6ab7e97928cdd90f78101c2dc13669b101cc571260d2731a28629322f"

DATE_TIME=$(date +"%Y-%m-%d_%H-%M-%S")
DATE_ONLY=$(date +"%Y-%m-%d")

# Create date-wise folder
BACKUP_DIR="$BACKUP_ROOT/$DATE_ONLY"
mkdir -p "$BACKUP_DIR"

echo "🚀 Starting Startech backup: $DATE_TIME"
echo "📂 Project directory: $PROJECT_DIR"
echo "📂 Backup directory: $BACKUP_DIR"

# ==========================
# 1. MySQL BACKUP (SAFE)
# ==========================
echo "📦 Backing up MySQL database..."
docker exec "$DB_CONTAINER" \
  mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  > "$BACKUP_DIR/db_$DATE_TIME.sql"

# ==========================
# 2. PROJECT FILES BACKUP
# ==========================
echo "📁 Backing up project files (excluding MySQL data)..."
tar \
  --exclude="$PROJECT_NAME/mysql" \
  --exclude="$PROJECT_NAME/mysql/*" \
  --exclude="$PROJECT_NAME/.git" \
  --exclude="$PROJECT_NAME/node_modules" \
  --exclude="$PROJECT_NAME/nginx/cache" \
  -czf "$BACKUP_DIR/project_$DATE_TIME.tar.gz" \
  -C "$(dirname "$PROJECT_DIR")" \
  "$PROJECT_NAME"


# ==========================
# 3. REDIS BACKUP (OPTIONAL)
# ==========================
echo "⚡ Backing up Redis sessions (optional)..."
docker run --rm \
  -v "$REDIS_VOLUME:/data" \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  tar czf "/backup/redis_$DATE_TIME.tar.gz" -C /data . \
  || echo "⚠️ Redis backup skipped"

# ==========================
# DONE
# ==========================
echo "✅ Backup completed successfully!"
echo "📂 Backup location: $BACKUP_DIR"
