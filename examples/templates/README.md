# Workflow Templates

This directory contains ready-to-use workflow templates that you can copy and customize for your own projects.

## Available Templates

### 1. Simple Q&A (`simple-qa-template.yaml`)
**Use for:** Quick questions, information lookup, single AI responses

**Features:**
- Single prompt state
- Minimal configuration
- Fast to run

**Example use cases:**
- Getting definitions or explanations
- Quick information retrieval
- Testing AI models

### 2. User Survey (`user-survey-template.yaml`)
**Use for:** Collecting user information, surveys, forms

**Features:**
- Multiple input states
- Data collection
- Summary generation

**Example use cases:**
- Customer feedback forms
- User onboarding
- Data collection workflows

### 3. Multi-Step Analysis (`multi-step-analysis-template.yaml`)
**Use for:** Complex analysis requiring multiple stages

**Features:**
- Sequential processing
- Progressive refinement
- State-by-state analysis

**Example use cases:**
- Document analysis
- Data processing pipelines
- Research workflows

### 4. Content Generator (`content-generator-template.yaml`)
**Use for:** Creative content generation

**Features:**
- Brainstorming step
- Drafting step
- Refinement step

**Example use cases:**
- Blog post writing
- Story creation
- Marketing content

### 5. RAG Q&A (`rag-qa-template.yaml`)
**Use for:** Answering questions based on your documents

**Features:**
- Knowledge base integration
- Context-aware responses
- Document retrieval

**Example use cases:**
- Documentation Q&A
- Customer support
- Knowledge base queries

### 6. Interactive Assistant (`interactive-assistant-template.yaml`)
**Use for:** Back-and-forth conversations with looping

**Features:**
- User interaction loop
- Continue/exit options
- Conversational flow

**Example use cases:**
- Chatbots
- Interactive tutorials
- Assistance workflows

### 7. Error Handling (`error-handling-template.yaml`)
**Use for:** Robust workflows with fallback handling

**Features:**
- Try/catch pattern
- Error recovery
- Graceful degradation

**Example use cases:**
- Production workflows
- Reliable automation
- Mission-critical tasks

### 8. Web Scraping (`web-scraping-template.yaml`)
**Use for:** Extracting information from websites

**Features:**
- Playwright integration
- Content extraction
- Data processing

**Example use cases:**
- Market research
- Competitive analysis
- Data collection

## How to Use Templates

### 1. Copy Template
```bash
cp examples/templates/simple-qa-template.yaml my-workflow.yaml
```

### 2. Customize
Edit `my-workflow.yaml` to fit your needs:
- Change the `name` and `description`
- Update prompts
- Modify state flow
- Add/remove states

### 3. Validate
```bash
agentmech validate my-workflow.yaml
```

### 4. Run
```bash
agentmech run my-workflow.yaml
```

## Template Variables

Most templates include placeholder variables you should customize:

```yaml
variables:
  # Customize these for your use case
  app_name: "Your App Name"
  system_role: "Your custom role description"
  context: "Your specific context"
```

## Combining Templates

You can combine templates using `workflow_ref`:

```yaml
# main-workflow.yaml
states:
  collect_data:
    type: "workflow_ref"
    workflow_ref: "templates/user-survey-template.yaml"
    next: "analyze"
  
  analyze:
    type: "workflow_ref"
    workflow_ref: "templates/multi-step-analysis-template.yaml"
    next: "end"
```

## Creating Your Own Templates

When creating templates:

1. **Use descriptive placeholder names**
   ```yaml
   prompt: "Analyze {{USER_INPUT_HERE}}"
   ```

2. **Include comments**
   ```yaml
   states:
     analyze:
       # TODO: Customize this prompt for your specific use case
       type: "prompt"
       prompt: "Analyze the data"
   ```

3. **Provide default values**
   ```yaml
   variables:
     model: "gemma3:4b"  # Change to phi for speed, llama3 for quality
   ```

4. **Document requirements**
   ```yaml
   # Requirements:
   # - Ollama running with gemma3:4b model
   # - Input files in ./data/ directory
   # - At least 8GB RAM
   ```

## Best Practices

1. **Start with a template** - Don't start from scratch
2. **Validate frequently** - Check syntax after each change
3. **Test incrementally** - Run after each major change
4. **Keep it simple** - Add complexity gradually
5. **Document changes** - Add comments explaining customizations

## Template Customization Guide

### Changing the Model
```yaml
# For speed
default_model: "phi"

# For balance
default_model: "gemma3:4b"

# For quality
default_model: "llama3"
```

### Adding Error Handling
```yaml
on_error: "error_handler"

states:
  # ... your states ...
  
  error_handler:
    type: "prompt"
    prompt: "Handle error gracefully"
    next: "end"
```

### Adding RAG
```yaml
rag:
  kb:
    directory: "./knowledge-base"
    model: "all-minilm"

states:
  answer:
    type: "prompt"
    use_rag: "kb"
    prompt: "{{question}}"
```

### Adding MCP Tools
```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]

states:
  use_tools:
    type: "prompt"
    mcp_servers: ["filesystem"]
    prompt: "List files in /tmp"
```

## Need Help?

- See [GETTING_STARTED.md](../../docs/GETTING_STARTED.md) for basics
- See [USAGE.md](../../docs/USAGE.md) for detailed examples
- See [BEST_PRACTICES.md](../../docs/BEST_PRACTICES.md) for design patterns
- See [FAQ.md](../../docs/FAQ.md) for common questions

## Contributing Templates

Have a useful template? Contribute it!

1. Create a clear, well-documented template
2. Add it to this directory
3. Update this README
4. Submit a pull request

Good templates are:
- ✅ Well-commented
- ✅ Use clear variable names
- ✅ Include usage instructions
- ✅ Solve a specific problem
- ✅ Follow best practices
