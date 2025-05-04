#!/bin/bash

# Run Datadog Synthetics Setup Script
# This script sets up synthetic browser tests for all routes in the AI Tools Lab project

# Check if Datadog API keys are available
if [ -z "$DD_API_KEY" ] || [ -z "$DD_APP_KEY" ]; then
  if [ -f ./.env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
  else
    echo "❌ ERROR: Datadog API keys not found"
    echo "Please set DD_API_KEY and DD_APP_KEY environment variables or create a .env file"
    exit 1
  fi
fi

# Run the Datadog Synthetics setup script
node ./tests/setup-datadog-synthetics.js
