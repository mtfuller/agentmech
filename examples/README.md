# AgentMech Examples

This directory contains example workflows demonstrating all features of AgentMech.

## Quick Start Examples

**New to AgentMech? Start here:**

1. **simple-qa.yaml** - Your first workflow: a simple question and answer
2. **user-input-demo.yaml** - Collect user input and generate personalized responses
3. **sequential-steps-demo.yaml** - Chain multiple prompts together in sequence

## Examples by Feature

### 📝 Basic Workflows
- **simple-qa.yaml** - Basic prompt state with AI response
- **user-input-demo.yaml** - Collecting user input with the input state
- **variables-workflow.yaml** - Variable interpolation, external variable files, and external prompt files

### 🔄 Sequential Processing
- **sequential-steps-demo.yaml** - Multiple sequential prompts within a single state
- **user-survey-steps.yaml** - Multiple sequential user inputs within a single state

### 🖼️ Multimodal (Images & Files)
- **multimodal-analysis.yaml** - Analyze images, text files, and JSON data with vision models

### 🧠 RAG (Knowledge Base)
- **multi-rag-qa.yaml** - Multiple named RAG configurations for different knowledge bases
- **custom-rag-templates.yaml** - Customize how RAG chunks are formatted and injected

### 🔌 Integrations
- **comprehensive-mcp-integration.yaml** - Model Context Protocol (MCP) server integration
- **advanced-custom-tools.yaml** - Custom JavaScript tools for data processing
- **simple-web-browse.yaml** - Web browsing with Playwright MCP server

### 🎯 Advanced Routing & Control
- **research-assistant.yaml** - Dynamic LLM-driven state routing with next_options
- **workflow-reference.yaml** + **greeting-workflow.yaml** - Compose workflows from other workflows
- **complete-story-builder.yaml** + **character-creator.yaml** - Complex workflow composition
- **mixed-fallback.yaml** - Error handling with state-level and workflow-level fallback

### 🛠️ System Features
- **run-directory-demo.yaml** - Using the {{run_directory}} variable for file operations

### 🧪 Testing
- **simple-qa.test.yaml** - Basic test scenarios with assertions
- **user-input-demo.test.yaml** - Testing workflows with user inputs
- **contains-demo.test.yaml** - Advanced assertion types (case-insensitive, regex, etc.)

## Running Examples

Run any example with:
```bash
agentmech run examples/<filename>.yaml
```

For example:
```bash
agentmech run examples/simple-qa.yaml
agentmech run examples/user-input-demo.yaml
```

## Testing Examples

Test examples with:
```bash
agentmech test examples/<test-filename>.test.yaml
```

For example:
```bash
agentmech test examples/simple-qa.test.yaml
```

## Additional Resources

- **WEB_BROWSING_GUIDE.md** - Detailed guide for web browsing workflows
- **WORKFLOW_GENERATION_GUIDE.md** - Guide for generating workflows with AI

## Feature Coverage

All AgentMech features are demonstrated:
- ✅ Basic prompt states
- ✅ Input states for user interaction
- ✅ Sequential steps (prompt and input)
- ✅ Variable interpolation ({{variable}})
- ✅ External files (variables and prompts)
- ✅ Multimodal support (images, text, JSON)
- ✅ RAG (Retrieval-Augmented Generation)
- ✅ Custom RAG templates
- ✅ MCP server integration
- ✅ Custom JavaScript tools
- ✅ Web browsing (Playwright)
- ✅ Workflow references (composition)
- ✅ Dynamic routing (next_options)
- ✅ Error handling (on_error)
- ✅ Run directory variable
- ✅ Testing framework
- ✅ Streaming responses (automatic)

## Need Help?

- See [../README.md](../README.md) for installation and quick start
- See [../docs/USAGE.md](../docs/USAGE.md) for detailed usage guide
- See individual example files for inline documentation
