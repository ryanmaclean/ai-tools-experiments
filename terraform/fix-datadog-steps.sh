#!/bin/bash

# Script to fix Datadog Synthetics browser test steps formatting

# Define directory and file path
DIR="$(dirname $0)"
FILE="$DIR/browser_test.tf"

# Backup the original file
cp "$FILE" "$FILE.bak"

# Replace all instances of element = with element = jsonencode
sed -i '' 's/element = "body"/element = "{\"selector\":\"body\"}"/g' "$FILE"
sed -i '' 's/element = "\.about-content"/element = "{\"selector\":\".about-content\"}"/g' "$FILE"
sed -i '' 's/element = "\.resource-cards"/element = "{\"selector\":\".resource-cards\"}"/g' "$FILE"
sed -i '' 's/element = "\.observations-content"/element = "{\"selector\":\".observations-content\"}"/g' "$FILE"

echo "Element selectors fixed in $FILE"
