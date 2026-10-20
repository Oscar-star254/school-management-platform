#!/bin/sh
set -eu
mkdir -p "${BACKUP_DIR:-/backups}"
stamp="$(date +%Y%m%d-%H%M%S)"
pg_dump "$DATABASE_URL" | gzip > "${BACKUP_DIR:-/backups}/school-${stamp}.sql.gz"
find "${BACKUP_DIR:-/backups}" -name 'school-*.sql.gz' -mtime +14 -delete
