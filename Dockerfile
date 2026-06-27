# =============================================================================
# EDULEARN PRO — Production Dockerfile (multi-stage)
# =============================================================================

# ---- Stage 1: Build ----
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install all dependencies (including dev for build)
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build the Next.js standalone output
RUN bun run build

# ---- Stage 2: Production ----
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Install OpenSSL (needed by Prisma) + curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files for migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy package.json (for db scripts)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Generate Prisma client
RUN bunx prisma generate

# Create uploads directory
RUN mkdir -p /app/private-uploads && chown nextjs:nodejs /app/private-uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api || exit 1

# Start command — runs migration then starts server
CMD ["sh", "-c", "bunx prisma db push --skip-generate && bun server.js"]
