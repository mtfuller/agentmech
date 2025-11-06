# Quick Reference

## Commands

```bash
# Run a workflow
npm start run <workflow.yaml>
npm start run examples/story-generator.yaml

# Validate a workflow
npm start validate <workflow.yaml>

# List available models
npm start list-models

# Custom Ollama URL
npm start run <workflow.yaml> -- --ollama-url http://localhost:11434
```

## Workflow Structure

```yaml
name: "Workflow Name"
description: "Optional description"
default_model: "gemma3:4b"
start_state: "first_state"

# Optional MCP server configuration
mcp_servers:
  server_name:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-name"]
    env:
      VAR: "value"

states:
  state_name:
    type: "prompt" | "choice" | "end"
    mcp_servers: ["server_name"]  # optional
    # ... configuration
    next: "next_state" | "end"
```

## State Types

### Prompt State
```yaml
my_state:
  type: "prompt"
  prompt: "Your question here"
  model: "gemma3:4b"              # optional
  save_as: "variable_name"     # optional
  mcp_servers: ["server1"]     # optional
  next: "next_state"
```

Or load from external file:
```yaml
my_state:
  type: "prompt"
  prompt_file: "prompts/my-prompt.md"
  save_as: "variable_name"
  next: "next_state"
```

### Choice State
```yaml
my_state:
  type: "choice"
  prompt: "Choose an option:"  # optional
  save_as: "choice_var"        # optional
  choices:
    - label: "Option 1"
      value: "opt1"
      next: "state_1"
    - label: "Option 2"
      value: "opt2"
      next: "state_2"
```

### Workflow Reference State
```yaml
my_state:
  type: "workflow_ref"
  workflow_ref: "path/to/other-workflow.yaml"
  next: "next_state"
```

### End State
```yaml
end:
  type: "end"
```

## Variable Interpolation

```yaml
# Store a value
ask_name:
  type: "choice"
  save_as: "name"
  choices:
    - label: "Alice"
    - label: "Bob"

# Use the value
greet:
  type: "prompt"
  prompt: "Say hello to {{name}}"
```

## Common Patterns

### Simple Q&A
```yaml
name: "Q&A"
start_state: "question"
states:
  question:
    type: "prompt"
    prompt: "What is AI?"
    next: "end"
  end:
    type: "end"
```

### Choice → Prompt → End
```yaml
name: "Choice Flow"
start_state: "choose"
states:
  choose:
    type: "choice"
    choices:
      - label: "Option A"
        next: "do_a"
      - label: "Option B"
        next: "do_b"
  do_a:
    type: "prompt"
    prompt: "You chose A"
    next: "end"
  do_b:
    type: "prompt"
    prompt: "You chose B"
    next: "end"
  end:
    type: "end"
```

### Loop Pattern
```yaml
name: "Loop Example"
start_state: "action"
states:
  action:
    type: "prompt"
    prompt: "Do something"
    next: "ask_continue"
  ask_continue:
    type: "choice"
    choices:
      - label: "Again"
        next: "action"  # Loop back
      - label: "Stop"
        next: "end"
  end:
    type: "end"
```

## Validation Rules

✓ Must have `name`
✓ Must have `states` object
✓ Must have `start_state`
✓ Start state must exist in states
✓ All state types must be valid: prompt, choice, workflow_ref, or end
✓ Prompt states must have `prompt` field or `prompt_file` field
✓ Choice states must have `choices` array
✓ Next states must exist or be "end"
✓ Each choice must have `label` or `value`
✓ MCP servers (if configured) must have `command`
✓ State MCP server references must exist in workflow config
✓ External files (prompt_file, workflow_ref) must exist

## MCP Servers

Common MCP servers:
- `@modelcontextprotocol/server-filesystem` - File operations
- `@modelcontextprotocol/server-memory` - Data storage
- `@modelcontextprotocol/server-github` - GitHub integration
- `@modelcontextprotocol/server-postgres` - Database queries

Example MCP configuration:
```yaml
mcp_servers:
  fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
```

## Common Models

- `gemma3:4b` - General purpose
- `mistral` - Faster alternative
- `codellama` - Code-specific
- `llama3` - Latest version (if available)
- `phi` - Small and fast

Pull models with:
```bash
ollama pull <model-name>
```

## Tips

1. Always validate before running
2. Start with simple workflows
3. Test prompts in Ollama first
4. Use variables for dynamic content
5. Keep prompts clear and specific
6. Add descriptions to workflows
7. Name states descriptively
8. Use MCP servers for extended capabilities
9. Use external prompt files for long prompts
10. Build modular workflows with workflow references

## Troubleshooting

| Error | Solution |
|-------|----------|
| Cannot connect to Ollama | Run `ollama serve` |
| Model not found | Run `ollama pull <model>` |
| Workflow file not found | Check file path |
| Invalid state type | Use: prompt, choice, workflow_ref, or end |
| Missing start_state | Add `start_state: "state_name"` |
| State not found | Check state names match |
| Prompt file not found | Check path is relative to workflow file |
| Referenced workflow not found | Check workflow_ref path |
