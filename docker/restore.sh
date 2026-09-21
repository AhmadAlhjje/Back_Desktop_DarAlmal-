#!/usr/bin/env bash
# استعادة نسخة احتياطية أخذها backup.sh — يستبدل قاعدة البيانات الحالية بالكامل (كل المكاتب)!
#   الاستعمال:  /opt/wafeer/docker/restore.sh /opt/backups/2026-09-22_030000
# يُفضَّل إيقاف وفير أثناءها:  cd /opt/wafeer && docker compose stop   ← ثم بعد الاستعادة  docker compose start
set -euo pipefail

src=${1:?usage: restore.sh <backup-dir>}
ENV_FILE=${ENV_FILE:-/opt/wafeer/.env}
DB_CONTAINER=${DB_CONTAINER:-wafeer-dashboard-db}
APP_CONTAINER=${APP_CONTAINER:-wafeer-backend}
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r'); DB_NAME=${DB_NAME:-mizan}
DB_ROOT_PASSWORD=$(grep -E '^DB_ROOT_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')

[ -f "$src/$DB_NAME.sql.gz" ] || { echo "missing $src/$DB_NAME.sql.gz" >&2; exit 1; }
read -r -p "سيتم استبدال قاعدة $DB_NAME الحالية بنسخة $src — اكتب yes للمتابعة: " ok
[ "$ok" = "yes" ] || { echo "cancelled"; exit 1; }

gunzip -c "$src/$DB_NAME.sql.gz" | docker exec -i -e MYSQL_PWD="$DB_ROOT_PASSWORD" "$DB_CONTAINER" mariadb -uroot "$DB_NAME"
if [ -f "$src/uploads.tgz" ]; then
  docker exec -i "$APP_CONTAINER" tar xzf - -C /app < "$src/uploads.tgz"
fi
echo "restore ok from $src"
