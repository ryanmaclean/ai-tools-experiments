#!/bin/bash

# Docker Build & Deploy Script
# Builds and deploys Docker containers with proper configuration
# Based on verified Docker best practices for Node.js applications

set -e

echo "[$(date)] Starting Docker build & deploy process"

# Environment variables
VERSION=${VERSION:-"1.0.0"}
ENV=${ENV:-"development"}
DD_API_KEY=${DD_API_KEY:-""}

echo "[$(date)] Building for environment: $ENV with version: $VERSION"

# Step 1: Validate Docker & Docker Compose installation
if ! command -v docker >/dev/null 2>&1; then
    echo "[$(date)] Error: Docker is not installed" >&2
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    echo "[$(date)] Error: Docker Compose is not installed" >&2
    exit 1
fi

echo "[$(date)] ✅ Docker dependencies verified"

# Step 2: Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "[$(date)] Creating .env.local file"
    echo "DD_API_KEY=$DD_API_KEY" > .env.local
    echo "VERSION=$VERSION" >> .env.local
fi

# Step 3: Build Docker images based on environment
case "$ENV" in
    "development")
        echo "[$(date)] Building development image"
        export VERSION=$VERSION
        docker-compose build dev
        ;;
    "test")
        echo "[$(date)] Building test image"
        export VERSION=$VERSION
        docker-compose build app
        ;;
    "production")
        echo "[$(date)] Building production image using multi-stage build"
        export VERSION=$VERSION
        docker-compose build prod
        ;;
    *)
        echo "[$(date)] Unknown environment: $ENV" >&2
        exit 1
        ;;
esac

echo "[$(date)] ✅ Docker build completed successfully"

# Step 4: Verify build
echo "[$(date)] Running verification tests"
./scripts/docker-best-practices-test.sh

# Step 5: Run the container based on environment
case "$ENV" in
    "development")
        echo "[$(date)] Starting development container"
        docker-compose up -d dev
        ;;
    "test")
        echo "[$(date)] Running tests"
        docker-compose up app
        ;;
    "production")
        echo "[$(date)] Starting production container"
        docker-compose up -d prod
        ;;
esac

echo "[$(date)] ✅ Docker deployment completed successfully"

# Step 6: Print access information
case "$ENV" in
    "development"|"production")
        CONTAINER_NAME="ai-tools-experiments-${ENV}-1"
        CONTAINER_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")
        PORT=4321
        echo "[$(date)] 🚀 Application is running!"
        echo "[$(date)] 🔗 Access URL: http://${CONTAINER_IP}:${PORT}"
        echo "[$(date)] 📊 Datadog logs: https://app.datadoghq.com/logs?query=service%3Aai-tools-${ENV}"
        ;;
esac

exit 0
