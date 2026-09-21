#!/bin/sh
# إقلاع حاوية وفير: انتظار القاعدة → الهجرات (مرة واحدة لكل ملف، آمنة عند كل تشغيل) → الخادم.
set -e
cd /app

node docker/wait-for-db.cjs

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[migrate] running sequelize migrations..."
  npx sequelize-cli db:migrate
else
  echo "[migrate] skipped (RUN_MIGRATIONS=${RUN_MIGRATIONS})"
fi

echo "[server] starting Wafeer API on port ${PORT:-3000}"
exec node dist/src/server.js
