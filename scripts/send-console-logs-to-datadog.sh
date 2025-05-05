#!/bin/bash

# Script to send console logs to Datadog
# Requires the DD_API_KEY environment variable to be set

set -e

echo "=== Sending console logs to Datadog ==="

if [ -z "${DD_API_KEY}" ]; then
  echo "Error: DD_API_KEY environment variable not set."
  exit 1
else
  echo "Found DD_API_KEY in environment."
fi

# Prepare log directory
LOG_DIR="./logs"
mkdir -p "${LOG_DIR}"
CONSOLE_LOG="${LOG_DIR}/console-$(date +%Y%m%d-%H%M%S).log"

# Run the command and capture logs
echo "Running command and capturing logs to ${CONSOLE_LOG}..."
DD_API_KEY="${DD_API_KEY}" "$@" 2>&1 | tee "${CONSOLE_LOG}"

# Send logs to Datadog
echo "Sending logs to Datadog..."

# Format the log data for Datadog API
TIMESTAMP=$(date +%s000)
HOSTNAME=$(hostname)
LOG_CONTENT=$(cat "${CONSOLE_LOG}" | sed 's/"/\\"/g')

JSON_PAYLOAD="{
  \"ddsource\": \"console\",
  \"ddtags\": \"env:development,service:ai-tools-lab,version:1.0\",
  \"hostname\": \"${HOSTNAME}\",
  \"message\": \"${LOG_CONTENT}\",
  \"timestamp\": ${TIMESTAMP},
  \"service\": \"ai-tools-lab\"
}"

# Send to Datadog logs intake
curl -X POST "https://http-intake.logs.datadoghq.com/api/v2/logs" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  --data "${JSON_PAYLOAD}"

echo -e "\nLogs sent to Datadog successfully."
echo -e "\n=== Done! ==="
