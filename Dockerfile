# ── وفير — الباك اند (Express + Sequelize + TypeScript) ─────────────────────
# مرحلتان: الأولى تترجم TypeScript، والثانية صورة تشغيل خفيفة (تبعيات الإنتاج + sequelize-cli
# للهجرات). عند إقلاع الحاوية: انتظار قاعدة البيانات → تشغيل الهجرات → تشغيل الخادم (المنفذ 5002).
# الإعدادات من متغيرات البيئة (docker-compose → .env)؛ لا يُنسخ أي ملف .env داخل الصورة.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=5002
WORKDIR /app
COPY package.json package-lock.json ./
# تبعيات التشغيل فقط + sequelize-cli لتشغيل الهجرات داخل الحاوية
RUN npm ci --omit=dev \
 && npm install --no-save --omit=dev sequelize-cli@^6.6.2 \
 && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY .sequelizerc ./
COPY database ./database
COPY docker/wait-for-db.cjs docker/entrypoint.sh ./docker/
# مجلد الرفع (أيقونات العملات) — يُربط بمجلد دائم من docker-compose
RUN mkdir -p uploads/currencies && chmod +x docker/entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 5002
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker/entrypoint.sh"]
