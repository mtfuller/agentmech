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
- 🔍 **Observability**: Trace and log all workflow interactions with the `--trace` flag

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
ollama pull gemma3:4b
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
  -t, --trace             Enable tracing/observability for workflow execution
  -l, --log-file <path>   Path to file for logging trace events
```

Example:
```bash
ai-workflow run examples/story-generator.yaml
ai-workflow run my-workflow.yaml --ollama-url http://localhost:11434
ai-workflow run my-workflow.yaml --trace
ai-workflow run my-workflow.yaml --trace --log-file trace.log
```

#### Observability and Tracing

Use the `--trace` flag to enable detailed logging of workflow execution:

```bash
ai-workflow run examples/simple-qa.yaml --trace
```

To save trace events to a file in addition to console output, use the `--log-file` option:

```bash
ai-workflow run examples/simple-qa.yaml --trace --log-file workflow-trace.log
```

Note: If you specify `--log-file` without `--trace`, tracing will be automatically enabled.

When tracing is enabled, the CLI logs all interactions including:
- Workflow start and completion events
- State transitions and execution
- Model interactions with Ollama (prompts and responses)
- MCP server connections and operations
- Context variable updates
- User choices and selections
- Errors and their context

Trace logs include timestamps and are written in a structured format. When using `--log-file`, each workflow execution session is clearly marked with session start/end markers, and new runs append to the existing file for continuous logging.

This feature is useful for debugging workflows, understanding execution flow, monitoring AI interactions, and maintaining audit trails.

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
- **default_model**: Default Ollama model to use (e.g., "gemma3:4b", "mistral")
- **mcp_servers**: Optional MCP server configurations
- **rag**: Optional RAG (Retrieval-Augmented Generation) configuration
- **on_error**: Optional workflow-level fallback state for error handling
- **start_state**: The initial state to begin execution
- **states**: Object containing all workflow states

### RAG Configuration

You can enable Retrieval-Augmented Generation (RAG) to provide context from a knowledge base in three flexible ways:

#### 1. Default RAG (Workflow-level)
```yaml
rag:
  directory: "./knowledge-base"           # Directory containing documents
  model: "gemma3:4b"                      # Optional: Model for embeddings
  embeddingsFile: "embeddings.msgpack"    # Optional: Cache file (default: embeddings.msgpack)
  storageFormat: "msgpack"                # Optional: "msgpack" (default) or "json"
  chunkSize: 500                          # Optional: Text chunk size (default: 1000)
  topK: 3                                 # Optional: Number of chunks to retrieve (default: 3)
```

States can then use `use_rag: true` to use this default configuration.

#### 2. Named RAG Configurations
```yaml
rags:
  product_kb:
    directory: "./docs/products"
  technical_kb:
    directory: "./docs/technical"
    chunkSize: 800
    topK: 5
```

States can reference by name: `use_rag: "product_kb"`

#### 3. Inline RAG (State-level)
```yaml
states:
  my_state:
    type: "prompt"
    prompt: "Question here"
    rag:
      directory: "./specific-docs"
      chunkSize: 400
    next: "end"
```

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
  model: "gemma3:4b"  # Optional, uses default_model if not specified
  save_as: "variable_name"  # Optional, saves response to context
  mcp_servers: ["server1", "server2"]  # Optional, MCP servers for this state
  use_rag: true  # Optional: true (default RAG) or "rag_name" (named RAG)
  rag:  # Optional: inline RAG configuration
    directory: "./docs"
    chunkSize: 500
  on_error: "error_handler"  # Optional: fallback state on error
  next: "next_state_name"  # Next state to transition to
  # OR use LLM-driven state selection:
  next_options:  # Optional: let the LLM choose the next state
    - state: "state_option_1"
      description: "Description of when to choose this state"
    - state: "state_option_2"
      description: "Description of when to choose this state"
```

RAG Options:
- `use_rag: true` - Use default workflow-level RAG
- `use_rag: "name"` - Use named RAG configuration
- `rag: {...}` - Use inline RAG configuration
- Omit all - No RAG context retrieval

**LLM-Driven State Selection:**

Instead of specifying a single `next` state, you can use `next_options` to provide multiple possible next states. The LLM will analyze the prompt response and intelligently select the most appropriate next state based on the descriptions you provide. This is useful for creating adaptive workflows that can dynamically adjust based on context.

Requirements:
- `next_options` must have at least 2 options
- Each option must have a `state` (the state name) and `description` (when to choose this state)
- Cannot be used together with `next` field
- Only available for `prompt` type states

When `use_rag: true` is set, the prompt will automatically search the RAG knowledge base and append relevant context before sending to the model.
You can also load prompts from external files:

```yaml
state_name:
  type: "prompt"
  prompt_file: "prompts/my-prompt.md"  # Load prompt from external file
  model: "gemma3:4b"
  save_as: "variable_name"
  next: "next_state_name"
```

#### 2. Choice State
Presents options to the user and transitions based on selection.

```yaml
state_name:
  type: "choice"
  prompt: "Choose an option:"  # Optional
  save_as: "variable_name"  # Optional, saves choice to context
  on_error: "error_handler"  # Optional: fallback state on error
  choices:
    - label: "Option 1"
      value: "option1"
      next: "state_for_option1"
    - label: "Option 2"
      value: "option2"
      next: "state_for_option2"
  next: "default_next_state"  # Optional fallback
```

#### 3. Input State
Asks the user for freeform text input.

```yaml
state_name:
  type: "input"
  prompt: "What is your name?"  # Question to ask the user
  save_as: "variable_name"  # Optional, saves input to context
  default_value: "Default Name"  # Optional, default value if user provides no input
  next: "next_state_name"  # Next state to transition to
```

The input state allows workflows to collect freeform text from users, as opposed to the choice state which presents a fixed set of options. The collected input can be saved to a context variable and used in subsequent states via variable interpolation (e.g., `{{variable_name}}`).

#### 4. Workflow Reference State
References and includes another workflow as part of the current workflow.

```yaml
state_name:
  type: "workflow_ref"
  workflow_ref: "path/to/other-workflow.yaml"  # Path to workflow file
  next: "next_state_name"  # State to go to after referenced workflow completes
```

#### 5. End State
Terminates the workflow.

```yaml
state_name:
  type: "end"
```

### External File References

#### Prompt Files
Instead of embedding long prompts directly in your workflow YAML, you can reference external files (typically markdown files):

```yaml
states:
  generate_content:
    type: "prompt"
    prompt_file: "prompts/detailed-prompt.md"
    save_as: "content"
    next: "end"
```

The path is relative to the workflow YAML file location. This makes it easier to:
- Maintain and edit long prompts
- Reuse prompts across workflows
- Version control prompts separately
- Write prompts in markdown with formatting

#### Workflow References
You can reference and include entire workflows from other YAML files:

```yaml
states:
  run_sub_workflow:
    type: "workflow_ref"
    workflow_ref: "sub-workflows/greeting.yaml"
    next: "continue_main_flow"
  
  continue_main_flow:
    type: "prompt"
    prompt: "Continue with main workflow..."
    next: "end"
```

When a workflow is referenced:
- All states from the referenced workflow are imported
- State names are prefixed to avoid conflicts
- The referenced workflow's MCP servers are merged into the main workflow
- The workflow transitions to the referenced workflow's start state

This allows you to:
- Build modular, reusable workflow components
- Compose complex workflows from simpler ones
- Share common workflow patterns across projects
- Maintain cleaner, more organized workflow files

### Variable Interpolation

Use `{{variable_name}}` syntax to reference variables stored in context:

```yaml
generate_response:
  type: "prompt"
  prompt: "Write a {{genre}} story about {{topic}}"
  save_as: "story"
  next: "display_result"
```

### Error Handling with Fallback Flow

You can specify fallback states to handle errors gracefully at both the state level and workflow level. When an error occurs during workflow execution, the workflow will transition to the specified fallback state instead of terminating.

#### State-Level Fallback

Define an `on_error` field in a state to specify a fallback state for that specific state:

```yaml
states:
  risky_operation:
    type: "prompt"
    prompt: "This might fail"
    model: "some-model"
    on_error: "error_handler"  # State-level fallback
    next: "success_state"
  
  error_handler:
    type: "prompt"
    prompt: "Recovering from error..."
    next: "end"
  
  success_state:
    type: "prompt"
    prompt: "Operation succeeded!"
    next: "end"
```

#### Workflow-Level Fallback

Define an `on_error` field at the workflow level to apply a default fallback to all states without their own `on_error`:

```yaml
name: "Resilient Workflow"
default_model: "gemma3:4b"
on_error: "global_error_handler"  # Workflow-level fallback
start_state: "step_one"

states:
  step_one:
    type: "prompt"
    prompt: "First step"
    next: "step_two"
  
  step_two:
    type: "prompt"
    prompt: "Second step"
    next: "end"
  
  global_error_handler:
    type: "prompt"
    prompt: "An error occurred, but the workflow recovered"
    next: "end"
```

#### Fallback Priority

When an error occurs:
1. **State-level fallback** is checked first (if defined)
2. **Workflow-level fallback** is used if no state-level fallback exists
3. **Error is thrown** if no fallback is configured

```yaml
name: "Mixed Fallback Example"
on_error: "global_fallback"  # Default fallback
start_state: "normal_step"

states:
  normal_step:
    type: "prompt"
    prompt: "Normal operation"
    next: "special_step"
  
  special_step:
    type: "prompt"
    prompt: "Special operation"
    on_error: "specific_handler"  # Overrides global fallback
    next: "end"
  
  specific_handler:
    type: "prompt"
    prompt: "Handling specific error"
    next: "end"
  
  global_fallback:
    type: "prompt"
    prompt: "Handling general error"
    next: "end"
```

### Complete Example

```yaml
name: "Story Generator"
description: "Generate a custom story"
default_model: "gemma3:4b"
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
default_model: "gemma3:4b"
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

### RAG Integration Examples

#### Simple RAG Example
```yaml
name: "RAG-Powered Q&A"
description: "Answer questions using RAG to provide context from a knowledge base"
default_model: "gemma3:4b"
start_state: "ask_question"

# Configure default RAG
rag:
  directory: "./examples/knowledge-base"
  model: "gemma3:4b"
  embeddingsFile: "embeddings.msgpack"
  storageFormat: "msgpack"
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

#### Multiple Named RAG Example
```yaml
name: "Multi-KB System"
default_model: "gemma3:4b"
start_state: "choose"

# Multiple named RAG configurations
rags:
  product_kb:
    directory: "./docs/products"
  technical_kb:
    directory: "./docs/technical"
    chunkSize: 800

states:
  choose:
    type: "choice"
    choices:
      - label: "Product Question"
        next: "product_q"
      - label: "Technical Question"
        next: "tech_q"
  
  product_q:
    type: "prompt"
    prompt: "What are the features?"
    use_rag: "product_kb"  # Use specific RAG
    next: "end"
  
  tech_q:
    type: "prompt"
    prompt: "How to install?"
    use_rag: "technical_kb"  # Use different RAG
    next: "end"
  
  end:
    type: "end"
```

### LLM-Driven State Selection Example

Use `next_options` to let the LLM intelligently choose the next state based on context:

```yaml
name: "Research Assistant"
description: "LLM decides the best research path"
default_model: "gemma3:4b"
start_state: "research_topic"

states:
  research_topic:
    type: "prompt"
    prompt: "I need to research artificial intelligence in healthcare. What should I focus on?"
    save_as: "research_focus"
    next_options:
      - state: "search_web"
        description: "The research requires current information from the web"
      - state: "plan_research"
        description: "The research requires a structured research plan first"
  
  search_web:
    type: "prompt"
    prompt: "Search for the latest information on AI in healthcare. Focus: {{research_focus}}"
    save_as: "web_findings"
    next: "analyze_findings"
  
  plan_research:
    type: "prompt"
    prompt: "Create a detailed research plan. Focus: {{research_focus}}"
    save_as: "research_plan"
    next: "analyze_findings"
  
  analyze_findings:
    type: "prompt"
    prompt: "Analyze the research findings and create a summary."
    save_as: "analysis"
    next: "end"
  
  end:
    type: "end"
```

In this example, the LLM analyzes the research focus response and autonomously decides whether to search the web first or create a research plan, making the workflow more adaptive and intelligent.

## Example Workflows

The `examples/` directory contains sample workflows:

- **simple-qa.yaml**: Basic question-answering workflow
- **story-generator.yaml**: Interactive story generation with choices
- **user-input-demo.yaml**: Demonstrates the input state for collecting user information
- **code-review.yaml**: Code review assistant with different review types
- **writing-assistant.yaml**: Creative writing assistant with multiple tasks
- **mcp-integration.yaml**: Demonstrates MCP server integration with filesystem and memory servers
- **rag-qa.yaml**: RAG-powered Q&A with knowledge base retrieval
- **multi-rag-qa.yaml**: Multiple named RAG configurations
- **inline-rag.yaml**: Inline state-level RAG configuration
- **external-prompt-file.yaml**: Example using external markdown file for prompts
- **greeting-workflow.yaml**: Simple reusable greeting workflow
- **workflow-reference.yaml**: Example of referencing another workflow
- **state-level-fallback.yaml**: Demonstrates state-level error handling with fallback states
- **workflow-level-fallback.yaml**: Demonstrates workflow-level error handling
- **mixed-fallback.yaml**: Shows both state-level and workflow-level fallback priorities
- **llm-routing-simple.yaml**: Simple example of LLM-driven state selection
- **research-assistant.yaml**: Advanced research workflow with LLM-driven routing

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
ollama pull gemma3:4b
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