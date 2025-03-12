# AI Lab Experiments & Related Tools
Collection of AI related tools to investigate.

- [Recording 1](ep01.md) - [Gradio](https://gradio.app)
- [Recording 2](ep02.md) - [Warp Terminal (for Windows)](https://www.warp.dev/blog/launching-warp-on-windows) AI Agent using Anthropic's Claude Sonnet 3.7 + [Cursor](https://www.cursor.com/)
- [Recording 3](ep03.md) - [Automatic1111]

## GitHub Pages Website

This repository has been converted to a GitHub Pages website. You can visit the website to view the content in a more user-friendly format.

### Setting Up GitHub Pages with Datadog Logging

Due to browser CORS restrictions, the feedback form with Datadog integration requires a server-side component. We use Netlify to host both the website and a serverless function that acts as a proxy to Datadog.

#### Setting up with Netlify

1. Fork or clone this repository to your GitHub account

2. Connect your GitHub repository to Netlify:
   - Sign up for a free Netlify account if you don't have one
   - Click "New site from Git" and select your repository
   - Configure the build settings (leave build command empty, publish directory should be ".")
   - Deploy the site

3. Set up the Datadog API keys in Netlify:
   - Go to Site settings > Environment variables
   - Add the following environment variables:
     - `DD_API_KEY`: Your Datadog API key
     - `DD_APP_KEY`: Your Datadog Application key

4. After deploying, the feedback form will send data to Datadog through the Netlify serverless function proxy.

### Local Development

To test the website locally:

1. Clone the repository
2. If you have Node.js installed, you can use a local server:
   ```
   npx http-server
   ```
3. Open your browser to the local server URL (typically http://localhost:8080)
4. Note that the feedback form will run in "development mode" locally, which means it won't actually send data to Datadog.

### Troubleshooting the Datadog Integration

If logs aren't appearing in Datadog:

1. Check the Netlify function logs:
   - Go to your Netlify dashboard > Your site > Functions
   - Look at the logs for the "datadog-proxy" function

2. Verify that your Datadog API keys have the correct permissions:
   - API key should have "Logs Write" permission
   - App key should have appropriate permissions

3. Open your browser console when submitting the form to see detailed logs on the request and response.

## Jason's List of Tools To Explore

### 1. AI-Powered Coding Assistants & Developer Tools
- [Claude Code](https://github.com/anthropics/claude-code) - Anthropic's latest AI-powered code editor (from a CLI app)
- [OpenRouter](https://openrouter.ai/) – API routing for AI models, allowing access to various AI models via a single interface.
- [Web Dev Arena](https://web.lmarena.ai/) – AI-powered development environment.
- [LMArena.ai](https://lmarena.ai) – AI benchmarking and development tool.
- [Tabnine](https://www.tabnine.com/) – AI-powered autocomplete for software development.
- [Codeium](https://www.codeium.com/) – AI-driven coding assistant with free access for developers.
- [Replit Ghostwriter](https://replit.com/site/ghostwriter) – AI coding assistant built into the Replit platform.
- [CodiumAI](https://www.codium.ai/) – AI for generating test cases and improving code quality.

---

### 2. AI Model Benchmarking & Optimization
- [LlamaBench](https://github.com/ggerganov/llama.cpp/blob/master/examples/llama-bench/README.md) – A benchmarking tool for evaluating Llama-based AI models.
- [LiveBench.ai](https://livebench.ai) – Real-time AI model performance benchmarking.

---

### 3. AI Workflow Automation & Agents
- [FloWise.AI](https://flowiseai.com/) – No-code/low-code tool for AI workflow automation.
- [MindPal AI](https://mindpal.space/) – AI-powered automation similar to Zapier, facilitating AI agent workflows.
- [Jina.ai](https://jina.ai) – AI-powered search and multimodal application framework.
- [AgentGPT](https://agentgpt.reworkd.ai/) – Deploy and run autonomous AI agents in a browser.

---

### 4. AI-Powered Research & Knowledge Management
- [Elicit](https://elicit.com/?redirected=true) – AI-powered research assistant for literature review and data extraction.
- [MyMemo](https://mymemo.ai/) – AI-enhanced note-taking and memory management tool.
- [Napkin.ai](https://www.napkin.ai/) – AI-assisted tool for organizing ideas and creative thought processes.
- [SciSpace](https://typeset.io/) – AI-powered research assistant for academic papers and literature review.
- [Consensus](https://consensus.app/) – AI search engine that finds research-backed answers.
- [Semantic Scholar](https://www.semanticscholar.org/) – AI-driven search and recommendation engine for academic research.

---

### 5. AI Chatbots & Conversational Models
- [Claude](https://claude.ai/login?returnTo=%2F%3F) – AI chatbot developed by Anthropic.
- [Abacus.ai](https://abacus.ai/) – AI platform for enterprise-level applications, including conversational AI and predictive analytics.
- [Pi AI](https://heypi.com/) – AI chatbot designed for friendly and engaging conversations.
- [YouChat](https://you.com/chat) – AI conversational assistant with web search capabilities.

---

### 6. AI Content & Detection Tools
- [Zerogpt.com](https://zerogpt.com) – AI-generated content detection.
- [Loudly](https://www.loudly.com/) – AI-powered music generation tool, with genres including Lo-Fi and Bluegrass.
- [GPTZero](https://gptzero.me/) – AI detection tool for identifying AI-generated content.
- [DeepAI Text Generator](https://deepai.org/machine-learning-model/text-generator) – AI-powered text generation tool.
- [Runway ML](https://runwayml.com/) – AI-powered video and content generation platform.
- [Boomy](https://boomy.com/) – AI-generated music creation tool, enabling users to create and release songs.

---

### 7. AI Tools for SRE & DevOps Engineers
- [Monitaur](https://monitaur.ai/) – AI-powered reliability and compliance monitoring for machine learning in production.