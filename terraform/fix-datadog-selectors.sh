#!/bin/bash

# This script correctly formats all element selectors in the Datadog Synthetics browser test

sed -i '' 's/element = jsonencode({"selector": "body"})/element = "body"/' datadog_synthetics.tf
sed -i '' 's/element = jsonencode({"selector": "nav"})/element = "nav"/' datadog_synthetics.tf
sed -i '' 's/element = "\.\.element = jsonencode({"selector": "\.about-content"})"/element = "\.about-content"/' datadog_synthetics.tf
sed -i '' 's/element = "\.\.element = jsonencode({"selector": "\.resource-cards"})"/element = "\.resource-cards"/' datadog_synthetics.tf
sed -i '' 's/element = "\.\.element = jsonencode({"selector": "\.observations-content"})"/element = "\.observations-content"/' datadog_synthetics.tf
sed -i '' 's/element = "\.\.element = jsonencode({"selector": "\.episode-content"})"/element = "\.episode-content"/' datadog_synthetics.tf
sed -i '' 's/element = jsonencode({"selector": "\.episode-content"})/element = "\.episode-content"/' datadog_synthetics.tf
sed -i '' 's/element = jsonencode({"selector": "\.episode-navigation"})/element = "\.episode-navigation"/' datadog_synthetics.tf

echo "All element selectors have been fixed in datadog_synthetics.tf"
