#!/bin/bash

# Record Cascade conversations to Datadog Notebooks
# This script automates the process of capturing and recording Cascade conversations

# Set the current directory to the script's directory
cd "$(dirname "$0")"

# Check for Datadog API keys
if [ -z "$DD_API_KEY" ] || [ -z "$DD_APP_KEY" ]; then
  echo "❌ Error: Datadog API keys not found"
  echo "Please set DD_API_KEY and DD_APP_KEY environment variables"
  exit 1
fi

# Create a timestamp for this recording session
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Create a log file for this session
LOG_FILE="../logs/datadog-recording-${TIMESTAMP}.log"

echo "🔄 Starting Datadog recording session at $(date)"
echo "📝 Logs will be saved to ${LOG_FILE}"

# Run the Node.js script to sync the conversation
node sync-cascade-conversation.js | tee "$LOG_FILE"

echo "✅ Recording completed at $(date)"
echo "View your conversations in the Datadog Notebooks UI"
