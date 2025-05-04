#!/bin/bash

# Datadog Integration Validation Script
# This script verifies the Datadog integration is properly configured
# and working as expected.

# Load API keys from environment or use the ones provided
if [ -z "$DD_API_KEY" ] || [ -z "$DD_APP_KEY" ]; then
  echo "Environment variables not set, using values from .env file"
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  else
    echo "⚠️ .env file not found and environment variables not set"
    exit 1
  fi
fi

# Color output
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${YELLOW}🔄 Starting Datadog integration validation${NC}"
echo "========================================"

# Check API key validity
echo -e "\n${YELLOW}🔐 Checking API key validity...${NC}"
VALID_RESPONSE=$(curl -s -X GET "https://api.datadoghq.com/api/v1/validate" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DD_API_KEY")

if echo "$VALID_RESPONSE" | grep -q "\"valid\":true"; then
  echo -e "${GREEN}✅ API key is valid!${NC}"
else
  echo -e "${RED}❌ API key validation failed: $VALID_RESPONSE${NC}"
  exit 1
fi

# Check RUM Applications
echo -e "\n${YELLOW}🔍 Validating RUM integration...${NC}"
RUM_RESPONSE=$(curl -s -X GET "https://api.datadoghq.com/api/v2/rum/applications" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DD_API_KEY" \
  -H "DD-APPLICATION-KEY: $DD_APP_KEY")

if echo "$RUM_RESPONSE" | grep -q "data"; then
  NUM_APPS=$(echo "$RUM_RESPONSE" | grep -o '"type":"rum_application"' | wc -l)
  echo -e "${GREEN}✅ Found $NUM_APPS RUM applications${NC}"
  
  # Check for AI Tools Lab application
  AI_TOOLS_APP=$(echo "$RUM_RESPONSE" | grep -o '"name":"ai-tools-lab"')
  if [ -n "$AI_TOOLS_APP" ]; then
    echo -e "${GREEN}✅ Found 'ai-tools-lab' application!${NC}"
  else
    echo -e "${YELLOW}⚠️ 'ai-tools-lab' application not found. Available apps:${NC}"
    echo "$RUM_RESPONSE" | grep -o '"name":"[^"]*"' | sed 's/"name"://g' | tr -d '"' | sed 's/^/- /'
  fi
else
  echo -e "${RED}❌ Failed to retrieve RUM applications: $RUM_RESPONSE${NC}"
fi

# Check for test results
echo -e "\n${YELLOW}🧪 Checking test results...${NC}"
# Mac OS date command format
ONE_DAY_AGO=$(date -v-1d +%s 2>/dev/null || date --date="1 day ago" +%s 2>/dev/null || echo $(($(date +%s) - 86400)))
NOW=$(date +%s)
TEST_RESPONSE=$(curl -s -X GET "https://api.datadoghq.com/api/v2/ci/tests/runs?page[limit]=10&filter[from]=$ONE_DAY_AGO&filter[to]=$NOW" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DD_API_KEY" \
  -H "DD-APPLICATION-KEY: $DD_APP_KEY")

if echo "$TEST_RESPONSE" | grep -q "data"\[\]; then
  echo -e "${YELLOW}⚠️ No test runs found in the last 24 hours${NC}"
  echo "Run the visual tests to generate test data:"
  echo "npm run test:visual:dd"
else
  NUM_TESTS=$(echo "$TEST_RESPONSE" | grep -o '"type":"ci_test_run"' | wc -l)
  if [ "$NUM_TESTS" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $NUM_TESTS test runs in the last 24 hours${NC}"
    echo "$TEST_RESPONSE" | grep -o '"name":"[^"]*"' | head -5 | sed 's/"name"://g' | tr -d '"' | sed 's/^/- /'
  else
    echo -e "${YELLOW}⚠️ No test runs found in the last 24 hours${NC}"
    echo "Run the visual tests to generate test data:"
    echo "npm run test:visual:dd"
  fi
fi

# Check for custom metrics
echo -e "\n${YELLOW}📊 Checking custom metrics...${NC}"
# Mac OS date command format
ONE_HOUR_AGO=$(date -v-1h +%s 2>/dev/null || date --date="1 hour ago" +%s 2>/dev/null || echo $(($(date +%s) - 3600)))
NOW=$(date +%s)
METRICS_RESPONSE=$(curl -s -X GET "https://api.datadoghq.com/api/v1/metrics?from=$ONE_HOUR_AGO&to=$NOW" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DD_API_KEY" \
  -H "DD-APPLICATION-KEY: $DD_APP_KEY")

if echo "$METRICS_RESPONSE" | grep -q '"metrics"'; then
  echo -e "${GREEN}✅ Successfully queried metrics API${NC}"
  
  # Look for our custom metrics
  CUSTOM_METRICS=$(echo "$METRICS_RESPONSE" | grep -o '"test\.[^"]*"')
  if [ -n "$CUSTOM_METRICS" ]; then
    echo -e "${GREEN}✅ Found custom test metrics:${NC}"
    echo "$CUSTOM_METRICS" | tr -d '"' | sed 's/^/- /'
  else
    echo -e "${YELLOW}⚠️ No custom test metrics found. Run some tests to generate metrics.${NC}"
  fi
else
  echo -e "${RED}❌ Failed to retrieve metrics: $METRICS_RESPONSE${NC}"
fi

echo -e "\n${YELLOW}📋 Integration Validation Summary${NC}"
echo "========================================"
echo -e "API Key: ${GREEN}✅ Valid${NC}"

if echo "$RUM_RESPONSE" | grep -q "data"; then
  echo -e "RUM Integration: ${GREEN}✅ Working${NC}"
else
  echo -e "RUM Integration: ${RED}❌ Not Working${NC}"
fi

if echo "$TEST_RESPONSE" | grep -q 'data\[\]' || echo "$TEST_RESPONSE" | grep -q '"type":"ci_test_run"'; then
  if echo "$TEST_RESPONSE" | grep -q '"type":"ci_test_run"'; then
    echo -e "Test Integration: ${GREEN}✅ Working${NC}"
  else
    echo -e "Test Integration: ${YELLOW}⚠️ Configured but no test data${NC}"
  fi
else
  echo -e "Test Integration: ${RED}❌ Not Working${NC}"
fi

if echo "$METRICS_RESPONSE" | grep -q '"metrics"'; then
  if echo "$METRICS_RESPONSE" | grep -q '"test\.[^"]*"'; then
    echo -e "Metrics: ${GREEN}✅ Working${NC}"
  else
    echo -e "Metrics: ${YELLOW}⚠️ API Working but no test metrics${NC}"
  fi
else
  echo -e "Metrics: ${RED}❌ Not Working${NC}"
fi

echo -e "\n${GREEN}Validation Complete!${NC}"
