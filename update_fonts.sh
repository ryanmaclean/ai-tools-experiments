#!/bin/bash

# Update font imports
find /home/jhand/dev/ai-tools-experiments/pages -name "*.html" -type f -exec sed -i 's/<link href="https:\/\/fonts.googleapis.com\/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">.*<link href="https:\/\/fonts.googleapis.com\/css2?family=Revalia&display=swap" rel="stylesheet">/<\!-- Using fonts defined in main styles.css -->/' {} \;

# Also match the variant where both are on one line with &family=Revalia
find /home/jhand/dev/ai-tools-experiments/pages -name "*.html" -type f -exec sed -i 's/<link href="https:\/\/fonts.googleapis.com\/css2?family=Inter:wght@400;500;600;700&family=Revalia&display=swap" rel="stylesheet">/<\!-- Using fonts defined in main styles.css -->/' {} \;

# Update font-family declarations
find /home/jhand/dev/ai-tools-experiments/pages -name "*.html" -type f -exec sed -i 's/font-family: '\''Revalia'\'', cursive;/\/* Using font-family defined in main styles.css *\//' {} \;

# Update any inline font-family with "Inter"
find /home/jhand/dev/ai-tools-experiments/pages -name "*.html" -type f -exec sed -i 's/font-family: '\''Inter'\'', sans-serif;/font-family: var(--main-font);/' {} \;

echo "Font updates completed."