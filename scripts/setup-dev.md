# Local Development Setup (PostgreSQL)
# ====================================
# Requires Docker Desktop running on your machine.
#
# Usage:
#   docker compose -f docker-compose.dev.yml up -d
#   npm run dev
#
# This starts PostgreSQL and Redis locally for development.
# Your .env should have:
#   DATABASE_URL="postgresql://nwk:nwk_dev_password@localhost:5432/nwk_dev"
#   REDIS_URL="redis://localhost:6379"
#
# After first run, initialize the database:
#   npx prisma migrate deploy
#   npm run db:bootstrap-admin
#
# To stop:
#   docker compose -f docker-compose.dev.yml down
#
# To reset database:
#   docker compose -f docker-compose.dev.yml down -v
#   docker compose -f docker-compose.dev.yml up -d
#   npx prisma migrate deploy
#   npm run db:bootstrap-admin

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: nwk
      POSTGRES_PASSWORD: nwk_dev_password
      POSTGRES_DB: nwk_dev
    ports: ["5432:5432"]
    volumes: ["pgdata_dev:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nwk"]
      interval: 5s
      timeout: 3s
      retries: 20

  redis:
    image: redis:7.4-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes: ["redisdata_dev:/data"]
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20

volumes:
  pgdata_dev:
  redisdata_dev:
