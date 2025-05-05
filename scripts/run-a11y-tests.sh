#!/bin/bash

# Script to run accessibility tests and check logs
# Requires DD_API_KEY and DD_APP_KEY environment variables to be set

set -e

echo "=== Running accessibility tests with log monitoring ==="

# Start the dev server
echo "Starting dev server..."
npm run dev & 
SERVER_PID=$!

# Wait for server to be ready
sleep 10

# Run tests and send logs to Datadog
./scripts/send-console-logs-to-datadog.sh npm run test:a11y

# Kill the dev server
kill $SERVER_PID

# Wait a moment for logs to be processed
sleep 5

# Check Datadog logs for errors
./scripts/check-datadog-logs.sh ai-tools-lab

echo "=== Done! ==="
