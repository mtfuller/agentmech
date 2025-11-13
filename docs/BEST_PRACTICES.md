# Best Practices Guide

This guide provides recommendations for building robust, maintainable, and efficient workflows with AgentMech.

## Table of Contents

- [Workflow Design](#workflow-design)
- [Performance Optimization](#performance-optimization)
- [Security & Safety](#security--safety)
- [Testing & Validation](#testing--validation)
- [Maintenance & Organization](#maintenance--organization)
- [RAG Best Practices](#rag-best-practices)
- [MCP Tools Best Practices](#mcp-tools-best-practices)
- [Production Deployment](#production-deployment)

## Workflow Design

### Start Simple, Then Expand

Begin with a minimal workflow and add complexity incrementally:

```yaml
# ✅ Good - Start simple
name: "Simple Q&A"
default_model: "gemma3:4b"
start_state: "ask"

states:
  ask:
    type: "prompt"
    prompt: "What is AI?"
    next: "end"
```

Then expand:
```yaml
# Add user input
states:
  get_topic:
    type: "input"
    prompt: "What topic?"
    save_as: "topic"
    next: "ask"
  
  ask:
    type: "prompt"
    prompt: "Explain {{topic}}"
    next: "end"
```

### Use Descriptive Names

**State names:**
```yaml
# ❌ Bad
states:
  s1:
    type: "prompt"
  s2:
    type: "prompt"

# ✅ Good
states:
  collect_user_feedback:
    type: "input"
  analyze_sentiment:
    type: "prompt"
  generate_recommendations:
    type: "prompt"
```

**Variable names:**
```yaml
# ❌ Bad
save_as: "r"
save_as: "temp"
save_as: "x"

# ✅ Good
save_as: "user_feedback"
save_as: "sentiment_analysis"
save_as: "recommendations"
```

### Keep Prompts Focused

Each prompt should have a single, clear purpose:

```yaml
# ❌ Bad - Too much in one prompt
states:
  analyze:
    type: "prompt"
    prompt: |
      1. Summarize this text
      2. Extract key themes
      3. Identify sentiment
      4. Generate recommendations
      5. Create an action plan
      Text: {{input}}

# ✅ Good - Break into focused steps
states:
  summarize:
    type: "prompt"
    prompt: "Summarize: {{input}}"
    save_as: "summary"
    next: "extract_themes"
  
  extract_themes:
    type: "prompt"
    prompt: "Extract key themes from: {{summary}}"
    save_as: "themes"
    next: "identify_sentiment"
  
  identify_sentiment:
    type: "prompt"
    prompt: "Identify sentiment: {{summary}}"
    save_as: "sentiment"
    next: "generate_recommendations"
```

### Use External Files for Long Prompts

Keep workflows readable:

```yaml
# ❌ Bad - Long prompt in workflow
states:
  story:
    type: "prompt"
    prompt: |
      Write a detailed fantasy story with the following requirements:
      - Must have a hero and villain
      - Include a quest
      - Add magical elements
      - Write in third person
      [... 50 more lines ...]

# ✅ Good - Use external file
states:
  story:
    type: "prompt"
    prompt_file: "prompts/fantasy-story-template.md"
    save_as: "story"
    next: "end"
```

### Design for Reusability

Create modular workflows that can be composed:

```yaml
# character-creator.yaml
name: "Character Creator"
start_state: "create"
states:
  create:
    type: "prompt"
    prompt: "Generate a character with name and background"
    save_as: "character"
    next: "end"

# story-writer.yaml
name: "Story Writer"
start_state: "get_character"
states:
  get_character:
    type: "workflow_ref"
    workflow_ref: "character-creator.yaml"
    next: "write_story"
  
  write_story:
    type: "prompt"
    prompt: "Write a story about: {{character}}"
    next: "end"
```

### Use Variables Effectively

**Define common values once:**
```yaml
variables:
  system_role: "You are a helpful assistant"
  company_name: "Acme Corp"
  support_email: "support@acme.com"

states:
  greet:
    type: "prompt"
    prompt: |
      {{system_role}}
      Welcome to {{company_name}}!
      Contact: {{support_email}}
```

**Load from files for complex content:**
```yaml
variables:
  instructions:
    file: "prompts/system-instructions.md"
  examples:
    file: "prompts/examples.json"
```

### Implement Error Handling

Always plan for failures:

```yaml
# Workflow-level fallback
on_error: "general_error_handler"

states:
  risky_operation:
    type: "prompt"
    prompt: "Process complex data..."
    on_error: "specific_error_handler"  # State-level override
    next: "success_path"
  
  specific_error_handler:
    type: "prompt"
    prompt: "Handle specific error gracefully"
    save_as: "error_resolution"
    next: "end"
  
  general_error_handler:
    type: "prompt"
    prompt: "Log error and notify user"
    next: "end"
```

### Use LLM-Driven Routing Wisely

Let the AI make decisions when appropriate:

```yaml
# ✅ Good use case - Content-based routing
states:
  analyze_sentiment:
    type: "prompt"
    prompt: "Analyze sentiment: {{feedback}}"
    save_as: "analysis"
    next_options:
      - state: "handle_positive"
        description: "Sentiment is positive"
      - state: "handle_negative"
        description: "Sentiment is negative"
      - state: "handle_neutral"
        description: "Sentiment is neutral"

# ❌ Bad use case - Simple boolean
states:
  check_continue:
    type: "prompt"
    prompt: "User wants to continue: {{user_input}}"
    next_options:
      - state: "continue"
        description: "Continue"
      - state: "end"
        description: "Stop"
    # Better: Just use the user_input directly with clear states
```

## Performance Optimization

### Choose the Right Model

Different models for different needs:

```yaml
# For speed (simple tasks)
default_model: "phi"

# For balance (most tasks)
default_model: "gemma3:4b"

# For quality (complex tasks)
default_model: "llama3"

# For code
default_model: "codellama"

# For images
default_model: "llava"
```

### Optimize Prompts

**Be concise but clear:**
```yaml
# ❌ Bad - Verbose
prompt: |
  I would like you to please analyze the following text very carefully
  and provide me with a detailed summary of the main points, making sure
  to capture all the important information...

# ✅ Good - Concise
prompt: "Summarize the main points: {{text}}"
```

**Use examples when needed:**
```yaml
prompt: |
  Extract names from text.
  
  Example:
  Input: "John and Mary went shopping"
  Output: ["John", "Mary"]
  
  Input: {{text}}
  Output:
```

### Cache RAG Embeddings

**Commit embeddings to version control:**
```bash
# Generate once
agentmech run workflow.yaml

# Commit for team
git add knowledge-base/embeddings.msgpack
git commit -m "Add embeddings cache"
```

**Configure appropriately:**
```yaml
rag:
  kb:
    directory: "./knowledge-base"
    model: "all-minilm"  # Fast embedding model
    embeddings_file: "embeddings.msgpack"  # MessagePack format (smaller)
    storage_format: "msgpack"  # 79% smaller than JSON
    chunk_size: 1000  # Larger = fewer chunks = faster
    top_k: 3  # Retrieve fewer chunks
```

### Minimize MCP Overhead

**Only enable needed servers:**
```yaml
# ❌ Bad - All servers for all states
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  memory:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-memory"]
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]

states:
  simple_task:
    type: "prompt"
    prompt: "Hello"
    mcp_servers: ["filesystem", "memory", "github"]  # Unnecessary!

# ✅ Good - Only what's needed
states:
  file_task:
    type: "prompt"
    prompt: "List files"
    mcp_servers: ["filesystem"]  # Only this state needs it
  
  chat_task:
    type: "prompt"
    prompt: "Hello"
    # No MCP servers needed
```

### Use Sequential Steps Appropriately

**Good for related operations:**
```yaml
# ✅ Good - Related steps
states:
  create_character:
    type: "prompt"
    steps:
      - prompt: "Generate a character name"
        save_as: "name"
      - prompt: "Describe {{name}}'s appearance"
        save_as: "appearance"
      - prompt: "Describe {{name}}'s personality"
        save_as: "personality"
    next: "write_story"
```

**Bad for unrelated operations:**
```yaml
# ❌ Bad - Unrelated steps
states:
  mixed_operations:
    type: "prompt"
    steps:
      - prompt: "Generate a story"
        save_as: "story"
      - prompt: "Analyze sentiment of: {{user_feedback}}"
        save_as: "sentiment"
      - prompt: "Calculate 2+2"
        save_as: "math"
    # These should be separate states!
```

## Security & Safety

### Validate User Input

**Never trust user input directly in commands:**
```yaml
# ❌ DANGEROUS - User input in MCP command
states:
  dangerous:
    type: "prompt"
    prompt: "Execute: {{user_command}}"
    mcp_servers: ["filesystem"]

# ✅ Good - Controlled operations
states:
  safe:
    type: "input"
    prompt: "Choose operation: [read|write]"
    save_as: "operation"
    next: "validate_operation"
  
  validate_operation:
    type: "prompt"
    prompt: "Validate that operation is 'read' or 'write': {{operation}}"
    next_options:
      - state: "read_file"
        description: "Operation is read"
      - state: "write_file"
        description: "Operation is write"
```

### Limit File Access

**Restrict MCP server access:**
```yaml
# ❌ Bad - Full system access
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/"]

# ✅ Good - Limited scope
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "./workspace"]
```

### Protect Sensitive Data

**Don't store secrets in workflows:**
```yaml
# ❌ NEVER DO THIS
variables:
  api_key: "sk-1234567890abcdef"
  password: "my_secret_password"

# ✅ Good - Use environment variables or external files
variables:
  api_key:
    file: ".secrets/api_key.txt"  # File in .gitignore
```

### Review Generated Content

**For production workflows:**
```yaml
states:
  generate_email:
    type: "prompt"
    prompt: "Generate customer email"
    save_as: "email_draft"
    next: "review"
  
  review:
    type: "input"
    prompt: |
      Email draft:
      {{email_draft}}
      
      Approve? (yes/no)
    save_as: "approved"
    next: "check_approval"
  
  check_approval:
    type: "prompt"
    prompt: "Is approved: {{approved}}"
    next_options:
      - state: "send_email"
        description: "Approved"
      - state: "regenerate"
        description: "Not approved"
```

## Testing & Validation

### Always Validate Before Running

```bash
# Check syntax and structure
agentmech validate workflow.yaml

# Validate all workflows
agentmech validate examples/*.yaml
```

### Write Comprehensive Tests

**Test critical paths:**
```yaml
# workflow.test.yaml
workflow: production-workflow.yaml
test_scenarios:
  # Test happy path
  - name: "Successful flow"
    inputs:
      - state: "get_name"
        value: "Alice"
      - state: "confirm"
        value: "yes"
    assertions:
      - type: "state_reached"
        value: "end"
      - type: "contains"
        target: "result"
        value: "Alice"
  
  # Test error handling
  - name: "Error recovery"
    inputs:
      - state: "get_name"
        value: ""  # Empty input
    assertions:
      - type: "state_reached"
        value: "error_handler"
  
  # Test edge cases
  - name: "Special characters"
    inputs:
      - state: "get_name"
        value: "O'Brien"
    assertions:
      - type: "contains"
        target: "result"
        value: "O'Brien"
```

### Test Incrementally

**Build and test in stages:**
```bash
# 1. Create basic workflow
agentmech validate basic.yaml
agentmech run basic.yaml

# 2. Add features one at a time
agentmech validate with-variables.yaml
agentmech run with-variables.yaml

# 3. Add complex features
agentmech validate with-rag.yaml
agentmech run with-rag.yaml

# 4. Write tests
agentmech test workflow.test.yaml
```

### Use Tracing for Debugging

```bash
# Enable detailed logging
agentmech run workflow.yaml --trace

# Check logs
cat ~/.agentmech/runs/*/trace.log
```

## Maintenance & Organization

### Organize Your Project

**Recommended structure:**
```
my-project/
├── workflows/
│   ├── main.yaml
│   ├── user-onboarding.yaml
│   └── data-processing.yaml
├── prompts/
│   ├── system.md
│   ├── templates/
│   │   ├── story.md
│   │   └── analysis.md
├── knowledge-base/
│   ├── docs/
│   ├── policies/
│   └── embeddings.msgpack
├── custom-tools/
│   ├── calculator.js
│   └── formatter.js
├── tests/
│   ├── main.test.yaml
│   └── onboarding.test.yaml
└── README.md
```

### Document Your Workflows

**Add clear descriptions:**
```yaml
name: "Customer Feedback Analyzer"
description: |
  Analyzes customer feedback through multiple stages:
  1. Collects feedback text from user
  2. Extracts key themes and sentiments
  3. Categorizes by topic
  4. Generates actionable recommendations
  
  Requires: 8GB RAM, gemma3:4b model
  Run time: ~2 minutes
  
default_model: "gemma3:4b"
```

**Add comments for complex logic:**
```yaml
states:
  analyze:
    type: "prompt"
    # Using RAG to provide context from policy documents
    # Chunk size optimized for policy text structure
    use_rag: "policy_kb"
    prompt: "Analyze feedback: {{feedback}}"
    next: "categorize"
```

### Version Control Best Practices

**What to commit:**
```bash
# ✅ Commit these
git add workflows/
git add prompts/
git add knowledge-base/*.txt
git add knowledge-base/embeddings.msgpack  # Cached embeddings
git add tests/
git add custom-tools/
git add README.md

# ❌ Don't commit these
echo "node_modules/" >> .gitignore
echo ".secrets/" >> .gitignore
echo "~/.agentmech/runs/" >> .gitignore
echo "*.log" >> .gitignore
```

**Use meaningful commit messages:**
```bash
# ❌ Bad
git commit -m "update"
git commit -m "fix"

# ✅ Good
git commit -m "Add error handling to payment workflow"
git commit -m "Optimize RAG chunk size for better accuracy"
git commit -m "Update system prompt for concise responses"
```

### Keep Dependencies Updated

```bash
# Update AgentMech
npm install -g @agentmech/agentmech@latest

# Update Ollama
curl https://ollama.ai/install.sh | sh

# Update models
ollama pull gemma3:4b
ollama pull all-minilm
```

## RAG Best Practices

### Organize Knowledge Base

```
knowledge-base/
├── products/
│   ├── features.txt
│   └── pricing.txt
├── policies/
│   ├── refund.txt
│   └── privacy.txt
├── guides/
│   ├── installation.md
│   └── troubleshooting.md
└── embeddings.msgpack
```

### Optimize Chunk Size

**For different content types:**
```yaml
# Technical documentation - smaller chunks
rag:
  technical:
    directory: "./docs/api"
    chunk_size: 400  # Precise API references

# Narrative content - larger chunks
rag:
  stories:
    directory: "./docs/stories"
    chunk_size: 1500  # Keep context together

# Mixed content - medium chunks
rag:
  general:
    directory: "./docs/general"
    chunk_size: 800  # Balanced
```

### Use Multiple RAG Configurations

```yaml
# Different knowledge bases for different purposes
rag:
  product_info:
    directory: "./knowledge/products"
    chunk_size: 500
    top_k: 3
  
  technical_docs:
    directory: "./knowledge/technical"
    chunk_size: 800
    top_k: 5
  
  policies:
    directory: "./knowledge/policies"
    chunk_size: 600
    top_k: 2

states:
  answer_product_question:
    type: "prompt"
    use_rag: "product_info"
    prompt: "{{question}}"
  
  answer_technical_question:
    type: "prompt"
    use_rag: "technical_docs"
    prompt: "{{question}}"
```

### Customize RAG Templates

**Provide clear context:**
```yaml
rag:
  kb:
    directory: "./knowledge"
    chunk_template: |
      Source: {{chunk.source}}
      {{chunk.text}}
    context_template: |
      === Relevant Documentation ===
      {{chunks}}
      
      === User Question ===
      {{prompt}}
      
      === Instructions ===
      Answer based only on the documentation above.
      If information is not available, say so.
```

## MCP Tools Best Practices

### Design Focused Tools

**Each tool should do one thing well:**
```javascript
// ❌ Bad - Too many responsibilities
function swissTool(args) {
  const { operation, data } = args;
  if (operation === 'format') {
    // format logic
  } else if (operation === 'validate') {
    // validate logic
  } else if (operation === 'transform') {
    // transform logic
  }
  // ... more operations
}

// ✅ Good - Focused tools
function formatData(args) {
  const { data } = args;
  return { result: /* format logic */ };
}

function validateData(args) {
  const { data } = args;
  return { result: /* validate logic */ };
}
```

### Provide Clear Descriptions

```javascript
// ❌ Bad
calculator.description = 'Math tool';

// ✅ Good
calculator.description = 'Performs basic arithmetic operations (add, subtract, multiply, divide). Use when the user asks to perform calculations.';
```

### Validate Input

```javascript
function myTool(args) {
  const { required_param, optional_param = 'default' } = args;
  
  // Validate required parameters
  if (!required_param) {
    throw new Error('required_param is mandatory');
  }
  
  // Validate types
  if (typeof required_param !== 'string') {
    throw new Error('required_param must be a string');
  }
  
  // Validate ranges/constraints
  if (required_param.length > 100) {
    throw new Error('required_param must be 100 characters or less');
  }
  
  // Your logic here
  return { result: 'success' };
}
```

### Handle Errors Gracefully

```javascript
async function fetchData(args) {
  const { url } = args;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { result: data };
    
  } catch (error) {
    // Provide helpful error message
    throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
  }
}
```

## Production Deployment

### Environment Configuration

**Use environment-specific configs:**
```yaml
# development.yaml
variables:
  ollama_url: "http://localhost:11434"
  log_level: "debug"
  
# production.yaml
variables:
  ollama_url: "http://ollama-server:11434"
  log_level: "info"
```

### Resource Planning

**Model selection for production:**
```yaml
# Development - fast iteration
default_model: "phi"

# Staging - realistic testing
default_model: "gemma3:4b"

# Production - best quality
default_model: "llama3"
```

**Hardware recommendations:**
- **CPU-only**: 16GB+ RAM, consider smaller models
- **GPU**: NVIDIA GPU with 8GB+ VRAM, can run larger models
- **Disk**: 50GB+ for models and embeddings

### Monitoring & Logging

**Enable appropriate logging:**
```bash
# Development - detailed traces
agentmech run workflow.yaml --trace --log-file dev.log

# Production - essential logs only
agentmech run workflow.yaml --log-file prod.log
```

**Monitor run directories:**
```bash
# Check disk usage
du -sh ~/.agentmech/runs

# Clean old runs
find ~/.agentmech/runs -mtime +30 -delete
```

### Backup & Recovery

**Backup critical files:**
```bash
# Backup workflows and knowledge base
tar -czf backup-$(date +%Y%m%d).tar.gz \
  workflows/ \
  prompts/ \
  knowledge-base/ \
  custom-tools/

# Store remotely
aws s3 cp backup-*.tar.gz s3://my-bucket/backups/
```

### Rate Limiting

**For public-facing applications:**
- Implement request queuing
- Limit concurrent workflow executions
- Add timeouts for long-running workflows
- Monitor system resources

### Security Checklist

- [ ] No hardcoded secrets in workflows
- [ ] MCP servers have restricted file access
- [ ] User inputs are validated
- [ ] Error messages don't leak sensitive info
- [ ] Run workflows with limited permissions
- [ ] Regular security updates
- [ ] Audit logs enabled
- [ ] Access control implemented

## See Also

- [FAQ.md](FAQ.md) - Common questions
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Problem solving
- [USAGE.md](USAGE.md) - Usage guide
- [CUSTOM_TOOLS_GUIDE.md](CUSTOM_TOOLS_GUIDE.md) - Building tools
- [RAG_GUIDE.md](RAG_GUIDE.md) - RAG details
