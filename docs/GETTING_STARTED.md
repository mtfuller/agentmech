# Getting Started with AgentMech

This guide will help you get up and running with AgentMech in minutes.

## What is AgentMech?

AgentMech is a powerful CLI tool that lets you create AI workflows using simple YAML files. Think of it as a way to build AI applications without writing code - just define what you want to happen, and AgentMech handles the rest.

**Key Features:**
- 🤖 Run AI models locally with Ollama
- 📝 Define workflows in simple YAML
- 🔄 Chain multiple AI operations together
- 🧠 Add knowledge bases with RAG
- 🔌 Extend with custom tools and MCP servers
- 🌐 Web UI for easy workflow management

## Installation

### Step 1: Install Prerequisites

**Install Node.js** (if you don't have it):
- Download from [nodejs.org](https://nodejs.org/) (v14 or higher)
- Verify: `node --version`

**Install Ollama**:
- Download from [ollama.ai](https://ollama.ai/)
- Follow the installation instructions for your OS

### Step 2: Install AgentMech

Choose one of these options:

**Option A: Global Install (Recommended)**
```bash
npm install -g @agentmech/agentmech
```

**Option B: Use with npx (No install needed)**
```bash
npx @agentmech/agentmech run workflow.yaml
```

**Option C: From Source**
```bash
git clone https://github.com/mtfuller/agentmech.git
cd agentmech
npm install && npm run build
```

### Step 3: Start Ollama and Pull a Model

```bash
# Start Ollama server (in a terminal)
ollama serve

# In another terminal, pull a model
ollama pull gemma3:4b
```

**Recommended models to start:**
- `gemma3:4b` - Balanced speed and quality (4GB)
- `phi` - Fastest, smallest (2GB)
- `mistral` - Good alternative (4GB)

### Step 4: Verify Installation

```bash
# Check AgentMech
agentmech --version

# Check Ollama
curl http://localhost:11434/api/tags

# List models
agentmech list-models
```

## Your First Workflow

Let's create a simple workflow that asks the AI a question.

### Option 1: Use AI to Generate Your Workflow

The easiest way to start is to let AI help you:

```bash
agentmech generate
```

Follow the prompts:
1. Describe what you want to do
2. Choose a template
3. Answer customization questions
4. Get a ready-to-run workflow!

### Option 2: Create a Workflow Manually

Create a file named `hello.yaml`:

```yaml
name: "My First Workflow"
description: "A simple greeting workflow"
default_model: "gemma3:4b"
start_state: "greet"

states:
  greet:
    type: "prompt"
    prompt: "Say hello and introduce yourself as a helpful AI assistant"
    next: "end"
```

Run it:
```bash
agentmech run hello.yaml
```

You should see the AI's response streamed to your terminal!

## Interactive Workflow

Let's make it interactive by collecting user input:

Create `interactive-hello.yaml`:

```yaml
name: "Interactive Greeting"
default_model: "gemma3:4b"
start_state: "get_name"

states:
  get_name:
    type: "input"
    prompt: "What's your name?"
    save_as: "user_name"
    next: "greet"
  
  greet:
    type: "prompt"
    prompt: "Generate a friendly, personalized greeting for {{user_name}}"
    next: "end"
```

Run it:
```bash
agentmech run interactive-hello.yaml
```

The workflow will:
1. Ask for your name
2. Store it in a variable
3. Use it to create a personalized greeting

## Next Steps

### Explore Examples

AgentMech comes with many example workflows:

```bash
# List examples
ls examples/*.yaml

# Try a simple one
agentmech run examples/simple-qa.yaml

# Try an interactive one
agentmech run examples/complete-story-builder.yaml

# Try one with image analysis (requires llava model)
ollama pull llava
agentmech run examples/image-analysis.yaml
```

### Use the Web UI

Start a web interface to browse and run workflows:

```bash
agentmech serve examples
```

Open http://localhost:3000 in your browser and explore!

### Learn Key Concepts

**States**: Building blocks of workflows
- `prompt` - Send a question to the AI
- `input` - Get input from the user
- `workflow_ref` - Call another workflow

**Variables**: Store and reuse data
- Define with `variables` section
- Save with `save_as`
- Use with `{{variable_name}}`

**State Transitions**: Control flow
- `next: "state_name"` - Go to specific state
- `next: "end"` - End the workflow
- `next_options` - Let AI choose next state

### Common Workflow Patterns

**1. Simple Q&A**
```yaml
name: "Q&A"
default_model: "gemma3:4b"
start_state: "ask"
states:
  ask:
    type: "prompt"
    prompt: "What is artificial intelligence?"
    next: "end"
```

**2. User Input → Processing**
```yaml
name: "Process Input"
default_model: "gemma3:4b"
start_state: "get_input"
states:
  get_input:
    type: "input"
    prompt: "Enter text to analyze:"
    save_as: "text"
    next: "analyze"
  
  analyze:
    type: "prompt"
    prompt: "Analyze this text: {{text}}"
    next: "end"
```

**3. Multi-Step Analysis**
```yaml
name: "Multi-Step"
default_model: "gemma3:4b"
start_state: "step1"
states:
  step1:
    type: "prompt"
    prompt: "Summarize: {{input}}"
    save_as: "summary"
    next: "step2"
  
  step2:
    type: "prompt"
    prompt: "Extract key points from: {{summary}}"
    next: "end"
```

## Essential Commands

```bash
# Generate a workflow with AI
agentmech generate

# Run a workflow
agentmech run workflow.yaml

# Validate before running
agentmech validate workflow.yaml

# Test a workflow
agentmech test workflow.test.yaml

# List available models
agentmech list-models

# Start web UI
agentmech serve ./workflows

# Get help
agentmech --help
agentmech run --help
```

## Tips for Beginners

1. **Start Simple**: Begin with basic workflows, add complexity later
2. **Validate First**: Always run `agentmech validate` before running
3. **Use Examples**: Copy and modify existing examples
4. **Read Error Messages**: They usually tell you exactly what's wrong
5. **Check Logs**: Workflow logs are in `~/.agentmech/runs/`
6. **Use Streaming**: See responses in real-time as they generate
7. **Enable Tracing**: Use `--trace` flag for debugging

## Common Beginner Mistakes

### ❌ Forgetting to start Ollama
```bash
# Error: Cannot connect to Ollama
# Fix: Start Ollama first
ollama serve
```

### ❌ Model not pulled
```bash
# Error: Model not found
# Fix: Pull the model
ollama pull gemma3:4b
```

### ❌ Wrong file path
```bash
# Error: File not found
# Fix: Use correct path
agentmech run ./examples/simple-qa.yaml
```

### ❌ Typo in state names
```yaml
# Error: State not found
# Fix: Match state names exactly
start_state: "first_state"  # Must match below
states:
  first_state:  # Exact match
```

### ❌ Missing prompt field
```yaml
# Error: Prompt field required
states:
  my_state:
    type: "prompt"
    # Missing prompt!
    next: "end"

# Fix: Add prompt
states:
  my_state:
    type: "prompt"
    prompt: "Your question"  # Add this
    next: "end"
```

## What's Next?

Now that you have the basics, explore more advanced features:

### 📚 Add a Knowledge Base (RAG)
Give your AI access to your own documents:
```yaml
rag:
  kb:
    directory: "./my-docs"
    model: "all-minilm"

states:
  ask:
    type: "prompt"
    prompt: "{{question}}"
    use_rag: "kb"  # Uses your documents
    next: "end"
```

See [RAG_GUIDE.md](RAG_GUIDE.md) for details.

### 🔌 Add Custom Tools
Create JavaScript tools for the AI to use:
```javascript
// my-tool.js
function calculator(args) {
  const { a, b, operation } = args;
  if (operation === 'add') return { result: a + b };
  // ...
}
module.exports = calculator;
```

See [CUSTOM_TOOLS_GUIDE.md](CUSTOM_TOOLS_GUIDE.md) for details.

### 🌐 Web Browsing
Let the AI browse websites:
```yaml
mcp_servers:
  browser:
    type: npx
    package: "@modelcontextprotocol/server-playwright"

states:
  browse:
    type: "prompt"
    prompt: "Visit example.com and describe what you see"
    mcp_servers: ["browser"]
    next: "end"
```

See [WEB_BROWSING_GUIDE.md](../examples/WEB_BROWSING_GUIDE.md) for details.

### 🧪 Write Tests
Ensure your workflows work correctly:
```yaml
# workflow.test.yaml
workflow: my-workflow.yaml
test_scenarios:
  - name: "Basic test"
    inputs:
      - state: "get_name"
        value: "Alice"
    assertions:
      - type: "contains"
        target: "greeting"
        value: "Alice"
```

Run with: `agentmech test workflow.test.yaml`

## Learning Resources

### Documentation
- [USAGE.md](USAGE.md) - Comprehensive usage guide
- [QUICKREF.md](QUICKREF.md) - Quick reference
- [FAQ.md](FAQ.md) - Common questions
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Problem solving
- [BEST_PRACTICES.md](BEST_PRACTICES.md) - Design patterns

### Examples
Browse the `examples/` directory:
- `simple-qa.yaml` - Simplest possible workflow
- `user-input-demo.yaml` - Collecting user input
- `sequential-steps-demo.yaml` - Multi-step workflows
- `complete-story-builder.yaml` - Workflow composition
- `multi-rag-qa.yaml` - Using knowledge bases
- `web-browsing-demo.yaml` - Web automation

### Community
- GitHub: [github.com/mtfuller/agentmech](https://github.com/mtfuller/agentmech)
- Issues: [Report bugs or request features](https://github.com/mtfuller/agentmech/issues)

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│ AGENTMECH QUICK REFERENCE                           │
├─────────────────────────────────────────────────────┤
│ COMMANDS                                            │
│   agentmech generate     - Create workflow with AI  │
│   agentmech run FILE     - Run workflow             │
│   agentmech validate FILE - Check workflow          │
│   agentmech test FILE    - Run tests                │
│   agentmech serve DIR    - Start web UI             │
│   agentmech list-models  - Show available models    │
├─────────────────────────────────────────────────────┤
│ STATE TYPES                                         │
│   prompt       - Send question to AI                │
│   input        - Get input from user                │
│   workflow_ref - Call another workflow              │
├─────────────────────────────────────────────────────┤
│ VARIABLES                                           │
│   {{name}}     - Use variable                       │
│   save_as: x   - Save result to variable            │
├─────────────────────────────────────────────────────┤
│ FLOW CONTROL                                        │
│   next: "state"   - Go to state                     │
│   next: "end"     - End workflow                    │
│   next_options    - AI chooses next state           │
├─────────────────────────────────────────────────────┤
│ TROUBLESHOOTING                                     │
│   ollama serve           - Start Ollama             │
│   ollama pull MODEL      - Download model           │
│   agentmech validate     - Check syntax             │
│   --trace                - Enable debug logging     │
└─────────────────────────────────────────────────────┘
```

## Getting Help

If you get stuck:

1. **Check the FAQ**: [FAQ.md](FAQ.md)
2. **Search examples**: Look in `examples/` directory
3. **Read error messages**: They usually explain the issue
4. **Enable tracing**: `agentmech run workflow.yaml --trace`
5. **Check logs**: `~/.agentmech/runs/*/log.txt`
6. **Ask for help**: [Open an issue](https://github.com/mtfuller/agentmech/issues)

## Ready to Build?

You now have everything you need to start building AI workflows!

**Next steps:**
1. Create your first custom workflow
2. Explore the examples
3. Try advanced features (RAG, MCP, custom tools)
4. Share your workflows with the community

Happy building! 🚀
