# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Builder
# ============================================
FROM oven/bun:1.3.5-slim AS builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace configuration files
COPY package.json bun.lock turbo.json ./
COPY tsconfig.json tsconfig.base.json ./

# Copy all package.json files for dependency resolution
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/ai/package.json ./packages/ai/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/blockchain/package.json ./packages/blockchain/
COPY packages/db/package.json ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY packages/markets/package.json ./packages/markets/
COPY packages/queue/package.json ./packages/queue/
COPY packages/redis/package.json ./packages/redis/
COPY packages/shared/package.json ./packages/shared/
COPY packages/storage/package.json ./packages/storage/
COPY packages/test-utils/package.json ./packages/test-utils/

# Install dependencies
RUN bun install --filter=server --frozen-lockfile

# Copy source code
COPY apps/server ./apps/server
COPY packages ./packages

# Build the server
WORKDIR /app/apps/server
RUN bun run build

# ============================================
# Stage 2: Runner
# ============================================
FROM oven/bun:1.3.5-slim AS runner

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/server/package.json ./apps/server/
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.base.json ./

# Set environment variables
ENV NODE_ENV=production
ENV HOME=/home/nodejs
ENV PORT=4200

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4200/health || exit 1

EXPOSE 4200

WORKDIR /app/apps/server

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "dist/server.js"]
