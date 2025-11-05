# AI Workflow CLI

A Node.js CLI tool for running AI workflows locally with Ollama integration. Define complex AI-powered workflows using simple YAML files and execute them with state machine logic.

## Features

- 🌐 **Web UI**: Browse and manage workflows through a beautiful web interface
- 🤖 **Ollama Integration**: Run AI workflows using local Ollama models
- 🔌 **MCP Server Integration**: Connect to Model Context Protocol (MCP) servers for extended capabilities
- 📋 **YAML-Based Workflows**: Define workflows using simple, readable YAML syntax
- 🔄 **State Machine**: Control workflow execution with state transitions
- 💬 **Interactive Choices**: Present users with choices that affect workflow direction
- 🔗 **Context Variables**: Pass data between states using variable interpolation
- 🧠 **RAG Support**: Retrieval-Augmented Generation for context-aware responses
- ✅ **Validation**: Validate workflow files before execution

## Prerequisites

- Node.js (v14 or higher)
- [Ollama](https://ollama.ai/) installed and running locally

## Installation

```bash
# Clone the repository
git clone https://github.com/mtfuller/ai-workflow-cli.git
cd ai-workflow-cli

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Make CLI executable (optional)
npm link
```

## Quick Start

1. **Start Ollama** (in a separate terminal):
```bash
ollama serve
```

2. **Pull a model** (if you haven't already):
```bash
ollama pull llama2
```

3. **Run an example workflow**:
```bash
npm start run examples/simple-qa.yaml
```

Or if you've linked the CLI:
```bash
ai-workflow run examples/simple-qa.yaml
```

## Usage

### Serve Web UI

Start a web interface to browse and manage workflows:

```bash
ai-workflow serve [workflow-dir] [options]

Arguments:
  workflow-dir            Directory containing workflow files (default: "./examples")

Options:
  -p, --port <port>       Port to run the web server on (default: "3000")
  -u, --ollama-url <url>  Ollama API URL (default: "http://localhost:11434")
```

Example:
```bash
ai-workflow serve examples
ai-workflow serve ./my-workflows --port 8080
```

The web UI provides:
- 📋 Browse all available workflows in a directory
- 🔍 View detailed workflow information
- ✅ Validate workflow files automatically
- 🎨 Beautiful, responsive interface

### Run a Workflow

```bash
ai-workflow run <workflow-file> [options]

Options:
  -u, --ollama-url <url>  Ollama API URL (default: "http://localhost:11434")
```

Example:
```bash
ai-workflow run examples/story-generator.yaml
ai-workflow run my-workflow.yaml --ollama-url http://localhost:11434
```

### Validate a Workflow

```bash
ai-workflow validate <workflow-file>
```

Example:
```bash
ai-workflow validate examples/story-generator.yaml
```

### List Available Models

```bash
ai-workflow list-models [options]

Options:
  -u, --ollama-url <url>  Ollama API URL (default: "http://localhost:11434")
```

Example:
```bash
ai-workflow list-models
```

## Workflow YAML Format

A workflow file consists of:

- **name**: Workflow name
- **description**: Optional workflow description
- **default_model**: Default Ollama model to use (e.g., "llama2", "mistral")
- **mcp_servers**: Optional MCP server configurations
- **rag**: Optional RAG (Retrieval-Augmented Generation) configuration
- **start_state**: The initial state to begin execution
- **states**: Object containing all workflow states

### RAG Configuration

You can enable Retrieval-Augmented Generation (RAG) to provide context from a knowledge base:

```yaml
rag:
  directory: "./knowledge-base"  # Directory containing documents
  model: "llama2"                # Optional: Model for embeddings (default: workflow default_model)
  embeddingsFile: "embeddings.json"  # Optional: Embeddings cache file (default: embeddings.json)
  chunkSize: 500                 # Optional: Text chunk size (default: 1000)
  topK: 3                        # Optional: Number of chunks to retrieve (default: 3)
```

When RAG is configured, states can use `use_rag: true` to automatically retrieve and include relevant context from the knowledge base in their prompts.

### MCP Server Configuration

You can configure Model Context Protocol (MCP) servers to extend workflow capabilities with tools and resources:

```yaml
mcp_servers:
  server_name:
    command: "npx"  # Command to start the server
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]  # Optional arguments
    env:  # Optional environment variables
      MCP_LOG_LEVEL: "info"
```

### State Types

#### 1. Prompt State
Sends a prompt to Ollama and stores the response.

```yaml
state_name:
  type: "prompt"
  prompt: "Your question or prompt here"
  model: "llama2"  # Optional, uses default_model if not specified
  save_as: "variable_name"  # Optional, saves response to context
  mcp_servers: ["server1", "server2"]  # Optional, MCP servers for this state
  use_rag: true  # Optional, enable RAG context retrieval for this prompt
  next: "next_state_name"  # Next state to transition to
```

When `use_rag: true` is set, the prompt will automatically search the RAG knowledge base and append relevant context before sending to the model.

#### 2. Choice State
Presents options to the user and transitions based on selection.

```yaml
state_name:
  type: "choice"
  prompt: "Choose an option:"  # Optional
  save_as: "variable_name"  # Optional, saves choice to context
  choices:
    - label: "Option 1"
      value: "option1"
      next: "state_for_option1"
    - label: "Option 2"
      value: "option2"
      next: "state_for_option2"
  next: "default_next_state"  # Optional fallback
```

#### 3. End State
Terminates the workflow.

```yaml
state_name:
  type: "end"
```

### Variable Interpolation

Use `{{variable_name}}` syntax to reference variables stored in context:

```yaml
generate_response:
  type: "prompt"
  prompt: "Write a {{genre}} story about {{topic}}"
  save_as: "story"
  next: "display_result"
```

### Complete Example

```yaml
name: "Story Generator"
description: "Generate a custom story"
default_model: "llama2"
start_state: "choose_genre"

states:
  choose_genre:
    type: "choice"
    prompt: "Select a genre:"
    save_as: "genre"
    choices:
      - label: "Science Fiction"
        value: "science fiction"
        next: "generate_story"
      - label: "Fantasy"
        value: "fantasy"
        next: "generate_story"
  
  generate_story:
    type: "prompt"
    prompt: "Write a short {{genre}} story"
    save_as: "story"
    next: "end"
  
  end:
    type: "end"
```

### MCP Integration Example

```yaml
name: "MCP Integration Example"
description: "A workflow demonstrating MCP server integration"
default_model: "llama2"
start_state: "analyze"

mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  memory:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-memory"]

states:
  analyze:
    type: "prompt"
    prompt: "Analyze the filesystem and store insights"
    mcp_servers: ["filesystem", "memory"]
    next: "end"
  
  end:
    type: "end"
```

### RAG Integration Example

```yaml
name: "RAG-Powered Q&A"
description: "Answer questions using RAG to provide context from a knowledge base"
default_model: "llama2"
start_state: "ask_question"

# Configure RAG with a knowledge base directory
rag:
  directory: "./examples/knowledge-base"
  model: "llama2"
  embeddingsFile: "embeddings.json"
  chunkSize: 500
  topK: 3

states:
  ask_question:
    type: "choice"
    prompt: "What would you like to know?"
    save_as: "question"
    choices:
      - label: "How do I install this tool?"
        value: "How do I install and set up this tool?"
        next: "answer_with_rag"
      - label: "What are the features?"
        value: "What are the main features?"
        next: "answer_with_rag"
  
  answer_with_rag:
    type: "prompt"
    prompt: "{{question}}"
    use_rag: true  # Enable RAG context retrieval
    save_as: "answer"
    next: "end"
  
  end:
    type: "end"
```

## Example Workflows

The `examples/` directory contains sample workflows:

- **simple-qa.yaml**: Basic question-answering workflow
- **story-generator.yaml**: Interactive story generation with choices
- **code-review.yaml**: Code review assistant with different review types
- **writing-assistant.yaml**: Creative writing assistant with multiple tasks
- **mcp-integration.yaml**: Demonstrates MCP server integration with filesystem and memory servers
- **rag-qa.yaml**: RAG-powered Q&A with knowledge base retrieval

See [USAGE.md](USAGE.md) for detailed usage examples and guides.

## Development

This project is written in TypeScript and compiled to JavaScript.

### Project Structure

```
ai-workflow-cli/
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── ollama-client.ts       # Ollama API client
│   ├── mcp-client.ts          # MCP server client
│   ├── workflow-parser.ts     # YAML parser and validator
│   └── workflow-executor.ts   # State machine executor
├── dist/                      # Compiled JavaScript output
├── examples/
│   ├── simple-qa.yaml
│   ├── story-generator.yaml
│   └── code-review.yaml
├── tests/
│   └── (test files)
├── tsconfig.json              # TypeScript configuration
├── package.json
└── README.md
```

### Building from Source

```bash
# Build TypeScript code
npm run build

# The compiled JavaScript will be output to the dist/ directory
```

### Running Tests

```bash
npm test
```

The test command automatically builds the TypeScript code before running tests.

## Troubleshooting

### "Cannot connect to Ollama"

Make sure Ollama is running:
```bash
ollama serve
```

### "Model not found"

Pull the model first:
```bash
ollama pull llama2
# or
ollama pull mistral
```

### "Workflow file not found"

Ensure you're providing the correct path to your YAML file:
```bash
ai-workflow run /full/path/to/workflow.yaml
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC