# Multi-stage build for AI Tools Experiment Project
# Following Docker best practices: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

# ===== BUILD STAGE =====
FROM node:22.15-bullseye-slim AS builder

# Set environment variables
ENV NODE_ENV=production
ENV DEBIAN_FRONTEND=noninteractive

# Build arguments - can be set during build time
ARG DD_API_KEY

# Install minimal dependencies required for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    # Only include dependencies needed for building
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Update npm to 11.3.0
RUN npm install -g npm@11.3.0

# Set working directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./
COPY .npmrc ./

# Fix for Rollup ARM64 issue using documented approach
RUN mkdir -p rollup-fix \
    && echo '{"name":"rollup-fix","dependencies":{"@rollup/rollup-linux-arm64-gnu":"latest"}}' > rollup-fix/package.json \
    && cd rollup-fix && npm install --no-save --no-package-lock --force \
    && cd .. && mkdir -p node_modules/@rollup/ \
    && cp -r rollup-fix/node_modules/@rollup/rollup-linux-arm64-gnu node_modules/@rollup/ || true

# Install production dependencies only
RUN npm install --omit=dev,optional --ignore-scripts

# Copy source code
COPY . .

# Copy our entrypoint script for ensuring architecture compatibility
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Fix native modules using entrypoint script before building
RUN chmod +x ./scripts/build-without-native.sh

# Run the entrypoint script first to ensure architecture compatibility
RUN /usr/local/bin/docker-entrypoint.sh sh -c "echo 'Native modules fixed for build process'"

# Then build the application with our build script directly
RUN npm run build

# ===== PRODUCTION STAGE =====
FROM node:22.15-bullseye-slim AS production

# Label the image with metadata (helps with Datadog monitoring)
LABEL maintainer="AI Tools Lab" \
      com.datadoghq.ad.logs="[{\"source\":\"nodejs\", \"service\":\"ai-tools-prod\"}]" \
      com.datadoghq.tags.service="ai-tools-prod" \
      com.datadoghq.tags.env="production" \
      com.datadoghq.tags.issue="rollup-arm64-fix"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4321

# Install minimal runtime dependencies first (as root)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Only essential runtime dependencies
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user with proper home directory permissions
RUN groupadd -r appuser && useradd -r -g appuser -d /home/appuser -m appuser \
    && mkdir -p /app \
    && chown -R appuser:appuser /app /home/appuser

# Set working directory
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/

# Copy Datadog integration files if needed for runtime monitoring
COPY scripts/docker-datadog-monitor.sh ./scripts/

# Make scripts executable and fix permissions
RUN chmod +x ./scripts/docker-datadog-monitor.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    # Fix permissions for the entire app directory
    && chown -R appuser:appuser /app
    
# Create .npm directory for the non-root user with proper permissions
RUN mkdir -p /home/appuser/.npm \
    && chown -R appuser:appuser /home/appuser/.npm

# Use the non-root user
USER appuser

# Expose port
EXPOSE 4321

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Install a static file server
RUN npm install -g serve@14.2.1

# Command to run a static file server for the build output
CMD ["serve", "-s", "./dist", "-l", "4321"]

