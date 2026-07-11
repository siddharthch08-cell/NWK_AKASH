FROM node:22-bookworm-slim AS base
RUN npm install --global npm@11.12.1

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate && npm run build

FROM base AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl openssl sqlite3 && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/scripts/start-production.mjs ./scripts/start-production.mjs
COPY --from=build --chown=nextjs:nodejs /app/scripts/bootstrap-admin.ts ./scripts/bootstrap-admin.ts
COPY --from=build --chown=nextjs:nodejs /app/scripts/audit-default-credentials.ts ./scripts/audit-default-credentials.ts
COPY --from=build --chown=nextjs:nodejs /app/scripts/check-database.ts ./scripts/check-database.ts
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
RUN mkdir -p /app/data /app/private-uploads && chown -R nextjs:nodejs /app/data /app/private-uploads
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -fsS -H 'Host: localhost' http://127.0.0.1:3000/api || exit 1
CMD ["node", "scripts/start-production.mjs"]
