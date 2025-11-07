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
   ollama pull gemma3:4b
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
  - gemma3:4b:latest (3.83 GB)
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
Using model: gemma3:4b

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

### 2. Complete Story Builder (examples/complete-story-builder.yaml)

An interactive workflow that demonstrates workflow composition by combining character creation with story generation.

**Run it:**
```bash
npm start run examples/complete-story-builder.yaml
```

**What it does:**
1. References the character-creator.yaml workflow to create a detailed character
2. Uses the created character to write a custom story
3. Demonstrates the workflow_ref feature for composing modular workflows
4. Asks if you want to continue with another action

**Features demonstrated:**
- Workflow composition using `workflow_ref`
- External prompt files (`prompt_file`)
- Context variable usage across workflows
- Input states for user interaction

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
Using model: gemma3:4b

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
default_model: "gemma3:4b"
start_state: "first_state"

states:
  first_state:
    type: "prompt"  # or "choice" or "input"
    # ... state configuration
    next: "second_state"
  
  second_state:
    # ... more states
    next: "end"  # "end" is a reserved state name - no need to define it
```

**Note:** The `"end"` state is reserved and does not need to be explicitly defined. Simply set `next: "end"` to terminate the workflow.

### State Types Reference

#### Prompt State
Sends a prompt to Ollama:

```yaml
my_prompt_state:
  type: "prompt"
  prompt: "Your question here"
  model: "gemma3:4b"  # optional, uses default_model if not set
  save_as: "variable_name"  # optional, saves response for later use
  mcp_servers: ["server1"]  # optional, MCP servers to connect for this state
  next: "next_state"  # or "end"
```

You can also load prompts from external files:

```yaml
my_prompt_state:
  type: "prompt"
  prompt_file: "prompts/my-detailed-prompt.md"  # load from external file
  model: "gemma3:4b"
  save_as: "variable_name"
  next: "next_state"
```

#### Input State
Collects freeform text input from the user:

```yaml
my_input_state:
  type: "input"
  prompt: "What is your name?"  # Question to ask
  save_as: "user_input"  # optional
  default_value: "Anonymous"  # optional
  next: "next_state"
```

#### Workflow Reference State
References another workflow file:

```yaml
my_workflow_ref:
  type: "workflow_ref"
  workflow_ref: "other-workflow.yaml"  # path to another workflow
  next: "continue_after"  # state to go to after referenced workflow completes
```

### Ending a Workflow

To end a workflow, simply use `next: "end"` in any state. The `"end"` state is a reserved state name and does not need to be explicitly defined.

```yaml
final_state:
  type: "prompt"
  prompt: "This is the last step"
  next: "end"  # Workflow terminates here
```

### Using Variables

Store data with `save_as` and reference it with `{{variable_name}}`:

```yaml
states:
  ask_name:
    type: "input"
    prompt: "What's your name?"
    save_as: "user_name"
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
default_model: "gemma3:4b"
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

### Using RAG (Retrieval-Augmented Generation)

RAG allows your workflows to retrieve relevant context from a knowledge base of documents. This enables more accurate and contextual responses.

#### Setting Up RAG

1. **Create a knowledge base directory** with your documents:

```bash
mkdir -p ./knowledge-base
```

2. **Add text files** to your knowledge base (supports .txt, .md, .json, .yaml, .yml, .js, .ts, .py, .html, .css):

```bash
echo "Your product documentation here..." > ./knowledge-base/docs.txt
echo "Installation guide..." > ./knowledge-base/install.md
```

3. **Configure RAG in your workflow**:

```yaml
name: "RAG Example"
default_model: "gemma3:4b"
start_state: "ask"

rag:
  directory: "./knowledge-base"         # Directory with your documents
  model: "gemma3:4b"                    # Model for generating embeddings
  embeddingsFile: "embeddings.msgpack"  # Cache file for embeddings (default format)
  storageFormat: "msgpack"              # Storage format: "msgpack" (default) or "json"
  chunkSize: 500                        # Size of text chunks (in characters)
  topK: 3                               # Number of relevant chunks to retrieve

states:
  ask:
    type: "prompt"
    prompt: "What is your question?"
    use_rag: true  # Enable RAG for this prompt
    next: "end"
```

#### How RAG Works

1. **First Run**: When you run a workflow with RAG enabled for the first time, it:
   - Scans all text files in the specified directory
   - Splits them into chunks
   - Generates embeddings for each chunk using Ollama
   - Saves embeddings to a JSON file for future use

2. **Subsequent Runs**: Loads embeddings from the cache file (much faster)

3. **During Execution**: When a prompt with `use_rag: true` is executed:
   - Generates an embedding for the prompt
   - Finds the most similar chunks from the knowledge base
   - Appends relevant context to the prompt
   - Sends the enhanced prompt to the model

#### Example RAG Workflow

```bash
npm start run examples/multi-rag-qa.yaml
```

This comprehensive example demonstrates all three RAG approaches: default workflow-level, named configurations, and inline state-level RAG with a pre-configured knowledge base about the AI Workflow CLI itself.

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

Create complex flows with conditional transitions using LLM-driven routing:

```yaml
states:
  start:
    type: "input"
    prompt: "Which path would you like to take? (A or B)"
    save_as: "path_choice"
    next: "route"
  
  route:
    type: "prompt"
    prompt: "User chose: {{path_choice}}"
    next_options:
      - state: "state_a"
        description: "User chose path A"
      - state: "state_b"
        description: "User chose path B"
  
  state_a:
    type: "prompt"
    prompt: "You chose path A"
    next: "end"
  
  state_b:
    type: "prompt"
    prompt: "You chose path B"
    next: "end"
```

### External File References

#### Using External Prompt Files

Keep your prompts organized in separate files:

**prompts/story-prompt.md:**
```markdown
# Story Writing Prompt

Write a creative and engaging short story about a time traveler...
```

**workflow.yaml:**
```yaml
states:
  generate_story:
    type: "prompt"
    prompt_file: "prompts/story-prompt.md"
    save_as: "story"
    next: "end"
```

Benefits:
- Easier to maintain long prompts
- Better version control
- Reuse prompts across workflows
- Write in markdown with formatting

#### Using Workflow References

Create modular, reusable workflows:

**greeting-workflow.yaml:**
```yaml
name: "Greeting Workflow"
default_model: "gemma3:4b"
start_state: "greet"

states:
  greet:
    type: "prompt"
    prompt: "Generate a friendly greeting"
    save_as: "greeting"
    next: "end"
```

**main-workflow.yaml:**
```yaml
name: "Main Workflow"
default_model: "gemma3:4b"
start_state: "start_greeting"

states:
  start_greeting:
    type: "workflow_ref"
    workflow_ref: "greeting-workflow.yaml"
    next: "continue"
  
  continue:
    type: "prompt"
    prompt: "Continue with main workflow..."
    next: "end"
```

Benefits:
- Build modular workflow components
- Reuse workflows across projects
- Compose complex workflows from simpler ones
- Better organization and maintainability
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
ollama pull gemma3:4b
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
- Prompt state missing `prompt` field (unless using `prompt_file`)
- Input state missing `prompt` field
- External prompt file not found (check path is relative to workflow file)
- Referenced workflow file not found
- RAG configured but directory missing
- `use_rag: true` without RAG configuration

### Issue: RAG embeddings taking too long

**Solution:** 
- Reduce the number of files in your knowledge base
- Increase `chunkSize` to create fewer chunks
- Use a smaller/faster model for embeddings
- Once generated, embeddings are cached for fast reuse

## Tips

1. **Start Simple**: Begin with a simple workflow like `simple-qa.yaml` before creating complex ones
2. **Validate First**: Always validate your workflow before running it
3. **Use Variables**: Store and reuse data between states with `save_as` and `{{variable}}`
4. **Test Prompts**: Test your prompts in Ollama directly before adding them to workflows
5. **Model Selection**: Different models have different strengths - experiment to find the best fit
6. **RAG for Accuracy**: Use RAG when you need responses based on specific documentation or knowledge
7. **Cache Embeddings**: Embeddings are cached in MessagePack format (~79% smaller than JSON) for fast reuse - commit to version control
8. **Organize Prompts**: Use external prompt files for long or complex prompts
9. **Modular Workflows**: Break complex workflows into smaller, reusable components using workflow references
10. **LLM Routing**: Use `next_options` in prompt states for intelligent, context-aware state transitions

## Next Steps

- Create your own custom workflows
- Experiment with different models
- Chain multiple AI calls together
- Build a knowledge base for RAG-powered workflows
- Use LLM-driven routing for adaptive workflows
- Share your workflows with the community
