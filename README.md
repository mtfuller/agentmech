# AgentMech

A Node.js CLI tool for running AI workflows locally with Ollama. Define complex AI-powered workflows using simple YAML files and execute them with state machine logic.

## Features

- ✨ **Guided Workflow Generation**: Create workflows with AI-powered template selection and customization
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

## Installation

### From NPM (Recommended)

```bash
npm install -g @agentmech/agentmech
```

### From Source

```bash
git clone https://github.com/mtfuller/agentmech.git
cd agentmech
npm install && npm run build
```

## Quick Start

```bash
# Start Ollama (separate terminal)
ollama serve
ollama pull gemma3:4b

# Generate a custom workflow
agentmech generate

# Run a workflow
agentmech run examples/simple-qa.yaml
```

## Commands

```bash
# Generate workflow with guided template selection
agentmech generate [-o output.yaml] [-m model]

# Run workflow
agentmech run <workflow.yaml> [--trace] [--log-file path]

# Test workflow
agentmech test <test.yaml> [--format json|markdown] [--output path] [--iterations N]

# Validate workflow
agentmech validate <workflow.yaml>

# Start web UI
agentmech serve [workflow-dir] [-p port]

# List Ollama models
agentmech list-models
```

Each execution creates a unique run directory at `~/.agentmech/runs/<workflow>-<timestamp>/` containing logs and generated files. Use `--trace` for detailed execution logging.

## Workflow Generation

The `generate` command provides an interactive, guided workflow creation experience:

```bash
agentmech generate [-o output.yaml] [-m model]
```

### How It Works

1. **Describe Your Goal**: Tell AgentMech what you're trying to accomplish
2. **AI Recommendations**: The LLM analyzes your goal and recommends suitable workflow templates
3. **Choose a Template**: Select from 2-3 recommended workflow patterns:
   - **Simple Q&A** - For straightforward questions and information lookup
   - **User Input Conversation** - For interactive workflows that collect user input
   - **Sequential Analysis** - For complex tasks requiring multiple processing steps
   - **Content Generator** - For creative content generation with iterative refinement
   - **Research Assistant** - For research tasks with intelligent decision-making
4. **Customize**: Answer template-specific questions to personalize your workflow
5. **Validate**: The generated workflow is automatically validated before saving

### Example Session

```
$ agentmech generate

AI Workflow Generator

Let's create a workflow tailored to your needs!

What are you trying to accomplish with this workflow? I want to analyze customer feedback

Analyzing your goal and finding the best workflow patterns...

Found matching workflow patterns!

Select a workflow template:

1. Sequential Analysis
   Multi-step workflow with progressive analysis
   Use case: Best for complex tasks that require multiple AI processing steps

2. User Input Conversation
   Collect user input and generate personalized responses
   Use case: Best for interactive workflows that need to gather information

Select a template (1-2): 1

What would you like to name this workflow? (default: Sequential Analysis Workflow):
Customer Feedback Analyzer
...
```

## Workflow YAML Format

### Basic Structure

```yaml
name: "Workflow Name"
description: "Optional description"
default_model: "gemma3:4b"
start_state: "first_state"

# Optional: Define variables for use in prompts
variables:
  my_var: "value"

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

**Sequential Steps** - Execute multiple prompts in sequence within one state
```yaml
story_creation:
  type: "prompt"
  steps:
    - prompt: "Generate a character name"
      save_as: "name"
    - prompt: "Describe {{name}}'s personality"
      save_as: "description"
    - prompt: "Write a story about {{name}}: {{description}}"
      save_as: "story"
  next: "next_state"
```

Steps can also be used with `input` states to collect multiple user inputs sequentially. Each step can have its own `prompt`, `save_as`, `model`, and other properties that override state-level settings.

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
    # NEW: Customize how chunks are injected
    chunk_template: "{{number}}. {{chunk.text}}"
    context_template: "Context:\n{{chunks}}\n\nQuery: {{prompt}}"

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

Use `{{variable_name}}` to reference variables in prompts and file paths.

**Define workflow-level variables:**
```yaml
variables:
  # Inline value (shorthand)
  user_name: "Alice"
  
  # Inline value (object syntax)
  topic:
    value: "artificial intelligence"
  
  # Load from file
  system_prompt:
    file: "prompts/template.txt"

states:
  greet:
    type: "prompt"
    prompt: "{{system_prompt}}\n\nHello {{user_name}}! Let's discuss {{topic}}."
    save_as: "response"
    next: "end"
```

**Built-in variables:**
- `{{run_directory}}` - Current execution directory

**Runtime variables:**
Variables saved with `save_as` can be used in subsequent states and will override workflow-level variables with the same name.

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

### Basic Test Scenario

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

### Multiple Iterations with Aggregated Results

Run tests multiple times to verify consistency and get aggregated statistics:

```yaml
workflow: user-input-demo.yaml
iterations: 5  # Run all scenarios 5 times

test_scenarios:
  - name: "Consistency Test"
    iterations: 10  # Override global iterations for this scenario
    inputs:
      - state: "get_name"
        value: "Bob"
    assertions:
      - type: "state_reached"
        value: "end"
```

Aggregated reports show success rate, average/min/max duration, and per-iteration results.

### LLM-Generated User Inputs

Let an LLM generate realistic test inputs instead of pre-defining them:

```yaml
workflow: user-input-demo.yaml
test_scenarios:
  - name: "LLM-Generated Inputs"
    llm_input_generation:
      enabled: true
      model: "gemma3:4b"  # Optional: Override default model
      context: "Generate realistic user inputs for a tech-savvy professional"
    assertions:
      - type: "state_reached"
        value: "end"
      - type: "contains"
        target: "response"
        value: "{{name}}"
```

You can combine LLM generation with iterations to test with varying data:

```yaml
workflow: user-input-demo.yaml
test_scenarios:
  - name: "Varied Input Testing"
    iterations: 3
    llm_input_generation:
      enabled: true
      context: "Generate diverse user profiles with different backgrounds"
    assertions:
      - type: "state_reached"
        value: "end"
```

**Assertion types:** `equals`, `contains`, `not_contains`, `regex`, `state_reached`

**Run tests:** 
```bash
# Basic test
agentmech test workflow.test.yaml

# With multiple iterations (overrides YAML iterations)
agentmech test workflow.test.yaml --iterations 10

# With output formats
agentmech test workflow.test.yaml --format json --output report.json
agentmech test workflow.test.yaml --format markdown --output report.md
```

## Examples

Browse the `examples/` directory for sample workflows:
- **simple-qa.yaml** - Basic Q&A workflow
- **sequential-steps-demo.yaml** - Sequential prompts with steps feature
- **user-survey-steps.yaml** - Multiple user inputs with steps
- **image-analysis.yaml** - Analyze images with vision models
- **multi-rag-qa.yaml** - RAG with multiple knowledge bases
- **research-assistant.yaml** - LLM-driven state routing
- **comprehensive-mcp-integration.yaml** - MCP server integration
- **simple-web-browse.yaml** - Web browsing with Playwright MCP server
- **web-browsing-demo.yaml** - Interactive web browsing workflow
- **complete-story-builder.yaml** - Workflow composition
- **user-input-demo.test.yaml** - Test scenarios

See [examples/](examples/), [examples/WEB_BROWSING_GUIDE.md](examples/WEB_BROWSING_GUIDE.md), and [docs/USAGE.md](docs/USAGE.md) for more.

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Code organization and structure
- [USAGE.md](docs/USAGE.md) - Detailed usage examples
- [STREAMING.md](docs/STREAMING.md) - Streaming responses guide
- [CUSTOM_TOOLS_GUIDE.md](docs/CUSTOM_TOOLS_GUIDE.md) - Creating custom tools
- [RAG_GUIDE.md](docs/RAG_GUIDE.md) - RAG implementation details
- [PUBLISHING.md](docs/PUBLISHING.md) - NPM publishing and release process

## Troubleshooting

**Cannot connect to Ollama** - Ensure `ollama serve` is running  
**Model not found** - Run `ollama pull <model-name>` first  
**Workflow file not found** - Check file path is correct

## Contributing

Contributions welcome! Submit a Pull Request.

## License

ISC