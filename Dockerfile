# =============================================================================
# Naya Wallah Kanoon — Production Dockerfile (SQLite, single-stage)
# =============================================================================

FROM oven/bun:1-slim
WORKDIR /app

# Install OpenSSL (needed by Prisma) + curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy dependency files
COPY package.json bun.lock ./

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
RUN mkdir -p /app/private-uploads && chown nextjs:nodejs /app/private-uploads

# Build the Next.js standalone output
RUN bun run build

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

# Start: push schema to SQLite, then start server
CMD ["sh", "-c", "bunx prisma db push --skip-generate && bun run start"]
