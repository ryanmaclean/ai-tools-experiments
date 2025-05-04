#!/bin/bash
# check-licenses.sh - Check license compatibility of packages using Datadog SCA

echo "=== Checking License Compatibility with Datadog SCA ==="
echo ""

# Check if Datadog CLI is installed
if ! command -v datadog-ci &> /dev/null; then
    echo "Datadog CLI not found. Installing Datadog CLI..."
    npm install -g @datadog/datadog-ci
else
    echo "✅ Datadog CLI is installed"
fi

# Check environment variables
if [ -z "$DATADOG_API_KEY" ] || [ -z "$DATADOG_APP_KEY" ]; then
    if [ -f .env ]; then
        echo "Loading Datadog credentials from .env file..."
        export $(grep -v '^#' .env | grep 'DATADOG_' | xargs)
    else
        echo "❌ Datadog API keys not found. Please set DATADOG_API_KEY and DATADOG_APP_KEY environment variables or create .env file."
        exit 1
    fi
fi

# Create a temporary directory for scanning
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Run npm license checker and save results
echo "Generating package license information..."
npx license-checker --json --out $TEMP_DIR/licenses.json

# Run Datadog SCA
echo "Running Datadog SCA analysis..."
datadog-ci sbom upload --file $TEMP_DIR/licenses.json --service ai-tools-lab --source npm

# Generate a license compatibility report
echo "Generating license compatibility report..."
echo "--------------------------------------" > license-report.md
echo "# License Compatibility Report" >> license-report.md
echo "Generated on $(date)" >> license-report.md
echo "" >> license-report.md
echo "## Summary" >> license-report.md

# Parse license-checker output to create report
echo "Analyzing licenses..."
node -e "
const fs = require('fs');
const licenses = require('$TEMP_DIR/licenses.json');

// Count license types
const licenseCount = {};
for (const pkg in licenses) {
  const license = licenses[pkg].licenses;
  if (!licenseCount[license]) {
    licenseCount[license] = 0;
  }
  licenseCount[license]++;
}

// Check for potentially incompatible licenses
const cautionLicenses = ['GPL', 'AGPL', 'LGPL', 'CDDL', 'MPL'];
const incompatiblePackages = [];

for (const pkg in licenses) {
  const license = licenses[pkg].licenses;
  if (cautionLicenses.some(l => license.includes(l))) {
    incompatiblePackages.push({ name: pkg, license });
  }
}

// Write summary
fs.appendFileSync('license-report.md', 
  '- Total packages: ' + Object.keys(licenses).length + '\\n' +
  '- License types: ' + Object.keys(licenseCount).length + '\\n' +
  '- Potentially incompatible licenses: ' + incompatiblePackages.length + '\\n\\n'
);

// Write license distribution
fs.appendFileSync('license-report.md', '## License Distribution\\n\\n');
for (const [license, count] of Object.entries(licenseCount).sort((a, b) => b[1] - a[1])) {
  fs.appendFileSync('license-report.md', 
    '- ' + license + ': ' + count + ' packages\\n'
  );
}

// Write potentially incompatible packages
if (incompatiblePackages.length > 0) {
  fs.appendFileSync('license-report.md', '\\n## Potentially Incompatible Packages\\n\\n');
  fs.appendFileSync('license-report.md', 'These packages may have license terms that require careful review:\\n\\n');
  
  for (const pkg of incompatiblePackages) {
    fs.appendFileSync('license-report.md', 
      '- ' + pkg.name + ' (' + pkg.license + ')\\n'
    );
  }

  fs.appendFileSync('license-report.md', '\\n⚠️ Review these packages for compliance with your project\\'s licensing requirements.\\n');
} else {
  fs.appendFileSync('license-report.md', '\\n✅ No potentially incompatible licenses detected.\\n');
}

// Add Datadog SCA integration note
fs.appendFileSync('license-report.md', '\\n## Datadog SCA Integration\\n\\n');
fs.appendFileSync('license-report.md', 'A detailed Software Composition Analysis has been uploaded to Datadog. View the complete report in your Datadog dashboard under Security > Software Composition Analysis.\\n');
" 2>/dev/null || echo "❌ Error generating report"

# Display report
echo ""
echo "License compatibility report generated: license-report.md"
echo ""
echo "Full SCA report available in your Datadog dashboard under:"
echo "Security > Software Composition Analysis > ai-tools-lab"
echo ""
echo "=== License Check Complete ==="
