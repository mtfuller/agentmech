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
  
  # Custom JavaScript tools
  custom_tools:
    command: "node"
    args: ["dist/custom-mcp-server.js", "path/to/tools"]

states:
  state_name:
    type: "prompt" | "input" | "workflow_ref" | "end"
    mcp_servers: ["server_name"]  # optional
    # ... configuration
    next: "next_state" | "end"
```

## Custom JavaScript Tools

Create custom tools as JavaScript functions:

```javascript
// my-tool.js
function myTool(args) {
  const { param1, param2 } = args;
  return { result: param1 + param2 };
}

myTool.description = 'My custom tool';
myTool.inputSchema = {
  type: 'object',
  properties: {
    param1: { type: 'number' },
    param2: { type: 'number' },
  },
  required: ['param1', 'param2'],
};

module.exports = myTool;
```

Use in workflow:
```yaml
mcp_servers:
  custom_tools:
    command: "node"
    args: ["dist/custom-mcp-server.js", "tools-directory"]

states:
  use_tool:
    type: "prompt"
    prompt: "Use my-tool to add 5 and 3"
    mcp_servers: ["custom_tools"]
    next: "end"
```

See [CUSTOM_TOOLS_GUIDE.md](CUSTOM_TOOLS_GUIDE.md) for details.

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

Or with LLM-driven routing (let AI choose next state):
```yaml
my_state:
  type: "prompt"
  prompt: "Your question here"
  save_as: "variable_name"
  next_options:                # LLM chooses best path
    - state: "option_1"
      description: "When condition A is met"
    - state: "option_2"
      description: "When condition B is met"
```

Or load from external file:
```yaml
my_state:
  type: "prompt"
  prompt_file: "prompts/my-prompt.md"
  save_as: "variable_name"
  next: "next_state"
```

### Input State
```yaml
my_state:
  type: "input"
  prompt: "What is your name?"  # Question to ask
  save_as: "input_var"          # optional
  default_value: "Default"      # optional
  next: "next_state"
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
  type: "input"
  prompt: "What is your name?"
  save_as: "name"
  next: "greet"

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

### Input → Prompt → End
```yaml
name: "Input Flow"
start_state: "get_input"
states:
  get_input:
    type: "input"
    prompt: "Enter your choice (A or B):"
    save_as: "user_choice"
    next: "process"
  process:
    type: "prompt"
    prompt: "You chose {{user_choice}}"
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
    type: "input"
    prompt: "Continue? (yes/no)"
    save_as: "continue"
    next: "check_continue"
  check_continue:
    type: "prompt"
    prompt: "User wants to continue: {{continue}}"
    next_options:
      - state: "action"
        description: "User wants to continue"
      - state: "end"
        description: "User wants to stop"
  end:
    type: "end"
```

## Validation Rules

✓ Must have `name`
✓ Must have `states` object
✓ Must have `start_state`
✓ Start state must exist in states
✓ All state types must be valid: prompt, input, workflow_ref, or end
✓ Prompt states must have `prompt` field or `prompt_file` field
✓ Input states must have `prompt` field
✓ Next states must exist or be "end"
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
| Invalid state type | Use: prompt, input, workflow_ref, or end |
| Missing start_state | Add `start_state: "state_name"` |
| State not found | Check state names match |
| Prompt file not found | Check path is relative to workflow file |
| Referenced workflow not found | Check workflow_ref path |
