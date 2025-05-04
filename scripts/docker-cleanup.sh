#!/bin/bash
# Docker cleanup script for AI Tools Lab
# This helps keep Docker resources optimized

echo "====== AI Tools Lab Docker Cleanup ======"

# Stop all containers related to the project
echo "Stopping containers..."
docker-compose down

# Remove unused images
echo "Removing dangling images..."
docker image prune -f

# Clean build cache
echo "Cleaning build cache..."
docker builder prune -f

# Optional: Remove all project images to force rebuild
if [[ "$1" == "--all" ]]; then
  echo "Removing project images..."
  docker image ls | grep ai-tools-experiments | awk '{print $3}' | xargs -r docker image rm -f
fi

echo "Done! Docker environment cleaned."
echo "To restart the development environment, run: docker-compose up dev"
