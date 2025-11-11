# AgentMech

A Node.js CLI tool for running AI workflows locally with Ollama. Define complex AI-powered workflows using simple YAML files and execute them with state machine logic.

## Features

- ✨ **AI-Powered Generation**: Create workflows from natural language descriptions
- 🌐 **Web UI**: Browse and manage workflows through a web interface
- 🤖 **Ollama Integration**: Run AI workflows using local Ollama models with streaming support
- ⚡ **Real-time Streaming**: See LLM responses token-by-token as they're generated
- 🖼️ **Multimodal Support**: Process images and text files in your workflows
- 🔌 **MCP Integration**: Connect to Model Context Protocol servers for extended capabilities
- 🧠 **RAG Support**: Retrieval-Augmented Generation for context-aware responses
- 🔍 **Observability**: Trace and log workflow interactions
- 🧪 **Testing**: Automated test scenarios to validate workflow behavior

## Prerequisites

- Node.js (v14 or higher)
- [Ollama](https://ollama.ai/) installed and running

## Quick Start

```bash
# Install
git clone https://github.com/mtfuller/agentmech.git
cd agentmech
npm install && npm run build

# Start Ollama (separate terminal)
ollama serve
ollama pull gemma3:4b

# Run a workflow
npm start run examples/simple-qa.yaml
```

## Commands

```bash
# Generate workflow from description
agentmech generate [-o output.yaml] [-m model]

# Run workflow
agentmech run <workflow.yaml> [--trace] [--log-file path]

# Test workflow
agentmech test <test.yaml> [--format json|markdown] [--output path]

# Validate workflow
agentmech validate <workflow.yaml>

# Start web UI
agentmech serve [workflow-dir] [-p port]

# List Ollama models
agentmech list-models
```

Each execution creates a unique run directory at `~/.agentmech/runs/<workflow>-<timestamp>/` containing logs and generated files. Use `--trace` for detailed execution logging.

## Workflow YAML Format

### Basic Structure

```yaml
name: "Workflow Name"
description: "Optional description"
default_model: "gemma3:4b"
start_state: "first_state"

states:
  first_state:
    type: "prompt"
    prompt: "Your question here"
    save_as: "result"
    next: "end"
```

### State Types

**Prompt State** - Send prompts to AI models
```yaml
analyze:
  type: "prompt"
  prompt: "Analyze this data"
  model: "gemma3:4b"              # Optional: Override default
  files: ["image.png", "data.txt"] # Optional: Multimodal inputs
  save_as: "result"
  next: "next_state"
```

**Input State** - Collect user input
```yaml
get_name:
  type: "input"
  prompt: "What's your name?"
  save_as: "name"
  default_value: "Guest"
  next: "greet"
```

**Workflow Reference** - Include another workflow
```yaml
sub_task:
  type: "workflow_ref"
  workflow_ref: "path/to/other.yaml"
  next: "continue"
```

### Advanced Features

**MCP Servers** - Extend with Model Context Protocol
```yaml
mcp_servers:
  filesystem:
    type: npx
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
  custom_tools:
    type: custom-tools
    toolsDirectory: "examples/custom-tools"
```

**RAG (Retrieval-Augmented Generation)** - Add knowledge base context
```yaml
rag:
  testing:
    directory: "./knowledge-base"
    chunk_size: 500
    top_k: 3

states:
  answer:
    type: "prompt"
    prompt: "{{question}}"
    use_rag: "testing"  # Uses RAG context
    next: "end"
```

**Error Handling** - Graceful fallbacks
```yaml
on_error: "error_handler"  # Workflow-level

states:
  risky:
    type: "prompt"
    prompt: "..."
    on_error: "specific_handler"  # State-level
    next: "success"
```

**Dynamic Routing** - LLM chooses next state
```yaml
analyze:
  type: "prompt"
  prompt: "Analyze: {{input}}"
  next_options:
    - state: "deep_dive"
      description: "Needs detailed analysis"
    - state: "quick_summary"
      description: "Simple summary sufficient"
```

### Variable Interpolation

Use `{{variable_name}}` to reference context variables. Built-in variables include `{{run_directory}}` for the current execution directory.

### Multimodal Support

Attach files to prompts for image and document analysis:
```yaml
analyze:
  type: "prompt"
  prompt: "What's in these files?"
  model: "llava"  # Use vision models for images
  files: ["image.png", "data.txt", "{{run_directory}}/output.json"]
  next: "end"
```

Supported: Images (`.jpg`, `.png`, etc.), text files (`.txt`, `.md`, `.json`, `.yaml`, `.csv`)

## Testing

Create test files to validate workflow behavior with mocked inputs and assertions:

```yaml
workflow: user-input-demo.yaml
test_scenarios:
  - name: "User Flow Test"
    inputs:
      - state: "get_name"
        value: "Alice"
    assertions:
      - type: "equals"
        target: "name"
        value: "Alice"
      - type: "contains"
        target: "response"
        value: "Alice"
      - type: "state_reached"
        value: "end"
```

**Assertion types:** `equals`, `contains`, `not_contains`, `regex`, `state_reached`

Run tests: `agentmech test workflow.test.yaml [--format json|markdown] [--output report.json]`

## Examples

Browse the `examples/` directory for sample workflows:
- **simple-qa.yaml** - Basic Q&A workflow
- **image-analysis.yaml** - Analyze images with vision models
- **multi-rag-qa.yaml** - RAG with multiple knowledge bases
- **research-assistant.yaml** - LLM-driven state routing
- **comprehensive-mcp-integration.yaml** - MCP server integration
- **complete-story-builder.yaml** - Workflow composition
- **user-input-demo.test.yaml** - Test scenarios

See [examples/](examples/) and [docs/USAGE.md](docs/USAGE.md) for more.

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Code organization and structure
- [USAGE.md](docs/USAGE.md) - Detailed usage examples
- [STREAMING.md](docs/STREAMING.md) - Streaming responses guide
- [CUSTOM_TOOLS_GUIDE.md](docs/CUSTOM_TOOLS_GUIDE.md) - Creating custom tools
- [RAG_GUIDE.md](docs/RAG_GUIDE.md) - RAG implementation details

## Troubleshooting

**Cannot connect to Ollama** - Ensure `ollama serve` is running  
**Model not found** - Run `ollama pull <model-name>` first  
**Workflow file not found** - Check file path is correct

## Contributing

Contributions welcome! Submit a Pull Request.

## License

ISC