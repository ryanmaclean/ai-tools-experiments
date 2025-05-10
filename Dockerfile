# Consolidated Dockerfile for AI Tools Lab
# Supports both production and development via multi-stage builds
# Usage:
#   Production: docker build --target prod -t ai-tools-experiments-prod .
#   Development: docker build --target dev -t ai-tools-experiments-dev .

# ===== BASE STAGE =====
FROM node:22.15-bullseye-slim AS base

ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies for both build and dev
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Update npm to latest version (11.3.0 as of May 2025)
RUN npm install -g npm@11.3.0

# Set working directory
WORKDIR /app

# Copy package files and npm config
COPY package*.json ./
COPY .npmrc ./

# ===== DEV STAGE =====
FROM base AS dev

# Install additional dev dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    # Puppeteer dependencies
    chromium \
    fonts-freefont-ttf \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer for dev
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Rollup ARM64 fix
RUN mkdir -p rollup-fix \
    && echo '{"name":"rollup-fix","dependencies":{"@rollup/rollup-linux-arm64-gnu":"latest"}}' > rollup-fix/package.json \
    && cd rollup-fix && npm install --no-save --no-package-lock -f \
    && cd .. && mkdir -p node_modules/@rollup/ \
    && cp -r rollup-fix/node_modules/@rollup/rollup-linux-arm64-gnu node_modules/@rollup/ || true

# Install all dependencies (including optional for dev)
RUN npm install --no-audit

# Source code is mounted in dev via docker-compose for hot reload
EXPOSE 4321 4322 4323 4324 4325

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ===== BUILDER STAGE =====
FROM base AS builder

ENV NODE_ENV=development

# Install only production dependencies for build
RUN npm install --omit=dev,optional --ignore-scripts

# Copy source code for build
COPY . .

# Copy entrypoint script for native module fix
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Fix native modules before build
RUN chmod +x ./scripts/build-without-native.sh
RUN /usr/local/bin/docker-entrypoint.sh sh -c "echo 'Native modules fixed for build process'"

# Build the application
RUN npm run build

# ===== PRODUCTION STAGE =====
FROM node:22.15-bullseye-slim AS prod

LABEL maintainer="AI Tools Lab" \
      com.datadoghq.ad.logs="[{\"source\":\"nodejs\", \"service\":\"ai-tools-test\"}]" \
      com.datadoghq.tags.service="ai-tools-test" \
      com.datadoghq.tags.env="test" \
      com.datadoghq.tags.issue="rollup-arm64-fix"

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=4321

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /home/appuser -m appuser \
    && mkdir -p /app \
    && chown -R appuser:appuser /app /home/appuser

WORKDIR /app

# Copy built app from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/
COPY scripts/docker-datadog-monitor.sh ./scripts/

RUN chmod +x ./scripts/docker-datadog-monitor.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    && chown -R appuser:appuser /app /home/appuser

RUN mkdir -p /home/appuser/.npm \
    && chown -R appuser:appuser /home/appuser/.npm

USER appuser

EXPOSE 4321

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

RUN npm install -g serve@14.2.1

CMD ["serve", "-s", "./dist", "-l", "4321"]
