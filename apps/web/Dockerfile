# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Builder
# ============================================
FROM oven/bun:1.3.5 AS builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
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
COPY packages/mcp-client/package.json ./packages/mcp-client/
COPY packages/queue/package.json ./packages/queue/
COPY packages/redis/package.json ./packages/redis/
COPY packages/shared/package.json ./packages/shared/
COPY packages/storage/package.json ./packages/storage/
COPY packages/test-utils/package.json ./packages/test-utils/

# Install dependencies
RUN bun install --filter=web --frozen-lockfile && bun add @takumi-rs/core-linux-x64-gnu@0.60.8 --optional

# Copy source code
COPY apps/web ./apps/web
COPY packages ./packages

# Build arguments for public environment variables
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST

# Set build-time environment variables
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Build Next.js application
WORKDIR /app/apps/web
RUN bun run build

# ============================================
# Stage 2: Runner
# ============================================
FROM oven/bun:1.3.5 AS runner

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

WORKDIR /app

# Copy standalone build from builder
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=4201

# Preserve public environment variables
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4201/ || exit 1

EXPOSE 4201

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "apps/web/server.js"]
