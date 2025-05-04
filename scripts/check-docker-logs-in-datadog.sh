#!/bin/bash

# Script to check Docker build logs in Datadog
# Requires the DD_API_KEY and DD_APP_KEY environment variables to be set

set -e

echo "=== Checking Docker build logs in Datadog ==="

if [ -z "${DD_API_KEY}" ]; then
  echo "Error: DD_API_KEY environment variable not set. Please set it to your Datadog API key."
  exit 1
fi

if [ -z "${DD_APP_KEY}" ]; then
  echo "Error: DD_APP_KEY environment variable not set. Please set it to your Datadog application key."
  exit 1
fi

# Current time minus 15 minutes (in Unix time)
FROM_TIME=$(date -v-15M +%s)
# Current time (in Unix time)
TO_TIME=$(date +%s)

# Construct query to find Docker build logs
QUERY="service:docker-build"

echo "Retrieving logs from Datadog for the last 15 minutes..."

# Get logs from Datadog
RESPONSE=$(curl -s -X POST "https://api.datadoghq.com/api/v2/logs/events/search" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  --data "{
    \"filter\": {\n        \"query\": \"${QUERY}\",
        \"from\": \"${FROM_TIME}\",
        \"to\": \"${TO_TIME}\"
    },
    \"sort\": \"-timestamp\",
    \"page\": {\n        \"limit\": 10
    }
}")

# Check for logs
LOG_COUNT=$(echo "${RESPONSE}" | grep -o '"meta":{"page":{"after":null,"limit":10},"status":"done","warning":null,"elapsed":.*,"total_count":.*' | grep -o 'total_count":[0-9]*' | cut -d ':' -f2)

if [ -z "${LOG_COUNT}" ] || [ "${LOG_COUNT}" -eq 0 ]; then
  echo "No Docker build logs found in Datadog for the last 15 minutes."
  exit 0
fi

echo "Found ${LOG_COUNT} logs in Datadog."

# Extract and check the most recent log for dependency warnings
LOG_MESSAGE=$(echo "${RESPONSE}" | grep -o '"message":".*"' | head -1 | sed 's/"message":"\(.*\)"/\1/' | sed 's/\\//g')

echo "\n=== Checking for dependency warnings ==="
echo "${LOG_MESSAGE}" | grep -i "warn deprecated" || echo "No deprecated package warnings found in the latest build log!"

# Check specifically for glob and rimraf warnings
echo "\n=== Checking for specific package warnings ==="
if echo "${LOG_MESSAGE}" | grep -i "warn deprecated glob@"; then
  echo "WARNING: Still seeing deprecated glob warnings!"
else
  echo "SUCCESS: No warnings about deprecated glob package."
fi

if echo "${LOG_MESSAGE}" | grep -i "warn deprecated rimraf@"; then
  echo "WARNING: Still seeing deprecated rimraf warnings!"
else
  echo "SUCCESS: No warnings about deprecated rimraf package."
fi

if echo "${LOG_MESSAGE}" | grep -i "warn deprecated inflight@"; then
  echo "WARNING: Still seeing deprecated inflight warnings! Run scripts/replace-inflight-with-lrucache.sh"
else
  echo "SUCCESS: No warnings about deprecated inflight package."
fi

echo "\n=== Done! ==="
