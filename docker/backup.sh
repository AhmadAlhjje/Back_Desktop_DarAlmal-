#!/usr/bin/env bash
# نسخة احتياطية لوفير على الخادم: قاعدة البيانات (كل المكاتب) + الملفات المرفوعة (لوغوهات المكاتب
# وأيقونات العملات). تعمل والخدمة شغّالة (لقطة متسقة بـ --single-transaction).
#   الاستعمال اليدوي:  /opt/wafeer/docker/backup.sh
#   يومياً 3 فجراً:    crontab -e  ←  0 3 * * * /opt/wafeer/docker/backup.sh >> /var/log/wafeer-backup.log 2>&1
# المتغيرات (اختيارية): BACKUP_DIR=/opt/backups  KEEP_DAYS=14  ENV_FILE=/opt/wafeer/.env
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-/opt/backups}
KEEP_DAYS=${KEEP_DAYS:-14}
ENV_FILE=${ENV_FILE:-/opt/wafeer/.env}
DB_CONTAINER=${DB_CONTAINER:-wafeer-dashboard-db}
APP_CONTAINER=${APP_CONTAINER:-wafeer-backend}

[ -f "$ENV_FILE" ] || { echo "ENV_FILE not found: $ENV_FILE" >&2; exit 1; }
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r'); DB_NAME=${DB_NAME:-mizan}
DB_ROOT_PASSWORD=$(grep -E '^DB_ROOT_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
[ -n "$DB_ROOT_PASSWORD" ] || { echo "DB_ROOT_PASSWORD missing in $ENV_FILE" >&2; exit 1; }

stamp=$(date +%F_%H%M%S)
dest="$BACKUP_DIR/$stamp"
mkdir -p "$dest"

# 1) القاعدة — كلمة المرور عبر MYSQL_PWD (لا تظهر في قائمة العمليات)
docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" "$DB_CONTAINER" \
  mariadb-dump -uroot --single-transaction --routines --triggers --events "$DB_NAME" | gzip > "$dest/$DB_NAME.sql.gz"

# 2) الملفات المرفوعة من داخل حاوية وفير (المجلد الدائم uploads_data)
docker exec "$APP_CONTAINER" tar czf - -C /app uploads > "$dest/uploads.tgz"

# 3) حذف النسخ الأقدم من KEEP_DAYS يوماً
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} + 2>/dev/null || true

echo "$(date '+%F %T') backup ok: $dest ($(du -sh "$dest" | cut -f1))"
