#!/bin/bash

# Docker Log Analyzer Script
# This script runs docker commands and analyzes the logs for warnings and errors

set -e
ECHO_PREFIX="[Docker Log Analyzer]"

# Create log directory if it doesn't exist
LOG_DIR="$(pwd)/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/docker-build-$(date +%Y%m%d-%H%M%S).log"

echo "$ECHO_PREFIX Starting analysis at $(date)"
echo "$ECHO_PREFIX Logs will be saved to $LOG_FILE"

# Function to analyze logs for warnings and errors
analyze_logs() {
  local log_file="$1"
  
  echo "$ECHO_PREFIX Analyzing logs for warnings and errors..."
  
  # Count warnings and errors
  local warnings=$(grep -i "warn" "$log_file" | wc -l)
  local errors=$(grep -i "error" "$log_file" | wc -l)
  local npm_issues=$(grep -i "npm" "$log_file" | grep -i -E "warn|error|deprecated" | wc -l)
  
  echo "-------------------------------------------"
  echo "$ECHO_PREFIX Log Analysis Summary:"
  echo "-------------------------------------------"
  echo "Warnings: $warnings"
  echo "Errors: $errors"
  echo "NPM issues: $npm_issues"
  echo "-------------------------------------------"
  
  # LRU cache warnings have been resolved with Ubuntu-based Docker image
  
  # Show npm warnings
  if [ $npm_issues -gt 0 ]; then
    echo "$ECHO_PREFIX NPM warnings found:"
    grep -i "npm" "$log_file" | grep -i -E "warn|error|deprecated"
  fi
}

# Build docker images with logs
echo "$ECHO_PREFIX Building Docker images..."
docker-compose build 2>&1 | tee "$LOG_FILE"

# Analyze the logs
analyze_logs "$LOG_FILE"

# Run the development container
echo "$ECHO_PREFIX Starting development container..."
docker-compose up dev -d

# Wait for container to start
sleep 5

# Capture container logs
DEV_CONTAINER=$(docker-compose ps -q dev)
if [ -n "$DEV_CONTAINER" ]; then
  DEV_LOG_FILE="$LOG_DIR/dev-container-$(date +%Y%m%d-%H%M%S).log"
  echo "$ECHO_PREFIX Capturing development container logs to $DEV_LOG_FILE"
  docker logs "$DEV_CONTAINER" > "$DEV_LOG_FILE" 2>&1
  
  # Analyze dev container logs
  analyze_logs "$DEV_LOG_FILE"
else
  echo "$ECHO_PREFIX Development container not found or not running"
fi

echo "$ECHO_PREFIX Analysis complete"
echo "$ECHO_PREFIX All logs saved to $LOG_DIR"
