#!/bin/bash
# setup-mcp.sh - Install and configure MCP servers for AI Tools Lab

echo "=== Setting up MCP servers for AI Tools Lab ==="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✅ Homebrew is installed"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js via Homebrew..."
    brew install node
else
    echo "✅ Node.js is installed ($(node -v))"
fi

# Check if NPX is available
if ! command -v npx &> /dev/null; then
    echo "NPX not found. Installing latest npm..."
    brew install npm
else
    echo "✅ NPX is installed ($(npx --version))"
fi

# Check if UVX is available (faster npm alternative)
if ! command -v uvx &> /dev/null; then
    echo "UVX not found. Installing uv..."
    brew install uv
    echo "📝 Make sure to add 'alias uvx=\"uv x\"' to your shell profile for convenience"
else
    echo "✅ UVX is available"
fi

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama not found. Installing Ollama..."
    brew install ollama
else
    echo "✅ Ollama is installed ($(ollama --version))"
fi

# Install Sharp globally (for image processing)
echo "Installing Sharp globally..."
npm install -g sharp

# Install dependencies for MCP servers
echo "Installing node dependencies for MCP servers..."
cd "$(dirname "$0")" # Make sure we're in the tools directory
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
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
EOF
    echo "✅ Created .env file template. Please update it with your actual credentials."
else
    echo "✅ .env file already exists"
fi

# Pull Ollama model for visual analysis
echo "Pulling Ollama model for visual analysis..."
ollama pull llava

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To start all MCP servers, run:"
echo "  cd tools && npm run start-all"
echo ""
echo "Or start individual servers with:"
echo "  npm run start-datadog"
echo "  npm run start-image"
echo "  npm run start-ollama"
echo "  npm run start-astro"
echo "  npm run start-performance"
echo ""
echo "You can also use NPX or UVX to run servers directly:"
echo "  npx node datadog-server.js"
echo "  uvx node image-optimizer-server.js"
echo ""
echo "Make sure to update .env with your actual API credentials before starting servers."
