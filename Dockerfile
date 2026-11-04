# ── deps ─────────────────────────────────────────────
FROM node:25-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
# A lockfile generated on Windows can miss Linux-only optional deps (npm/cli#4828); fall back to install
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# ── build ────────────────────────────────────────────
FROM node:25-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ── runtime ──────────────────────────────────────────
FROM node:25-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 STORAGE_DIR=/app/storage
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
# Prisma CLI (for `migrate deploy`) installed with its full dependency tree, outside the app's node_modules
RUN mkdir -p /opt/prisma-cli && cd /opt/prisma-cli && npm init -y >/dev/null \
  && npm install --no-audit --no-fund prisma@$(node -p "require('/app/node_modules/@prisma/client/package.json').version") \
  && npm cache clean --force
RUN mkdir -p /app/storage && chown -R app:app /app/storage
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
# Migrations may run with separate owner credentials (MIGRATION_DATABASE_URL) so the runtime DATABASE_URL can be a
# least-privilege role (data access only, no DDL). Without it, DATABASE_URL is used for both.
CMD ["sh", "-c", "DATABASE_URL=\"${MIGRATION_DATABASE_URL:-$DATABASE_URL}\" node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma && node server.js"]
