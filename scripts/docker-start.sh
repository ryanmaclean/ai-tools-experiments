#!/bin/bash
# Docker startup script for AI Tools Lab
# This script handles starting the development environment with Docker

echo "====== AI Tools Lab Docker Startup ======"

# Default mode
MODE="dev"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod)
      MODE="prod"
      shift
      ;;
    --rebuild)
      REBUILD="--build"
      shift
      ;;
    --help)
      echo "Usage: ./docker-start.sh [--prod] [--rebuild]"
      echo "  --prod     Start in production preview mode"
      echo "  --rebuild  Force rebuild of Docker images"
      echo "  --help     Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check Docker status
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Start container based on mode
if [[ "$MODE" == "prod" ]]; then
  echo "Starting production preview environment..."
  echo "This will build the site and serve it without hot-reloading."
  docker-compose up $REBUILD prod
else
  echo "Starting development environment..."
  echo "This will start the site with hot-reloading enabled."
  echo "Access the site at: http://localhost:4321 (or higher port if 4321 is busy)"
  docker-compose up $REBUILD dev
fi
