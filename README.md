# AgentMech

A Node.js CLI tool for running AI workflows locally with Ollama. Define complex AI-powered workflows using simple YAML files and execute them with state machine logic.

## Features

- ✨ **Guided Workflow Generation**: Create workflows with AI-powered template selection and customization
- 🎭 **Multi-Workflow Orchestration**: Coordinate multiple workflows to create sophisticated multi-agent systems
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

# Orchestrate multiple workflows
agentmech orchestrate <orchestration.yaml> [--trace] [--log-file path]

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

**Workflow (sequential steps):**
```yaml
name: "Workflow Name"
description: "Optional description"
type: "workflow"
default_model: "gemma3:4b"

# Optional: Define variables for use in prompts
variables:
  my_var: "value"

steps:
  - type: "prompt"
    prompt: "First step question"
    save_as: "result1"
  - type: "prompt"
    prompt: "Second step using {{result1}}"
    save_as: "result2"
```

**Agent (state machine with transitions):**
```yaml
name: "Agent Name"
description: "Optional description"
type: "agent"
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

### Workflow vs Agent

AgentMech supports two execution models:

**Workflow** (`type: "workflow"`)
- **Linear and deterministic**: Executes steps in a predefined sequence
- **Uses**: `steps` array - each step executes sequentially
- **Conditional branching**: Workflows can branch to different steps using `next_step` or `next_step_options`
- **Best for**: Structured tasks with clear, sequential steps
- **Use when**: You need predictable, repeatable execution

**Agent** (`type: "agent"`)
- **Long-running and adaptable**: Operates in a precept-actuator loop
- **Uses**: `states` object with `start_state` - agent decides which state to transition to
- **Best for**: Dynamic tasks requiring intelligent decision-making
- **Use when**: The system needs to adapt based on changing conditions

The `type` field is optional but recommended for clarity. When omitted, the system determines the type based on whether `steps` or `states` is present. See `examples/workflow-example.yaml`, `examples/conditional-workflow.yaml`, and `examples/agent-example.yaml` for complete examples.

### Workflow Conditional Branching

Workflows support conditional branching to allow non-linear execution:

**Direct Jump** - Jump to a specific step:
```yaml
steps:
  - type: "prompt"
    prompt: "Check if user is premium"
    save_as: "is_premium"
    next_step: 2  # Skip step 1, jump to step 2
  - type: "prompt"
    prompt: "This step is skipped"
  - type: "prompt"
    prompt: "Continue here"
```

**LLM-Driven Branching** - Let the LLM decide which step to execute:
```yaml
steps:
  - type: "prompt"
    prompt: "Analyze the customer request type"
    save_as: "request_type"
    next_step_options:
      - step: 1
        description: "Request is about billing"
      - step: 2
        description: "Request is technical support"
      - step: 3
        description: "Request is general inquiry"
  - type: "prompt"
    prompt: "Handle billing request"
  - type: "prompt"
    prompt: "Handle technical request"
  - type: "prompt"
    prompt: "Handle general inquiry"
```

See `examples/conditional-workflow.yaml` for a complete example.

### State Types (for Agents)

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
# NEW! Simplified tools format (recommended)
tools:
  filesystem:
    npm_package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
  custom_tools:
    file_path: "examples/custom-tools"

# Legacy format (still supported)
mcp_servers:
  filesystem:
    type: npx
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
  custom_tools:
    type: custom-tools
    tools_directory: "examples/custom-tools"
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

## Workflow Orchestration

Orchestrate multiple workflows to create complex multi-agent systems that work together autonomously:

```bash
agentmech orchestrate orchestration.yaml [--trace]
```

### Orchestration YAML Format

Define how multiple workflows coordinate to accomplish complex tasks:

```yaml
name: "Multi-Agent Research Pipeline"
description: "Coordinate research, analysis, and writing agents"
default_model: "gemma3:4b"
strategy: "sequential"  # or "parallel", "conditional"

# Shared context available to all workflows
shared_context:
  topic: "artificial intelligence"
  output_format: "blog post"

workflows:
  - id: "research"
    workflow: "research-workflow.yaml"
    description: "Gather information"
    save_as: "research_findings"
    timeout: 300  # Optional timeout in seconds
    on_error: "fail"  # or "continue", "fallback"
  
  - id: "analyze"
    workflow: "analysis-workflow.yaml"
    description: "Analyze findings"
    depends_on: ["research"]  # Wait for research to complete
    variables:
      data: "{{research_findings}}"
    save_as: "analysis"
  
  - id: "write"
    workflow: "writing-workflow.yaml"
    description: "Create final output"
    depends_on: ["analyze"]
    variables:
      content: "{{analysis}}"
    save_as: "final_output"

# How to combine results
result_aggregation: "merge"  # or "last", "custom"
```

### Execution Strategies

**Sequential** - Execute workflows one after another
- Workflows run in order
- Each workflow can use results from previous workflows
- Failures stop the orchestration (unless `on_error: continue`)

**Parallel** - Execute workflows simultaneously
- All workflows start at the same time
- Faster execution for independent tasks
- Results are collected when all complete

**Conditional** - Execute workflows based on conditions
- Workflows run when their conditions are met
- Supports complex dependency chains
- Dynamic execution based on runtime context

```yaml
strategy: "conditional"
workflows:
  - id: "check"
    workflow: "checker.yaml"
    save_as: "status"
  
  - id: "process_success"
    workflow: "success-handler.yaml"
    depends_on: ["check"]
    condition:
      variable: "status"
      operator: "equals"
      value: "success"
  
  - id: "process_failure"
    workflow: "failure-handler.yaml"
    depends_on: ["check"]
    condition:
      variable: "status"
      operator: "equals"
      value: "failure"
```

**Condition operators:** `equals`, `not_equals`, `contains`, `not_contains`, `exists`, `not_exists`

### Result Aggregation

Control how results from multiple workflows are combined:

**merge** - Combine all workflow results and shared context
```yaml
result_aggregation: "merge"
```

**last** - Use only the last workflow's result
```yaml
result_aggregation: "last"
```

**custom** - Use an LLM to synthesize results
```yaml
result_aggregation: "custom"
aggregation_prompt: |
  Synthesize these perspectives into a comprehensive summary:
  {{results}}
aggregation_model: "gemma3:4b"
```

### Error Handling

Configure how orchestration handles workflow failures:

```yaml
workflows:
  - id: "risky_task"
    workflow: "task.yaml"
    on_error: "fallback"
    fallback_workflow: "backup-task.yaml"
```

Options: `fail` (stop orchestration), `continue` (skip and continue), `fallback` (use backup workflow)

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

**Basic Workflows:**
- **simple-qa.yaml** - Basic Q&A workflow
- **sequential-steps-demo.yaml** - Sequential prompts with steps feature
- **user-survey-steps.yaml** - Multiple user inputs with steps

**Advanced Features:**
- **image-analysis.yaml** - Analyze images with vision models
- **multi-rag-qa.yaml** - RAG with multiple knowledge bases
- **research-assistant.yaml** - LLM-driven state routing
- **comprehensive-mcp-integration.yaml** - MCP server integration
- **complete-story-builder.yaml** - Workflow composition

**Web Browsing:**
- **simple-web-browse.yaml** - Web browsing with Playwright MCP server
- **web-browsing-demo.yaml** - Interactive web browsing workflow

**Orchestration (Multi-Agent):**
- **orchestration-sequential.yaml** - Sequential research and writing pipeline
- **orchestration-parallel.yaml** - Parallel multi-perspective analysis
- **orchestration-conditional.yaml** - Conditional workflow execution

**Testing:**
- **user-input-demo.test.yaml** - Test scenarios

See [examples/](examples/), [examples/WEB_BROWSING_GUIDE.md](examples/WEB_BROWSING_GUIDE.md), and [docs/USAGE.md](docs/USAGE.md) for more.

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Code organization and structure
- [USAGE.md](docs/USAGE.md) - Detailed usage examples
- [ORCHESTRATION_GUIDE.md](docs/ORCHESTRATION_GUIDE.md) - Multi-workflow orchestration guide
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