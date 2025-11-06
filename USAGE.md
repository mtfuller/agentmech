# Usage Guide

This guide demonstrates how to use the AI Workflow CLI tool with practical examples.

## Setup

1. **Install Ollama**
   Visit https://ollama.ai/ and install Ollama for your platform.

2. **Start Ollama**
   ```bash
   ollama serve
   ```

3. **Pull a Model**
   ```bash
   ollama pull llama2
   # or
   ollama pull mistral
   ```

4. **Install Dependencies**
   ```bash
   cd ai-workflow-cli
   npm install
   ```

## Basic Commands

### Start Web UI

Launch a web interface to browse and manage workflows:

```bash
npm start serve
# or with a custom directory
npm start serve ./my-workflows
# or with a custom port
npm start serve examples -- --port 8080
```

The web UI provides:
- Browse all available workflows in a directory
- View detailed workflow information
- Validate workflows automatically
- Beautiful, responsive interface

Open your browser to `http://localhost:3000` (or the port you specified).

### Check Available Models

Before running workflows, check what models are available:

```bash
npm start list-models
```

Example output:
```
Fetching available models...

Available models:
  - llama2:latest (3.83 GB)
  - mistral:latest (4.11 GB)
```

### Validate a Workflow

Before running a workflow, validate it to catch errors early:

```bash
npm start validate examples/simple-qa.yaml
```

Example output:
```
Validating workflow: /path/to/examples/simple-qa.yaml

✓ Workflow is valid!
  Name: Simple Q&A Workflow
  States: 2
  Start state: ask_question
```

### Run a Workflow

Execute a workflow file:

```bash
npm start run examples/simple-qa.yaml
```

Example output:
```
Loading workflow from: /path/to/examples/simple-qa.yaml
Workflow "Simple Q&A Workflow" loaded successfully

=== Starting Workflow: Simple Q&A Workflow ===

Ask Ollama a question and get an answer

--- State: ask_question ---

Prompt: What is artificial intelligence and how does it work?
Using model: llama2

Generating response...

Response: Artificial intelligence (AI) refers to the development of computer systems...

=== Workflow Completed ===
```

## Example Workflows

### 1. Simple Q&A (examples/simple-qa.yaml)

The simplest workflow - just asks Ollama a question.

**Run it:**
```bash
npm start run examples/simple-qa.yaml
```

**What it does:**
- Sends a predefined question to Ollama
- Displays the response
- Ends

### 2. Story Generator (examples/story-generator.yaml)

An interactive workflow that generates custom stories based on user choices.

**Run it:**
```bash
npm start run examples/story-generator.yaml
```

**What it does:**
1. Asks you to choose a story genre (Sci-Fi, Fantasy, Mystery, Romance)
2. Asks you to choose a setting (Distant planet, Medieval castle, Modern city, Enchanted forest)
3. Generates a short story based on your choices
4. Asks if you want to continue the story
5. If yes, generates a continuation with a plot twist

**Example interaction:**
```
--- State: choose_genre ---

What genre of story would you like?

Choices:
  1. Science Fiction
  2. Fantasy
  3. Mystery
  4. Romance

Select an option (enter number): 1

Selected: Science Fiction

--- State: choose_setting ---

Where should the story take place?

Choices:
  1. A distant planet
  2. Medieval castle
  3. Modern city
  4. Enchanted forest

Select an option (enter number): 1

Selected: A distant planet

--- State: generate_story ---

Prompt: Write a short science fiction story set in a distant planet. Keep it under 200 words.
Using model: llama2

Generating response...

Response: [AI-generated story appears here]

--- State: ask_continue ---

Would you like to continue the story?

Choices:
  1. Yes, continue the story
  2. No, end here

Select an option (enter number): 2

Selected: No, end here

=== Workflow Completed ===
```

### 3. Code Review Assistant (examples/code-review.yaml)

A workflow that performs different types of code reviews.

**Run it:**
```bash
npm start run examples/code-review.yaml
```

**What it does:**
1. Presents three review types: Security, Performance, Best Practices
2. Reviews example code based on your selection
3. Asks if you want another review
4. Loops back or ends based on your choice

**Example interaction:**
```
--- State: choose_review_type ---

What type of code review would you like?

Choices:
  1. Security Review
  2. Performance Review
  3. Best Practices Review

Select an option (enter number): 1

Selected: Security Review

--- State: security_review ---

Prompt: Review the following code for security vulnerabilities...
Using model: llama2

Generating response...

Response: [AI-generated security analysis appears here]

--- State: ask_another ---

Would you like to perform another review?

Choices:
  1. Yes
  2. No

Select an option (enter number): 2

Selected: No

=== Workflow Completed ===
```

## Creating Your Own Workflows

### Basic Structure

Create a YAML file with the following structure:

```yaml
name: "Your Workflow Name"
description: "Optional description"
default_model: "llama2"
start_state: "first_state"

states:
  first_state:
    type: "prompt"  # or "choice" or "end"
    # ... state configuration
    next: "second_state"
  
  second_state:
    # ... more states
    next: "end"
  
  end:
    type: "end"
```

### State Types Reference

#### Prompt State
Sends a prompt to Ollama:

```yaml
my_prompt_state:
  type: "prompt"
  prompt: "Your question here"
  model: "llama2"  # optional, uses default_model if not set
  save_as: "variable_name"  # optional, saves response for later use
  mcp_servers: ["server1"]  # optional, MCP servers to connect for this state
  next: "next_state"  # or "end"
```
  next: "next_state"  # or "end"
```

#### Choice State
Presents options to the user:

```yaml
my_choice_state:
  type: "choice"
  prompt: "Choose an option:"  # optional
  save_as: "user_choice"  # optional
  choices:
    - label: "First Option"
      value: "option1"
      next: "state_for_option1"
    - label: "Second Option"
      value: "option2"
      next: "state_for_option2"
```

#### End State
Terminates the workflow:

```yaml
end:
  type: "end"
```

### Using Variables

Store data with `save_as` and reference it with `{{variable_name}}`:

```yaml
states:
  ask_name:
    type: "choice"
    prompt: "What's your name?"
    save_as: "user_name"
    choices:
      - label: "Alice"
        next: "greet"
      - label: "Bob"
        next: "greet"
  
  greet:
    type: "prompt"
    prompt: "Write a personalized greeting for {{user_name}}"
    next: "end"
```

## Advanced Usage

### Using MCP Servers

MCP (Model Context Protocol) servers extend workflow capabilities with additional tools and resources. You can configure MCP servers at the workflow level and specify which servers are available to each state.

#### Configuring MCP Servers

Define MCP servers in your workflow YAML:

```yaml
name: "MCP Workflow"
default_model: "llama2"
start_state: "task"

mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    env:
      MCP_LOG_LEVEL: "info"
  
  memory:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-memory"]

states:
  task:
    type: "prompt"
    prompt: "Analyze files and remember key insights"
    mcp_servers: ["filesystem", "memory"]
    next: "end"
  
  end:
    type: "end"
```

#### Available MCP Servers

Common MCP servers you can use:

- **@modelcontextprotocol/server-filesystem**: Access and manipulate files
- **@modelcontextprotocol/server-memory**: Store and recall information
- **@modelcontextprotocol/server-github**: Interact with GitHub repositories
- **@modelcontextprotocol/server-postgres**: Query PostgreSQL databases
- **@modelcontextprotocol/server-puppeteer**: Browser automation

#### State-Level MCP Configuration

Each state can specify which MCP servers it needs:

```yaml
states:
  read_files:
    type: "prompt"
    prompt: "Read and summarize important files"
    mcp_servers: ["filesystem"]
    next: "store_summary"
  
  store_summary:
    type: "prompt"
    prompt: "Store the summary for later recall"
    mcp_servers: ["memory"]
    next: "end"
```

### Custom Ollama URL

If Ollama is running on a different port or host:

```bash
npm start run examples/simple-qa.yaml -- --ollama-url http://localhost:11434
```

### Using Different Models

Specify a model in your workflow file:

```yaml
states:
  my_state:
    type: "prompt"
    prompt: "Your question"
    model: "mistral"  # or "codellama", "vicuna", etc.
    next: "end"
```

### State Transitions

Create complex flows with conditional transitions:

```yaml
states:
  start:
    type: "choice"
    choices:
      - label: "Path A"
        next: "state_a"
      - label: "Path B"
        next: "state_b"
  
  state_a:
    type: "prompt"
    prompt: "You chose path A"
    next: "end"
  
  state_b:
    type: "prompt"
    prompt: "You chose path B"
    next: "end"
```

## Troubleshooting

### Issue: "Cannot connect to Ollama"

**Solution:** Make sure Ollama is running:
```bash
ollama serve
```

### Issue: "Model not found"

**Solution:** Pull the model first:
```bash
ollama pull llama2
```

### Issue: "Workflow file not found"

**Solution:** Use absolute or correct relative path:
```bash
npm start run ./examples/simple-qa.yaml
# or
npm start run /full/path/to/workflow.yaml
```

### Issue: Workflow validation fails

**Solution:** Check the error message and fix the YAML syntax or structure. Common issues:
- Missing `start_state`
- Invalid state `type`
- State references non-existent `next` state
- Prompt state missing `prompt` field
- Choice state missing `choices` field

## Tips

1. **Start Simple**: Begin with a simple workflow like `simple-qa.yaml` before creating complex ones
2. **Validate First**: Always validate your workflow before running it
3. **Use Variables**: Store and reuse data between states with `save_as` and `{{variable}}`
4. **Test Prompts**: Test your prompts in Ollama directly before adding them to workflows
5. **Model Selection**: Different models have different strengths - experiment to find the best fit

## Next Steps

- Create your own custom workflows
- Experiment with different models
- Chain multiple AI calls together
- Build complex decision trees with choice states
- Share your workflows with the community
