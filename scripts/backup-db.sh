#!/bin/sh
# Nightly Postgres backup with 7-day rotation. Run via cron on the VPS.
# Example cron entry (2:30 nightly):
#   30 2 * * * /home/YOU/superapp/scripts/backup-db.sh /home/YOU/superapp
set -e

APP_DIR="${1:-$(pwd)}"
BACKUP_DIR="$HOME/backups"
mkdir -p "$BACKUP_DIR"

cd "$APP_DIR"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-superapp}" \
  | gzip > "$BACKUP_DIR/superapp-$(date +%Y%m%d-%H%M).sql.gz"

# keep the last 7 days
find "$BACKUP_DIR" -name "superapp-*.sql.gz" -mtime +7 -delete
echo "backup written to $BACKUP_DIR"
