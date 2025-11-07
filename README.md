# AI Workflow CLI

A Node.js CLI tool for running AI workflows locally with Ollama integration. Define complex AI-powered workflows using simple YAML files and execute them with state machine logic.

## Features

- ✨ **AI-Powered Generation**: Create workflows from natural language descriptions
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
- 🧪 **Testing**: Define and run automated test scenarios to validate workflow behavior

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

### Generate a Workflow

Create a new workflow YAML file by describing what you want in natural language:

```bash
ai-workflow generate [options]

Options:
  -u, --ollama-url <url>  Ollama API URL (default: "http://localhost:11434")
  -o, --output <path>     Output file path for the generated workflow
  -m, --model <model>     Model to use for generation (default: "gemma3:4b")
```

Example:
```bash
ai-workflow generate
ai-workflow generate --output my-workflow.yaml
ai-workflow generate --model mistral
```

When you run this command, you'll be prompted to describe the workflow you want to create. The AI will generate a complete workflow YAML file based on your description, which you can then customize and run.

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
ai-workflow run examples/complete-story-builder.yaml
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

### Test a Workflow

Run automated tests against a workflow to verify it performs as expected:

```bash
ai-workflow test <test-file> [options]

Options:
  -u, --ollama-url <url>  Ollama API URL (default: "http://localhost:11434")
  -o, --output <path>     Path to save test report (for json/markdown formats)
  -f, --format <format>   Report format: console, json, or markdown (default: "console")
```

Example:
```bash
ai-workflow test examples/user-input-demo.test.yaml
ai-workflow test examples/simple-qa.test.yaml --format json --output report.json
ai-workflow test examples/user-input-demo.test.yaml --format markdown --output report.md
```

Test files define scenarios with mocked inputs and assertions to validate workflow behavior. The test command:
- Executes workflows with predefined inputs
- Evaluates assertions against workflow outputs
- Generates detailed test reports
- Exits with code 0 if all tests pass, 1 if any fail

See the [Test Scenarios](#test-scenarios) section for details on creating test files.

### Validate a Workflow

```bash
ai-workflow validate <workflow-file>
```

Example:
```bash
ai-workflow validate examples/complete-story-builder.yaml
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

- **name** (required): Workflow name
- **description** (optional): Workflow description
- **default_model** (optional): Default Ollama model to use (e.g., "gemma3:4b", "mistral")
- **mcp_servers** (optional): MCP server configurations
- **rag** (optional): Default RAG (Retrieval-Augmented Generation) configuration
- **rags** (optional): Named RAG configurations
- **on_error** (optional): Workflow-level fallback state for error handling
- **start_state** (required): The initial state to begin execution
- **states** (required): Object containing all workflow states

### RAG Configuration

You can enable Retrieval-Augmented Generation (RAG) to provide context from a knowledge base in three flexible ways:

#### 1. Default RAG (Workflow-level)
```yaml
rag:
  directory: "./knowledge-base"              # Required: Directory containing documents
  model: "gemma3:4b"                         # Optional: Model for embeddings
  embeddings_file: "embeddings.msgpack"      # Optional: Cache file (default: embeddings.msgpack)
  storage_format: "msgpack"                  # Optional: "msgpack" (default) or "json"
  chunk_size: 500                            # Optional: Text chunk size (default: 1000)
  top_k: 3                                   # Optional: Number of chunks to retrieve (default: 3)
```

States can then use `use_rag: true` to use this default configuration.

**Note:** The old camelCase field names (`embeddingsFile`, `storageFormat`, `chunkSize`, `topK`) are still supported but deprecated. Please use the snake_case versions.

#### 2. Named RAG Configurations
```yaml
rags:
  product_kb:
    directory: "./docs/products"
  technical_kb:
    directory: "./docs/technical"
    chunk_size: 800
    top_k: 5
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
      chunk_size: 400
    next: "end"
```

### MCP Server Configuration

You can configure Model Context Protocol (MCP) servers to extend workflow capabilities with tools and resources. There are two ways to configure MCP servers:

#### Standard Configuration (Full Control)

Use the standard format when you need complete control over the command and arguments:

```yaml
mcp_servers:
  server_name:
    command: "npx"  # Command to start the server
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]  # Optional arguments
    env:  # Optional environment variables
      MCP_LOG_LEVEL: "info"
```

#### Simplified NPX Configuration

For NPX-based MCP servers, use the simplified `type: npx` format to automatically handle NPX invocation:

```yaml
mcp_servers:
  filesystem:
    type: npx
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]  # Additional arguments after the package name
    env:
      MCP_LOG_LEVEL: "info"
```

This automatically expands to `npx -y @modelcontextprotocol/server-filesystem /tmp`.

#### Simplified Custom Tools Configuration

For custom JavaScript tools, use the simplified `type: custom-tools` format:

```yaml
mcp_servers:
  custom_tools:
    type: custom-tools
    toolsDirectory: "examples/custom-tools"
```

This automatically resolves to `node dist/custom-mcp-server.js <resolved-path-to-tools-directory>`.

#### Custom JavaScript Tools

You can create your own custom tools as JavaScript functions and use them in workflows:

Then create JavaScript files in the tools directory:

```javascript
// calculator.js
function calculator(args) {
  const { operation, a, b } = args;
  switch (operation) {
    case 'add': return { result: a + b };
    case 'multiply': return { result: a * b };
    // ... more operations
  }
}

calculator.description = 'Performs arithmetic operations';
calculator.inputSchema = {
  type: 'object',
  properties: {
    operation: { type: 'string', enum: ['add', 'multiply'] },
    a: { type: 'number' },
    b: { type: 'number' },
  },
  required: ['operation', 'a', 'b'],
};

module.exports = calculator;
```

See [CUSTOM_TOOLS_GUIDE.md](CUSTOM_TOOLS_GUIDE.md) for detailed documentation on creating custom tools.

### State Types

The workflow engine supports the following state types:

#### 1. Prompt State
Sends a prompt to Ollama and stores the response.

```yaml
state_name:
  type: "prompt"                               # Required
  prompt: "Your question or prompt here"       # Required (or use prompt_file)
  prompt_file: "prompts/my-prompt.md"          # Optional: Load prompt from file (mutually exclusive with prompt)
  model: "gemma3:4b"                           # Optional: Override default_model
  save_as: "variable_name"                     # Optional: Save response to context
  mcp_servers: ["server1", "server2"]          # Optional: MCP servers for this state
  use_rag: true                                # Optional: true (default RAG) or "rag_name" (named RAG)
  rag:                                         # Optional: Inline RAG configuration
    directory: "./docs"
    chunk_size: 500
  on_error: "error_handler"                    # Optional: Fallback state on error
  next: "next_state_name"                      # Required (or use next_options)
  # OR use LLM-driven state selection:
  next_options:                                # Optional: Let the LLM choose the next state
    - state: "state_option_1"
      description: "Description of when to choose this state"
    - state: "state_option_2"
      description: "Description of when to choose this state"
```

**RAG Options:**
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

#### 2. Input State
Asks the user for freeform text input.

```yaml
state_name:
  type: "input"                                # Required
  prompt: "What is your name?"                 # Required: Question to ask the user
  save_as: "variable_name"                     # Optional: Save input to context
  default_value: "Default Name"                # Optional: Default value if user provides no input
  next: "next_state_name"                      # Required: Next state to transition to
```

The input state allows workflows to collect freeform text from users. The collected input can be saved to a context variable and used in subsequent states via variable interpolation (e.g., `{{variable_name}}`).

**Note:** For presenting a menu of choices to users, use an `input` state combined with `next_options` in a subsequent `prompt` state to route based on the user's choice.

#### 3. Workflow Reference State
References and includes another workflow as part of the current workflow.

```yaml
state_name:
  type: "workflow_ref"                         # Required
  workflow_ref: "path/to/other-workflow.yaml"  # Required: Path to workflow file
  next: "next_state_name"                      # Required: State to go to after referenced workflow completes
```

### Reserved State Names

The following state names are reserved and have special meaning:

- **`end`**: Reserved termination state. Automatically ends the workflow. Do not define this state explicitly in your workflow.

### Ending a Workflow

To end a workflow, simply set `next: "end"` in any state. The "end" state is a reserved state name and does not need to be explicitly defined. When the workflow reaches "end", it will automatically terminate.

```yaml
states:
  final_step:
    type: "prompt"
    prompt: "This is the final step"
    next: "end"  # Workflow will terminate here
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
start_state: "get_genre"

states:
  get_genre:
    type: "input"
    prompt: "What genre would you like? (e.g., science fiction, fantasy)"
    save_as: "genre"
    next: "generate_story"
  
  generate_story:
    type: "prompt"
    prompt: "Write a short {{genre}} story"
    save_as: "story"
    next: "end"
```

### MCP Integration Example

Using the simplified NPX configuration:

```yaml
name: "MCP Integration Example"
description: "A workflow demonstrating simplified MCP server integration"
default_model: "gemma3:4b"
start_state: "analyze"

mcp_servers:
  filesystem:
    type: npx
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
  memory:
    type: npx
    package: "@modelcontextprotocol/server-memory"

states:
  analyze:
    type: "prompt"
    prompt: "Analyze the filesystem and store insights"
    mcp_servers: ["filesystem", "memory"]
    next: "end"
```

Or using the standard configuration (for backward compatibility):

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
  embeddings_file: "embeddings.msgpack"
  storage_format: "msgpack"
  chunk_size: 500
  top_k: 3

states:
  ask_question:
    type: "input"
    prompt: "What would you like to know?"
    save_as: "question"
    next: "answer_with_rag"
  
  answer_with_rag:
    type: "prompt"
    prompt: "{{question}}"
    use_rag: true  # Enable RAG context retrieval
    save_as: "answer"
    next: "end"
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
    chunk_size: 800

states:
  choose:
    type: "input"
    prompt: "Would you like to ask a product or technical question?"
    save_as: "question_type"
    next: "route_question"
  
  route_question:
    type: "prompt"
    prompt: "Routing to appropriate knowledge base based on: {{question_type}}"
    next_options:
      - state: "product_q"
        description: "Question is about products or features"
      - state: "tech_q"
        description: "Question is technical or implementation-related"
  
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
```

In this example, the LLM analyzes the research focus response and autonomously decides whether to search the web first or create a research plan, making the workflow more adaptive and intelligent.

## Test Scenarios

Test scenarios allow you to validate that workflows behave as expected by running them with predefined inputs and checking assertions against the outputs.

### Test Scenario YAML Format

A test scenario file consists of:

- **workflow**: Path to the workflow file to test (relative to test file location)
- **test_scenarios**: Array of test scenarios

Each test scenario contains:

- **name**: Test scenario name (required)
- **description**: Optional description of what the test validates
- **inputs**: Array of mocked inputs for `input` states
  - **state**: Name of the state where input should be provided
  - **value**: Value to provide as input
- **assertions**: Array of assertions to validate workflow behavior (at least one required)
  - **type**: Assertion type (see below)
  - **target**: Variable name to check (for most assertion types)
  - **value**: Expected value or pattern
  - **description**: Optional description of what this assertion validates

### Assertion Types

- **`state_reached`**: Verifies that a specific state was reached during execution
  - Requires: `value` (state name)
  - Example: `{ type: "state_reached", value: "end" }`

- **`equals`**: Checks if a variable exactly matches an expected value
  - Requires: `target` (variable name), `value` (expected value)
  - Example: `{ type: "equals", target: "name", value: "Alice" }`

- **`contains`**: Checks if a variable contains a substring
  - Requires: `target` (variable name), `value` (expected substring)
  - Example: `{ type: "contains", target: "response", value: "artificial intelligence" }`

- **`not_contains`**: Checks if a variable does NOT contain a substring
  - Requires: `target` (variable name), `value` (unexpected substring)
  - Example: `{ type: "not_contains", target: "answer", value: "error" }`

- **`regex`**: Checks if a variable matches a regular expression pattern
  - Requires: `target` (variable name), `value` (regex pattern)
  - Example: `{ type: "regex", target: "email", value: "^[a-z]+@[a-z]+\\.[a-z]+$" }`

### Test Scenario Example

```yaml
# user-input-demo.test.yaml
workflow: user-input-demo.yaml

test_scenarios:
  - name: "Complete User Flow"
    description: "Test complete workflow with user inputs and AI response"
    inputs:
      - state: "get_name"
        value: "Alice"
      - state: "get_location"
        value: "San Francisco"
      - state: "get_interest"
        value: "machine learning"
    assertions:
      - type: "state_reached"
        value: "end"
        description: "Workflow should complete successfully"
      - type: "equals"
        target: "name"
        value: "Alice"
        description: "Name should be saved correctly"
      - type: "contains"
        target: "response"
        value: "machine learning"
        description: "Response should mention the topic"

  - name: "Default Value Test"
    description: "Test that default value is used when no location is provided"
    inputs:
      - state: "get_name"
        value: "Bob"
      - state: "get_location"
        value: ""
      - state: "get_interest"
        value: "astronomy"
    assertions:
      - type: "equals"
        target: "location"
        value: "Earth"
        description: "Should use default location value"
```

### Running Tests

Run tests using the `test` command:

```bash
# Run tests with console output
ai-workflow test examples/user-input-demo.test.yaml

# Generate JSON report
ai-workflow test examples/simple-qa.test.yaml --format json --output report.json

# Generate Markdown report
ai-workflow test examples/user-input-demo.test.yaml --format markdown --output report.md
```

The test command will:
1. Execute each test scenario with the provided inputs
2. Evaluate all assertions
3. Generate a test report showing pass/fail status
4. Exit with code 0 if all tests pass, 1 if any fail

### Test Report Formats

**Console** (default): Displays test results in the terminal with color-coded pass/fail indicators and detailed assertion messages.

**JSON**: Generates a structured JSON file with complete test results, suitable for integration with CI/CD pipelines.

**Markdown**: Creates a formatted markdown report that can be included in documentation or pull requests.

## Example Workflows

The `examples/` directory contains sample workflows organized by feature:

### Basic Examples
- **simple-qa.yaml**: Basic question-answering workflow - great for getting started
- **user-input-demo.yaml**: Demonstrates the input state for collecting user information

### MCP Integration Examples
- **comprehensive-mcp-integration.yaml**: Complete guide to all MCP server configuration methods (standard, NPX simplified, and custom-tools)
- **advanced-custom-tools.yaml**: Advanced workflow using custom JavaScript tools for data processing

### RAG (Retrieval-Augmented Generation) Examples
- **multi-rag-qa.yaml**: Comprehensive example showing all three RAG approaches (default, named, and inline configurations)

### Advanced Features
- **research-assistant.yaml**: Advanced research workflow with LLM-driven state routing
- **mixed-fallback.yaml**: Demonstrates both state-level and workflow-level error handling
- **writing-assistant.yaml**: Creative writing assistant with multiple tasks
- **code-review.yaml**: Code review assistant with different review types

### Workflow Composition Examples
- **complete-story-builder.yaml**: Demonstrates workflow composition using workflow_ref
- **character-creator.yaml**: Character creation workflow (used by complete-story-builder.yaml)
- **greeting-workflow.yaml**: Simple reusable greeting workflow (used by workflow-reference.yaml)
- **workflow-reference.yaml**: Example of referencing another workflow
- **external-prompt-file.yaml**: Example using external markdown file for prompts

### Custom Tools Examples

The `examples/custom-tools/` directory contains example JavaScript tool implementations:

- **calculator.js**: Basic arithmetic operations
- **text-transform.js**: Text manipulation utilities
- **date-time.js**: Date and time utilities

### Test Scenario Files

- **simple-qa.test.yaml**: Test scenarios for simple Q&A workflow
- **user-input-demo.test.yaml**: Test scenarios demonstrating input mocking and assertions

See [USAGE.md](USAGE.md) for detailed usage examples and guides.

## Development

This project is written in TypeScript and compiled to JavaScript.

### Project Structure

The source code is organized into logical subdirectories for improved maintainability:

```
ai-workflow-cli/
├── src/
│   ├── cli/                    # CLI entry point and commands
│   ├── core/                   # Core workflow logic (parser, executor, discovery)
│   ├── integrations/           # External service integrations (Ollama, MCP, RAG)
│   ├── testing/                # Test framework components
│   ├── web/                    # Web server and UI
│   ├── utils/                  # Utilities (tracer)
│   └── views/                  # HTML templates
├── dist/                       # Compiled JavaScript output
├── examples/                   # Example workflow files
│   ├── simple-qa.yaml
│   ├── complete-story-builder.yaml
│   └── code-review.yaml
├── tests/                      # Test files
├── tsconfig.json               # TypeScript configuration
├── package.json
├── ARCHITECTURE.md             # Detailed architecture documentation
└── README.md
```

For a detailed explanation of the code organization and module responsibilities, see [ARCHITECTURE.md](ARCHITECTURE.md).

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