#!/bin/bash

# Comprehensive Docker monitoring script for Datadog
# Based on official Datadog Docker integration documentation
# https://docs.datadoghq.com/containers/docker/

set -e

# Check for Datadog API key
if [ -z "${DD_API_KEY}" ]; then
  echo "Error: DD_API_KEY environment variable not set."
  echo "Please set it with: export DD_API_KEY='your_api_key'"
  exit 1
fi

# Create logs directory
LOG_DIR="./logs"
mkdir -p "${LOG_DIR}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUILD_LOG="${LOG_DIR}/docker-build-${TIMESTAMP}.log"
RUN_LOG="${LOG_DIR}/docker-run-${TIMESTAMP}.log"

# Function to send logs to Datadog
send_to_datadog() {
  local log_file=$1
  local log_name=$2
  
  echo "Sending ${log_name} logs to Datadog..."
  
  # Format timestamp for Datadog
  local dd_timestamp=$(date +%s000)
  local hostname=$(hostname)
  local log_content=$(cat "${log_file}" | sed 's/"/\\"/g')
  
  # Create JSON payload with proper tagging
  local json_payload="{
    \"ddsource\": \"docker\",
    \"ddtags\": \"env:development,service:ai-tools-experiment,component:${log_name},version:1.0\",
    \"hostname\": \"${hostname}\",
    \"message\": \"${log_content}\",
    \"timestamp\": ${dd_timestamp},
    \"service\": \"ai-tools-experiment\"
  }"
  
  # Send to Datadog logs intake
  curl -X POST "https://http-intake.logs.datadoghq.com/api/v2/logs" \
    -H "Content-Type: application/json" \
    -H "DD-API-KEY: ${DD_API_KEY}" \
    --data "${json_payload}"
  
  echo "\nLogs sent to Datadog successfully."
}

# Analyze logs for warnings and errors
analyze_logs() {
  local log_file=$1
  local log_name=$2
  
  echo "\n=== Analysis of ${log_name} logs ==="
  
  # Count warnings, errors, and specific issues
  local warnings=$(grep -i "warn" "${log_file}" | wc -l)
  local errors=$(grep -i "error" "${log_file}" | wc -l)
  local npm_issues=$(grep -i "npm" "${log_file}" | grep -i -E "warn|error|deprecated" | wc -l)
  local build_issues=$(grep -i "build" "${log_file}" | grep -i -E "fail|error" | wc -l)
  local network_issues=$(grep -i -E "network|connection" "${log_file}" | grep -i -E "fail|error|refused" | wc -l)
  
  echo "Total warnings: ${warnings}"
  echo "Total errors: ${errors}"
  echo "NPM-related issues: ${npm_issues}"
  echo "Build issues: ${build_issues}"
  echo "Network issues: ${network_issues}"
  
  # Dependency warnings
  echo "\n=== Dependency warnings ==="
  grep -i "warn deprecated" "${log_file}" || echo "No deprecated package warnings found!"
  
  # Node.js/npm version issues
  echo "\n=== Node.js/npm version issues ==="
  grep -i -E "node|npm" "${log_file}" | grep -i -E "version|incompatible" || echo "No Node.js/npm version issues found!"
  
  # Send metrics to Datadog
  echo "\n=== Sending metrics to Datadog ==="
  # Using Datadog Agent API to send metrics
  curl -X POST "http://localhost:8125/api/v1/series" \
    -H "Content-Type: application/json" \
    -d "{
      \"series\": [
        {\"metric\": \"docker.build.warnings\", \"points\": [[$(date +%s), ${warnings}]], \"type\": \"gauge\", \"tags\": [\"service:ai-tools-experiment\"]},
        {\"metric\": \"docker.build.errors\", \"points\": [[$(date +%s), ${errors}]], \"type\": \"gauge\", \"tags\": [\"service:ai-tools-experiment\"]},
        {\"metric\": \"docker.build.npm_issues\", \"points\": [[$(date +%s), ${npm_issues}]], \"type\": \"gauge\", \"tags\": [\"service:ai-tools-experiment\"]}
      ]
    }" || echo "Could not send metrics to Datadog Agent API, ensure the Agent is running"
}

# Main execution
echo "===== Docker Build with Datadog Monitoring ====="
echo "Building Docker containers and capturing logs to ${BUILD_LOG}..."

# Build with no cache to ensure fresh dependencies
docker-compose build --no-cache 2>&1 | tee "${BUILD_LOG}"

# Send build logs to Datadog
send_to_datadog "${BUILD_LOG}" "docker-build"

# Analyze build logs
analyze_logs "${BUILD_LOG}" "docker-build"

# Run the containers
echo "\n===== Starting Docker containers ====="
echo "Running Docker containers and capturing logs to ${RUN_LOG}..."
docker-compose up -d dev 2>&1 | tee "${RUN_LOG}"

# Wait for services to initialize
echo "Waiting for services to initialize..."
sleep 10

# Capture container logs
echo "Capturing container logs..."
docker-compose logs --no-color >> "${RUN_LOG}" 2>&1

# Send runtime logs to Datadog
send_to_datadog "${RUN_LOG}" "docker-run"

# Analyze runtime logs
analyze_logs "${RUN_LOG}" "docker-run"

# Update the docker-compose.yml to include Datadog Agent integration
echo "\n===== Configuring Docker Compose for Datadog integration ====="

# Check if docker-compose.yml already has Datadog service
if grep -q "datadog-agent" "./docker-compose.yml"; then
  echo "Datadog Agent already configured in docker-compose.yml"
else
  echo "Adding Datadog Agent configuration to docker-compose.yml (example)"
  echo "
To add Datadog monitoring to your docker-compose.yml, add the following service:

  datadog-agent:
    image: datadog/agent:latest
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_LOGS_ENABLED=true
      - DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true
      - DD_CONTAINER_EXCLUDE=name:datadog-agent
      - DD_APM_ENABLED=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    networks:
      - ai-tools-network
"

  echo "See the official Datadog Docker documentation for full configuration details:"
  echo "https://docs.datadoghq.com/containers/docker/"
fi

echo "\n===== Docker monitoring complete ====="
echo "All logs have been sent to Datadog for analysis"
echo "Check your Datadog dashboard for comprehensive monitoring"
