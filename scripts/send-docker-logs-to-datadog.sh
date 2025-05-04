#!/bin/bash

# Script to send Docker build logs to Datadog
# Requires the DD_API_KEY environment variable to be set

set -e

echo "=== Sending Docker build logs to Datadog ==="

if [ -z "${DD_API_KEY}" ]; then
  echo "Error: DD_API_KEY environment variable not set. Please set it to your Datadog API key."
  exit 1
fi

# Prepare log directory
LOG_DIR="./logs"
mkdir -p "${LOG_DIR}"
BUILD_LOG="${LOG_DIR}/docker-build-$(date +%Y%m%d-%H%M%S).log"

# Run Docker build with logs captured
echo "Building Docker containers and capturing logs to ${BUILD_LOG}..."
docker-compose build --no-cache 2>&1 | tee "${BUILD_LOG}"

# Send logs to Datadog
echo "Sending logs to Datadog..."

# Format the log data for Datadog API
TIMESTAMP=$(date +%s000)
HOSTNAME=$(hostname)
LOG_CONTENT=$(cat "${BUILD_LOG}" | sed 's/"/\\"/g')

JSON_PAYLOAD="{
  \"ddsource\": \"docker\",
  \"ddtags\": \"env:development,service:docker-build,version:1.0\",
  \"hostname\": \"${HOSTNAME}\",
  \"message\": \"${LOG_CONTENT}\",
  \"timestamp\": ${TIMESTAMP},
  \"service\": \"docker-build\"
}"

# Send to Datadog logs intake
curl -X POST "https://http-intake.logs.datadoghq.com/api/v2/logs" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  --data "${JSON_PAYLOAD}"

echo "\nLogs sent to Datadog successfully."

# Extract warnings about dependencies
echo "\n=== Dependency warnings in build logs ==="
grep -i "warn deprecated" "${BUILD_LOG}" || echo "No deprecated package warnings found!"

echo "\n=== Done! ==="
