#!/bin/bash

# Fix all json.encode formatting issues in one go

# Line numbers with json.encode issues
LINES=(117 164 213 221 269 318 326)

# Loop through each line and fix it
for LINE in ${LINES[@]}; do
  echo "Fixing line $LINE"
  sed -i '' "${LINE}s/)/)\
      /" datadog_synthetics.tf
done

echo "All json.encode formatting issues fixed"
