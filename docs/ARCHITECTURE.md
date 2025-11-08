# Architecture and Code Organization

This document describes the organization and structure of the AgentMech codebase.

## Directory Structure

The source code is organized into logical subdirectories to improve maintainability and clarity:

```
src/
├── cli/                    # CLI entry point and command definitions
│   └── cli.ts             # Main CLI application with Commander.js
├── core/                   # Core workflow functionality
│   ├── workflow-parser.ts     # YAML workflow file parsing and validation
│   ├── workflow-executor.ts   # Workflow execution engine (CLI mode)
│   └── workflow-discovery.ts  # Workflow file discovery utilities
├── integrations/          # External service integrations
│   ├── ollama-client.ts       # Ollama API client for LLM interactions
│   ├── mcp-client.ts          # Model Context Protocol client
│   ├── custom-mcp-server.ts   # Custom MCP server for tool execution
│   └── rag-service.ts         # Retrieval-Augmented Generation service
├── testing/               # Testing framework components
│   ├── test-executor.ts       # Test scenario execution engine
│   ├── test-scenario-parser.ts # Test scenario YAML parsing
│   └── test-report-generator.ts # Test result reporting
├── web/                   # Web server and UI components
│   ├── web-server.ts          # Express web server
│   └── web-workflow-executor.ts # Workflow executor for web mode
├── utils/                 # Utility modules
│   └── tracer.ts              # Observability and tracing
└── views/                 # HTML templates for web UI
    ├── index.html
    └── execution.html
```

## Module Responsibilities

### CLI (`src/cli/`)
- Command-line interface setup using Commander.js
- Entry point for all CLI commands (run, validate, serve, test, etc.)
- Orchestrates other modules based on user commands

### Core (`src/core/`)
- **workflow-parser.ts**: Parses and validates YAML workflow definitions
- **workflow-executor.ts**: Executes workflows in CLI mode with interactive stdin/stdout
- **workflow-discovery.ts**: Discovers workflow files in directories

### Integrations (`src/integrations/`)
- **ollama-client.ts**: Wrapper for Ollama API calls (chat, embeddings)
- **mcp-client.ts**: Client for connecting to MCP servers via stdio
- **custom-mcp-server.ts**: MCP server implementation for custom tools
- **rag-service.ts**: RAG functionality including document chunking, embedding, and retrieval

### Testing (`src/testing/`)
- **test-scenario-parser.ts**: Parses test scenario YAML files
- **test-executor.ts**: Executes test scenarios and validates assertions
- **test-report-generator.ts**: Generates test reports in various formats

### Web (`src/web/`)
- **web-server.ts**: Express server with REST API and UI
- **web-workflow-executor.ts**: Async workflow executor optimized for web requests with SSE

### Utils (`src/utils/`)
- **tracer.ts**: Observability, logging, and tracing functionality

## Import Patterns

All modules use relative imports following the directory structure:

```typescript
// From cli.ts
import WorkflowParser = require('../core/workflow-parser');
import OllamaClient = require('../integrations/ollama-client');

// From workflow-executor.ts (in core)
import OllamaClient = require('../integrations/ollama-client');
import Tracer = require('../utils/tracer');
```

## Build Output

The TypeScript compiler outputs to `dist/` maintaining the same directory structure:

```
dist/
├── cli/
├── core/
├── integrations/
├── testing/
├── web/
├── utils/
└── views/
```

## Benefits of This Organization

1. **Clarity**: Each directory has a clear, single responsibility
2. **Discoverability**: Easy to find related functionality
3. **Maintainability**: Changes to one concern don't affect unrelated code
4. **Scalability**: Easy to add new modules in appropriate directories
5. **Testing**: Clear boundaries make unit testing easier
6. **Onboarding**: New developers can understand the structure quickly

## Making Changes

When adding new functionality:

1. Determine which directory best fits the new code
2. If it's a new concern, consider creating a new top-level directory
3. Update imports in affected files
4. Update this documentation if adding a new directory
