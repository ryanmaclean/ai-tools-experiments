#!/bin/bash

# Script to check logs in Datadog for warnings and errors
# Requires the DD_API_KEY and DD_APP_KEY environment variables to be set

set -e

echo "=== Checking logs in Datadog ==="

if [ -z "${DD_API_KEY}" ]; then
  echo "Error: DD_API_KEY environment variable not set."
  exit 1
fi

if [ -z "${DD_APP_KEY}" ]; then
  echo "Error: DD_APP_KEY environment variable not set."
  exit 1
fi

# Current time minus 15 minutes (in Unix time)
FROM_TIME=$(date -v-15M +%s)
# Current time (in Unix time)
TO_TIME=$(date +%s)

# Service name from argument or default
SERVICE=${1:-"ai-tools-lab"}

# Construct query to find logs with warnings or errors
QUERY="service:${SERVICE} (status:error OR level:error OR level:warn)"

echo "Retrieving logs from Datadog for service ${SERVICE} in the last 15 minutes..."

# Get logs from Datadog
RESPONSE=$(curl -s -X POST "https://api.datadoghq.com/api/v2/logs/events/search" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  --data "{
    \"filter\": {
        \"query\": \"${QUERY}\",
        \"from\": \"${FROM_TIME}\",
        \"to\": \"${TO_TIME}\"
    },
    \"sort\": \"-timestamp\",
    \"page\": {
        \"limit\": 100
    }
}")

# Check for logs
LOG_COUNT=$(echo "${RESPONSE}" | grep -o '"meta":{"page":{"after":null,"limit":100},"status":"done","warning":null,"elapsed":.*,"total_count":.*' | grep -o 'total_count":[0-9]*' | cut -d ':' -f2)

if [ -z "${LOG_COUNT}" ] || [ "${LOG_COUNT}" -eq 0 ]; then
  echo "No warnings or errors found in logs for the last 15 minutes."
  exit 0
fi

echo "Found ${LOG_COUNT} warnings/errors in logs."

# Extract and display the warnings/errors
echo "\n=== Recent Warnings and Errors ==="
MESSAGES=$(echo "${RESPONSE}" | grep -o '"message":"[^"]*"' | sed 's/"message":"\(.*\)"/\1/')

if [ -n "${MESSAGES}" ]; then
  echo "${MESSAGES}"
  # Exit with error if we found warnings/errors
  exit 1
else
  echo "No warning/error messages found in the logs."
  exit 0
fi
