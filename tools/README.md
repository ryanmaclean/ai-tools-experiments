# AI Tools Lab MCP Servers

This directory contains the Model Context Protocol (MCP) servers for AI Tools Lab. These servers provide extended capabilities to Claude and other AI assistants through the MCP protocol.

## Setup

To set up the MCP servers, run the setup script:

```bash
# Make the setup script executable
chmod +x setup-mcp.sh

# Run the setup script
./setup-mcp.sh
```

This will:
1. Install required system dependencies (via Homebrew)
2. Set up Node.js, NPX, and UVX
3. Install Ollama for visual analysis
4. Install Node.js dependencies
5. Create a template .env file
6. Pull necessary Ollama models

## Configuration

Edit the `.env` file to configure the servers:

```ini
# Datadog API credentials
DATADOG_API_KEY=your_api_key_here
DATADOG_APP_KEY=your_app_key_here
DATADOG_SITE=us

# Ollama configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llava

# Image optimizer settings
IMAGE_OPTIMIZER_PORT=3001
MAX_IMAGE_SIZE=5000000

# Astro content manager settings
ASTRO_CONTENT_PORT=3002

# Performance analyzer settings
PERFORMANCE_PORT=3003
```

## Running the Servers

### Using npm scripts

```bash
# Start all servers
npm run start-all

# Or start individual servers
npm run start-datadog
npm run start-image
npm run start-ollama
npm run start-astro
npm run start-performance
```

### License Compatibility Checking

To ensure license compatibility across all dependencies, run the license checker:

```bash
# Make the script executable if needed
chmod +x check-licenses.sh

# Run the license compatibility check
./check-licenses.sh
```

This will:
1. Install the Datadog CLI if needed
2. Generate a JSON report of all package licenses
3. Upload the Software Bill of Materials (SBOM) to Datadog SCA
4. Create a local license-report.md with a summary of findings
5. Check for potentially incompatible licenses (GPL, AGPL, LGPL, etc.)

The detailed SCA report will be available in your Datadog dashboard under Security > Software Composition Analysis.

### Using npx or uvx (preferred for faster startup)

```bash
# Using npx
npx node datadog-server.js

# Using uvx (even faster)
uvx node image-optimizer-server.js
```

## Available Servers

### 1. Datadog Monitor (port 3000)

Integrates with Datadog API to manage synthetic tests and RUM configuration.

**Tools:**
- `get_synthetics_results`: Retrieve results from Datadog synthetic tests
- `create_synthetic_test`: Create a new synthetic test in Datadog
- `update_rum_config`: Update Real User Monitoring configuration

**Resources:**
- `datadog/synthetics/results`: Latest synthetic test results
- `datadog/rum/metrics`: Real User Monitoring metrics

### 2. Image Optimizer (port 3001)

Provides tools for optimizing and converting images.

**Tools:**
- `optimize_image`: Optimize an image file
- `convert_to_webp`: Convert image to WebP format
- `convert_to_avif`: Convert image to AVIF format
- `analyze_image_size`: Analyze an image and suggest optimal dimensions

**Resources:**
- `optimization/stats`: Statistics on image optimization

### 3. Ollama Visual Analyzer (port 11434)

Integrates with Ollama for visual analysis of screenshots and UI elements.

**Tools:**
- `compare_screenshots`: Compare two screenshots and highlight differences
- `analyze_ui_elements`: Identify and analyze UI elements in a screenshot
- `generate_visual_report`: Generate a visual comparison report

**Resources:**
- `ollama/models`: Available Ollama models for visual analysis
- `ollama/comparison/history`: History of visual comparisons

### 4. Astro Content Manager (port 3002)

Helps manage and migrate Astro content.

**Tools:**
- `html_to_collection`: Convert HTML content to Astro Content Collection format
- `generate_schema`: Generate schema for Content Collection based on content
- `validate_content`: Validate content against schema

**Resources:**
- `astro/content/stats`: Statistics on content collections

### 5. Performance Analyzer (port 3003)

Analyzes website performance.

**Tools:**
- `analyze_core_web_vitals`: Analyze Core Web Vitals metrics
- `optimize_js_bundle`: Suggest optimizations for JavaScript bundles
- `analyze_network_payload`: Analyze network payload size and suggest reductions

**Resources:**
- `performance/history`: Historical performance metrics
- `performance/recommendations`: Performance optimization recommendations

## Using with Claude/Windsurf

These servers are configured in the MCP config file at:
`../../../.codeium/windsurf/mcp_config.json`

Once the servers are running, Claude can access them through the `use_mcp_tool` and `access_mcp_resource` tools.

## Example Usage

### 1. Optimizing Images with Image Optimizer

```
<use_mcp_tool>
<server_name>image-optimizer</server_name>
<tool_name>convert_to_webp</tool_name>
<arguments>
{
  "image_path": "/Users/ryan.maclean/Documents/ai-tests/ai-tools-experiments/public/images/thumbnails/ep01.png",
  "quality": 85,
  "output_path": "/Users/ryan.maclean/Documents/ai-tests/ai-tools-experiments/public/images/thumbnails-optimized/ep01.webp"
}
</arguments>
</use_mcp_tool>
```

### 2. Visual Analysis with Ollama

```
<use_mcp_tool>
<server_name>ollama-visual-analyzer</server_name>
<tool_name>compare_screenshots</tool_name>
<arguments>
{
  "baseline_path": "/Users/ryan.maclean/Documents/ai-tests/ai-tools-experiments/tests/validation-screenshots/resources.png",
  "current_path": "/Users/ryan.maclean/Documents/ai-tests/ai-tools-experiments/tests/screenshots/resources.png",
  "threshold": 0.1,
  "output_path": "/Users/ryan.maclean/Documents/ai-tests/ai-tools-experiments/tests/visual-comparison/resources-diff.png"
}
</arguments>
</use_mcp_tool>
```

### 3. Creating a Synthetic Test with Datadog

```
<use_mcp_tool>
<server_name>datadog-monitor</server_name>
<tool_name>create_synthetic_test</tool_name>
<arguments>
{
  "name": "AI Tools Lab - Home Page",
  "type": "browser",
  "request": {
    "method": "GET",
    "url": "https://ai-tools-lab-tst.netlify.app/"
  },
  "locations": ["aws:us-west-1"],
  "message": "Test created by Claude via MCP",
  "tags": ["env:test", "application:ai-tools-lab"]
}
</arguments>
</use_mcp_tool>
```

### 4. Converting HTML to Content Collection

```
<use_mcp_tool>
<server_name>astro-content-manager</server_name>
<tool_name>html_to_collection</tool_name>
<arguments>
{
  "html_path": "/Users/ryan.maclean/Documents/ai-tests/ai-tools-experiments/src/content/transcripts/ep01.html",
  "collection_name": "transcripts",
  "output_dir": "/Users/ryan.maclean/Documents/ai-tests/ai-tools-experiments/src/content/transcripts"
}
</arguments>
</use_mcp_tool>
```

### 5. Analyzing Core Web Vitals

```
<use_mcp_tool>
<server_name>performance-analyzer</server_name>
<tool_name>analyze_core_web_vitals</tool_name>
<arguments>
{
  "url": "https://ai-tools-lab-tst.netlify.app/",
  "device": "mobile",
  "runs": 3
}
</arguments>
</use_mcp_tool>
```

### 6. Accessing Resource Data

```
<access_mcp_resource>
<server_name>performance-analyzer</server_name>
<uri>performance/recommendations</uri>
</access_mcp_resource>
```

This will return performance optimization recommendations stored in the server's resource.
