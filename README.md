# AI Workflow CLI

A Node.js CLI tool for running AI workflows locally with Ollama integration. Define complex AI-powered workflows using simple YAML files and execute them with state machine logic.

## Features

- 🤖 **Ollama Integration**: Run AI workflows using local Ollama models
- 📋 **YAML-Based Workflows**: Define workflows using simple, readable YAML syntax
- 🔄 **State Machine**: Control workflow execution with state transitions
- 💬 **Interactive Choices**: Present users with choices that affect workflow direction
- 🔗 **Context Variables**: Pass data between states using variable interpolation
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
- **start_state**: The initial state to begin execution
- **states**: Object containing all workflow states

### State Types

#### 1. Prompt State
Sends a prompt to Ollama and stores the response.

```yaml
state_name:
  type: "prompt"
  prompt: "Your question or prompt here"
  model: "llama2"  # Optional, uses default_model if not specified
  save_as: "variable_name"  # Optional, saves response to context
  next: "next_state_name"  # Next state to transition to
```

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

## Example Workflows

The `examples/` directory contains sample workflows:

- **simple-qa.yaml**: Basic question-answering workflow
- **story-generator.yaml**: Interactive story generation with choices
- **code-review.yaml**: Code review assistant with different review types
- **writing-assistant.yaml**: Creative writing assistant with multiple tasks

See [USAGE.md](USAGE.md) for detailed usage examples and guides.

## Development

### Project Structure

```
ai-workflow-cli/
├── src/
│   ├── cli.js                 # CLI entry point
│   ├── ollama-client.js       # Ollama API client
│   ├── workflow-parser.js     # YAML parser and validator
│   └── workflow-executor.js   # State machine executor
├── examples/
│   ├── simple-qa.yaml
│   ├── story-generator.yaml
│   └── code-review.yaml
├── tests/
│   └── (test files)
├── package.json
└── README.md
```

### Running Tests

```bash
npm test
```

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