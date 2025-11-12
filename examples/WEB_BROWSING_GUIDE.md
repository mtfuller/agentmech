# Web Browsing with MCP Server Guide

This guide demonstrates how to use AgentMech with the Playwright MCP server to create workflows that can browse the web, extract information, and interact with websites.

## Overview

The Playwright MCP server provides browser automation capabilities through the Model Context Protocol (MCP). This allows your AI workflows to:

- Navigate to web pages
- Extract content and information from websites
- Take screenshots
- Interact with web elements (click, type, etc.)
- Analyze web page structure
- Automate web-based tasks

## Prerequisites

Before running web browsing workflows, ensure you have:

1. **Ollama installed and running**
   ```bash
   ollama serve
   ollama pull gemma3:4b
   ```

2. **AgentMech installed**
   ```bash
   npm install -g agentmech
   # Or from source: npm install && npm run build
   ```

3. **Playwright MCP server available**
   
   The Playwright MCP server will be automatically installed when you run the workflow using `npx`. No separate installation is required!

## Example Workflows

### 1. Simple Web Browse (`simple-web-browse.yaml`)

A straightforward example that demonstrates basic web browsing capabilities.

**What it does:**
- Visits example.com and extracts the page content
- Navigates to GitHub trending page and analyzes top repositories
- Summarizes the findings

**Run it:**
```bash
agentmech run examples/simple-web-browse.yaml
```

**Example output:**
```
=== Starting Workflow: Simple Web Browsing Example ===

--- State: visit_example ---
Prompt: Visit the example.com website and describe what you see...
Using model: gemma3:4b
Generating response...

Response: I've navigated to example.com. The page displays...
[AI provides detailed analysis of the website]

--- State: visit_github ---
[Continues with GitHub trending analysis]
```

### 2. Interactive Web Browsing Demo (`web-browsing-demo.yaml`)

A comprehensive interactive workflow that lets you choose different web browsing tasks.

**Features:**
- **Search**: Search for information on search engines
- **Extract**: Extract information from specific URLs
- **Navigate**: Explore and analyze websites
- **Custom**: Perform custom web browsing tasks

**Run it:**
```bash
agentmech run examples/web-browsing-demo.yaml
```

**Example interaction:**
```
--- State: choose_task ---
What would you like to do with web browsing?

Options:
- search: Search for information on a website
- extract: Extract specific information from a URL
- navigate: Navigate to a website and describe what you see
- custom: Provide a custom web browsing task

> search

--- State: search_demo ---
What would you like to search for on the web?
(Example: "latest news about AI" or "weather in San Francisco")

> latest AI developments

[Workflow performs web search and provides results]
```

## How It Works

### MCP Server Configuration

In your workflow YAML, configure the Playwright MCP server:

```yaml
mcp_servers:
  playwright:
    type: npx
    package: "@modelcontextprotocol/server-playwright"
```

This tells AgentMech to:
1. Use `npx` to run the Playwright MCP server
2. Automatically install it if not already available
3. Make browser automation tools available to the AI

### Using MCP Servers in States

Enable the Playwright MCP server for specific states:

```yaml
states:
  browse_web:
    type: "prompt"
    prompt: "Navigate to https://example.com and describe the page"
    mcp_servers: ["playwright"]  # Enable Playwright for this state
    save_as: "page_info"
    next: "next_state"
```

When `mcp_servers: ["playwright"]` is specified:
- The AI model has access to browser automation tools
- It can navigate to URLs, extract content, take screenshots, etc.
- The AI decides which tools to use based on the prompt

### Available Browser Capabilities

The Playwright MCP server provides various tools that the AI can use:

- **Navigation**: Navigate to URLs, go back/forward, reload pages
- **Content Extraction**: Get page title, text content, HTML structure
- **Screenshots**: Capture full page or element screenshots
- **Element Interaction**: Click buttons, fill forms, select options
- **Page Analysis**: Find elements, check visibility, get attributes
- **And more**: The AI can discover and use available tools as needed

## Creating Your Own Web Browsing Workflows

### Basic Template

```yaml
name: "My Web Browsing Workflow"
description: "Custom web browsing workflow"
default_model: "gemma3:4b"
start_state: "browse"

# Configure Playwright MCP server
mcp_servers:
  browser:
    type: npx
    package: "@modelcontextprotocol/server-playwright"

states:
  browse:
    type: "prompt"
    prompt: |
      Visit https://yourwebsite.com and extract:
      1. The main heading
      2. Navigation menu items
      3. Key content sections
      
      Provide a structured summary of the information.
    mcp_servers: ["browser"]
    save_as: "website_info"
    next: "end"
```

### Multi-Step Web Browsing

Chain multiple browsing tasks together:

```yaml
states:
  step1_search:
    type: "prompt"
    prompt: "Search DuckDuckGo for 'machine learning tutorials'"
    mcp_servers: ["browser"]
    save_as: "search_results"
    next: "step2_analyze"
  
  step2_analyze:
    type: "prompt"
    prompt: "Visit the first result URL and analyze the tutorial content"
    mcp_servers: ["browser"]
    save_as: "tutorial_content"
    next: "step3_summarize"
  
  step3_summarize:
    type: "prompt"
    prompt: |
      Summarize the learning path based on:
      Search results: {{search_results}}
      Tutorial content: {{tutorial_content}}
    save_as: "learning_path"
    next: "end"
```

### Interactive Web Scraping

Collect user input for dynamic web browsing:

```yaml
states:
  get_url:
    type: "input"
    prompt: "Enter a website URL to analyze:"
    save_as: "target_url"
    next: "analyze_site"
  
  analyze_site:
    type: "prompt"
    prompt: |
      Navigate to {{target_url}} and provide:
      1. Page title and description
      2. Main content sections
      3. Key features or offerings
      4. Contact information if available
    mcp_servers: ["browser"]
    save_as: "site_analysis"
    next: "end"
```

## Use Cases

### Research and Information Gathering
- Collect data from multiple websites
- Monitor trending topics or news
- Gather competitor information
- Track product prices or availability

### Content Analysis
- Analyze website structure and SEO
- Extract documentation or articles
- Compare content across multiple sites
- Verify information from different sources

### Automated Testing
- Check website availability
- Verify page content and elements
- Test user flows and navigation
- Monitor changes over time

### Data Extraction
- Extract structured data from websites
- Gather contact information
- Collect product details
- Build datasets from web sources

## Tips and Best Practices

1. **Be Specific in Prompts**: Clearly describe what information you want the AI to extract
   ```yaml
   prompt: "Visit the page and extract the article title, author, and publication date"
   ```

2. **Handle Errors Gracefully**: Use error handling for unreliable websites
   ```yaml
   on_error: "error_handler"
   ```

3. **Respect Website Terms**: Always follow website terms of service and robots.txt
   
4. **Use Variables**: Store extracted information for use in subsequent states
   ```yaml
   save_as: "extracted_data"
   # Later: {{extracted_data}}
   ```

5. **Test URLs First**: Verify URLs are accessible before creating workflows

6. **Rate Limiting**: Add delays between requests if visiting multiple pages
   ```yaml
   prompt: "Wait a few seconds, then visit the next page..."
   ```

## Troubleshooting

### Issue: MCP server not connecting

**Solution**: Ensure `npx` is available and can download packages
```bash
npx --version
```

### Issue: Browser automation fails

**Possible causes:**
- Network connectivity issues
- Website blocking automation
- Invalid URLs
- Page loading timeouts

**Solution**: Test with simple, reliable websites first (like example.com)

### Issue: AI not using browser tools

**Solution**: Make prompt more explicit about browser actions
```yaml
prompt: "Use the browser to navigate to https://example.com and extract the page title"
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [AgentMech Documentation](../README.md)
- [Custom Tools Guide](../docs/CUSTOM_TOOLS_GUIDE.md)

## Examples in Action

For more complex examples and patterns, see:
- `examples/comprehensive-mcp-integration.yaml` - Multiple MCP server integration
- `examples/research-assistant.yaml` - LLM-driven decision making
- `examples/sequential-steps-demo.yaml` - Multi-step workflows

## Contributing

Have ideas for web browsing workflow examples? Contributions are welcome! Submit a pull request with your example workflows.
