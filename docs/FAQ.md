# Frequently Asked Questions (FAQ)

## General Questions

### What is AgentMech?

AgentMech is a Node.js CLI tool that allows you to run AI workflows locally using Ollama. It provides a YAML-based configuration system for creating complex AI-powered workflows with state machine logic, making it easy to build interactive AI applications without writing code.

### Do I need an internet connection?

Once Ollama and its models are downloaded, AgentMech can run completely offline. The only internet requirements are:
- Initial installation of AgentMech via npm
- Installing Ollama and pulling models
- Using MCP servers that require external services (like web browsing)

### What are the system requirements?

- **Node.js**: v14 or higher
- **Ollama**: Latest version from [ollama.ai](https://ollama.ai/)
- **Disk Space**: Varies by model (typically 4-8GB per model)
- **RAM**: 8GB minimum, 16GB+ recommended for larger models
- **OS**: Linux, macOS, or Windows

## Installation & Setup

### How do I install AgentMech?

```bash
# Global installation (recommended)
npm install -g @agentmech/agentmech

# Or from source
git clone https://github.com/mtfuller/agentmech.git
cd agentmech
npm install && npm run build
```

### How do I install Ollama?

Visit [ollama.ai](https://ollama.ai/) and download the installer for your operating system. After installation:

```bash
# Start Ollama server
ollama serve

# Pull a model
ollama pull gemma3:4b
```

### Which model should I use?

**For general use:**
- `gemma3:4b` - Balanced speed and quality (recommended)
- `mistral` - Fast and efficient
- `llama3` - High quality responses

**For specific tasks:**
- `codellama` - Code generation and analysis
- `llava` - Image analysis and vision tasks
- `phi` - Small and fast for simple tasks

**For RAG embeddings:**
- `all-minilm` - Fast and efficient (recommended)
- `embeddinggemma` - High quality embeddings
- `qwen3-embedding` - Alternative embedding model

### Why can't AgentMech connect to Ollama?

Common causes:
1. **Ollama not running**: Start it with `ollama serve`
2. **Wrong port**: Default is 11434, use `--ollama-url` if different
3. **Firewall blocking**: Check firewall settings
4. **Ollama crashed**: Restart the Ollama service

Check if Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

## Workflows

### How do I create my first workflow?

Use the guided generation command:

```bash
agentmech generate
```

This will walk you through creating a workflow with AI assistance.

Or create a simple YAML file:

```yaml
name: "My First Workflow"
default_model: "gemma3:4b"
start_state: "greeting"

states:
  greeting:
    type: "prompt"
    prompt: "Say hello to the user"
    next: "end"
```

### What's the difference between `prompt` and `input` states?

- **`prompt` state**: Sends a query to the AI model and gets a response
- **`input` state**: Asks the user for text input, stores it in a variable

Example:
```yaml
states:
  # Get user input
  get_name:
    type: "input"
    prompt: "What's your name?"
    save_as: "username"
    next: "greet"
  
  # Use AI to generate response
  greet:
    type: "prompt"
    prompt: "Generate a friendly greeting for {{username}}"
    next: "end"
```

### How do I use variables in workflows?

Variables can be defined at workflow level or saved during execution:

```yaml
# Workflow-level variables
variables:
  company_name: "Acme Corp"
  
  # Load from file
  system_prompt:
    file: "prompts/system.txt"

states:
  greeting:
    type: "prompt"
    prompt: "Welcome to {{company_name}}!"
    save_as: "welcome_message"  # Save AI response as variable
    next: "next_state"
  
  next_state:
    type: "prompt"
    prompt: "Continue from: {{welcome_message}}"
    next: "end"
```

### What is the `end` state?

`end` is a reserved state name that terminates the workflow. You don't need to define it - just reference it in the `next` field:

```yaml
final_step:
  type: "prompt"
  prompt: "Final message"
  next: "end"  # Workflow ends here
```

### How do I handle errors in workflows?

Use `on_error` to specify fallback states:

```yaml
# Workflow-level error handler
on_error: "handle_error"

states:
  risky_operation:
    type: "prompt"
    prompt: "Process complex data"
    on_error: "specific_handler"  # State-level override
    next: "success"
  
  specific_handler:
    type: "prompt"
    prompt: "Handle specific error"
    next: "end"
  
  handle_error:
    type: "prompt"
    prompt: "General error recovery"
    next: "end"
```

### Can I call other workflows from a workflow?

Yes! Use `workflow_ref` state type:

```yaml
states:
  call_subworkflow:
    type: "workflow_ref"
    workflow_ref: "path/to/other-workflow.yaml"
    next: "continue"
  
  continue:
    type: "prompt"
    prompt: "Continue after subworkflow"
    next: "end"
```

## MCP Servers

### What are MCP servers?

Model Context Protocol (MCP) servers extend AgentMech with additional tools and capabilities. Think of them as plugins that give the AI access to external systems like:
- File systems
- Databases
- Web browsers
- APIs
- Custom tools

### How do I use MCP servers?

Configure them in your workflow:

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  
  browser:
    type: npx
    package: "@modelcontextprotocol/server-playwright"

states:
  use_tools:
    type: "prompt"
    prompt: "List files in /tmp and visit example.com"
    mcp_servers: ["filesystem", "browser"]  # Enable for this state
    next: "end"
```

### Which MCP servers are available?

**Official MCP servers:**
- `@modelcontextprotocol/server-filesystem` - File operations
- `@modelcontextprotocol/server-memory` - Store and recall data
- `@modelcontextprotocol/server-github` - GitHub integration
- `@modelcontextprotocol/server-postgres` - Database queries
- `@modelcontextprotocol/server-playwright` - Web browser automation
- `@modelcontextprotocol/server-puppeteer` - Alternative browser

**Custom tools:**
- Create your own JavaScript tools (see [CUSTOM_TOOLS_GUIDE.md](CUSTOM_TOOLS_GUIDE.md))

### How do I create custom tools?

Create JavaScript files that export functions:

```javascript
// my-tool.js
function myTool(args) {
  const { input } = args;
  return { result: input.toUpperCase() };
}

myTool.description = 'Converts text to uppercase';
myTool.inputSchema = {
  type: 'object',
  properties: {
    input: { type: 'string', description: 'Text to convert' }
  },
  required: ['input']
};

module.exports = myTool;
```

Use in workflow:
```yaml
mcp_servers:
  custom_tools:
    command: "node"
    args: ["dist/custom-mcp-server.js", "path/to/tools"]

states:
  use_custom:
    type: "prompt"
    prompt: "Convert 'hello' to uppercase using my-tool"
    mcp_servers: ["custom_tools"]
    next: "end"
```

## RAG (Retrieval-Augmented Generation)

### What is RAG?

RAG allows your workflows to search through a knowledge base of documents and include relevant information in AI prompts. This makes responses more accurate and grounded in your specific content.

### How do I set up RAG?

1. Create a directory with your documents (`.txt`, `.md`, `.json`, etc.)
2. Configure RAG in your workflow:

```yaml
rag:
  knowledge_base:
    directory: "./knowledge-base"
    model: "all-minilm"
    chunk_size: 500
    top_k: 3

states:
  answer_question:
    type: "prompt"
    prompt: "What is our refund policy?"
    use_rag: "knowledge_base"
    next: "end"
```

### Which models work for RAG embeddings?

Only these specialized embedding models are supported:
- ✅ `all-minilm` (recommended - fast)
- ✅ `embeddinggemma` (high quality)
- ✅ `qwen3-embedding` (alternative)

❌ General models like `gemma3:4b`, `mistral`, or `codellama` will NOT work for embeddings.

### How do I update my knowledge base?

When you update files in your knowledge base directory:

1. **Delete the embeddings cache file** (e.g., `embeddings.msgpack` or `embeddings.json`)
2. **Run your workflow** - it will regenerate embeddings from scratch

```bash
# Delete cache
rm knowledge-base/embeddings.msgpack

# Run workflow (will rebuild cache)
agentmech run my-workflow.yaml
```

### What's the difference between MessagePack and JSON for embeddings?

**MessagePack (default):**
- ~79% smaller file size
- Faster loading and saving
- Binary format (`.msgpack`)
- Recommended for most use cases

**JSON (legacy):**
- Human-readable
- Larger file size
- Use `storageFormat: "json"` if needed

Existing JSON embeddings are automatically migrated to MessagePack.

### How do I customize RAG context injection?

Use custom templates:

```yaml
rag:
  kb:
    directory: "./docs"
    chunk_template: |
      {{number}}. From {{chunk.source}}:
      {{chunk.text}}
    context_template: |
      Reference Documentation:
      {{chunks}}
      
      Query: {{prompt}}
```

## Testing

### How do I test my workflows?

Create a test file with `.test.yaml` extension:

```yaml
workflow: my-workflow.yaml
test_scenarios:
  - name: "Basic test"
    inputs:
      - state: "get_name"
        value: "Alice"
    assertions:
      - type: "equals"
        target: "name"
        value: "Alice"
      - type: "contains"
        target: "greeting"
        value: "Alice"
      - type: "state_reached"
        value: "end"
```

Run tests:
```bash
agentmech test my-workflow.test.yaml
```

### What assertion types are available?

- `equals` - Exact match
- `contains` - Contains substring
- `not_contains` - Does not contain substring
- `regex` - Regular expression match
- `state_reached` - Workflow reached specific state

### Can I generate test reports?

Yes! Use output formats:

```bash
# Markdown report
agentmech test workflow.test.yaml --format markdown --output report.md

# JSON report
agentmech test workflow.test.yaml --format json --output report.json
```

## Web UI

### How do I use the web interface?

Start the web server:

```bash
agentmech serve ./examples
# or
agentmech serve ./my-workflows --port 8080
```

Open your browser to `http://localhost:3000` (or your custom port).

### What can I do in the web UI?

- Browse all workflows in a directory
- View workflow details and structure
- Run workflows with streaming responses
- Validate workflow syntax
- See execution history

### Can I deploy the web UI to production?

The web UI is designed for local development and testing. For production:
- Consider building a custom frontend using AgentMech as a backend
- Implement proper authentication and security
- Use a production-grade web server (nginx, Apache)
- Add monitoring and logging

## Multimodal

### Can I analyze images with AgentMech?

Yes! Use vision models and attach image files:

```yaml
states:
  analyze_image:
    type: "prompt"
    prompt: "What's in this image?"
    model: "llava"  # Use a vision model
    files: ["photo.jpg"]
    next: "end"
```

### What file types are supported?

**Images:**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`

**Text files:**
- `.txt`, `.md`, `.json`, `.yaml`, `.yml`, `.csv`
- `.js`, `.ts`, `.py`, `.html`, `.css`

### How do I reference files in the run directory?

Use the `{{run_directory}}` variable:

```yaml
states:
  create_output:
    type: "prompt"
    prompt: "Generate data and save to output.json"
    next: "read_output"
  
  read_output:
    type: "prompt"
    prompt: "Analyze this file"
    files: ["{{run_directory}}/output.json"]
    next: "end"
```

## Performance & Optimization

### Why is my workflow slow?

Common causes:
1. **Large model**: Try a smaller model like `phi` or `mistral`
2. **RAG embeddings**: First run generates embeddings (cache for reuse)
3. **Complex prompts**: Simplify or break into smaller steps
4. **MCP servers**: External tools add latency

### How can I speed up RAG?

1. **Use cached embeddings**: Commit `.msgpack` files to version control
2. **Increase chunk size**: Fewer chunks = faster search
3. **Reduce top_k**: Retrieve fewer chunks
4. **Use MessagePack**: ~79% smaller, faster loading
5. **Keep knowledge base focused**: Only include relevant documents

### Should I commit embeddings to git?

Yes! Embeddings cache files should be committed:
- Faster for team members (no regeneration needed)
- Consistent results across environments
- MessagePack format is compact (~79% smaller than JSON)

Add to `.gitignore` only if:
- Knowledge base changes frequently
- Embeddings are too large (>100MB)
- Privacy concerns with content

## Troubleshooting

### My workflow validation fails with "State not found"

Check that:
- All states referenced in `next` fields exist
- State names match exactly (case-sensitive)
- `start_state` references a valid state
- No typos in state names

### Variables aren't being interpolated

Make sure:
- Variables use double curly braces: `{{variable}}`
- Variable names match exactly
- Variables are saved with `save_as` before use
- Workflow-level variables are defined in `variables` section

### MCP tools aren't available to the AI

Verify:
- MCP server is configured in `mcp_servers` section
- State includes `mcp_servers: ["server_name"]`
- Server command is correct and package is installed
- Check logs for MCP connection errors

### Streaming doesn't work

Streaming should work automatically. If not:
- Ensure using latest AgentMech version
- Check that Ollama supports streaming (v0.1.0+)
- Verify Ollama is running: `curl http://localhost:11434/api/tags`

### RAG returns irrelevant results

Try:
- Increase `top_k` to get more context
- Adjust `chunk_size` (smaller for precision, larger for context)
- Improve document quality and organization
- Verify correct embedding model is being used
- Check that embeddings were generated successfully

## Advanced Topics

### Can I use loops in workflows?

Yes! Use LLM-driven routing with `next_options`:

```yaml
states:
  action:
    type: "prompt"
    prompt: "Perform action"
    next: "ask_continue"
  
  ask_continue:
    type: "input"
    prompt: "Continue? (yes/no)"
    save_as: "continue"
    next: "decide"
  
  decide:
    type: "prompt"
    prompt: "User said: {{continue}}"
    next_options:
      - state: "action"  # Loop back
        description: "User wants to continue"
      - state: "end"
        description: "User wants to stop"
```

### How do I debug workflows?

Use these techniques:

1. **Enable tracing**:
   ```bash
   agentmech run workflow.yaml --trace
   ```

2. **Check logs** in `~/.agentmech/runs/<workflow>-<timestamp>/`

3. **Add debug states**:
   ```yaml
   debug:
     type: "prompt"
     prompt: "Current variables: {{var1}}, {{var2}}"
     next: "continue"
   ```

4. **Validate before running**:
   ```bash
   agentmech validate workflow.yaml
   ```

5. **Use smaller test workflows** to isolate issues

### Can I use AgentMech in production?

AgentMech is designed for local development and experimentation. For production:

**Consider:**
- ✅ Build on top of AgentMech's workflow engine
- ✅ Use as a backend service with proper API
- ✅ Implement authentication and rate limiting
- ✅ Add monitoring and error tracking
- ✅ Use production-grade hosting

**Be aware:**
- ⚠️ Ollama needs local model files (GPU recommended)
- ⚠️ Add security measures (input validation, sandboxing)
- ⚠️ Monitor resource usage (CPU, RAM, disk)
- ⚠️ Consider model licensing for commercial use

### How do I contribute to AgentMech?

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

See issues at: https://github.com/mtfuller/agentmech/issues

## Getting Help

### Where can I get help?

- **Documentation**: Check [README.md](../README.md) and [USAGE.md](USAGE.md)
- **Examples**: Browse the `examples/` directory
- **Issues**: Search [GitHub Issues](https://github.com/mtfuller/agentmech/issues)
- **New Issue**: Create an issue if you find a bug or need a feature

### How do I report a bug?

Create an issue with:
1. Clear description of the problem
2. Steps to reproduce
3. Expected vs actual behavior
4. Workflow YAML (if applicable)
5. Error messages and logs
6. Environment info (OS, Node version, Ollama version)

### How do I request a feature?

Create an issue describing:
1. What you want to accomplish
2. Why current features don't work
3. Proposed solution or API
4. Example use case

## See Also

- [README.md](../README.md) - Main documentation
- [USAGE.md](USAGE.md) - Detailed usage guide
- [QUICKREF.md](QUICKREF.md) - Quick reference
- [CUSTOM_TOOLS_GUIDE.md](CUSTOM_TOOLS_GUIDE.md) - Custom tools
- [RAG_GUIDE.md](RAG_GUIDE.md) - RAG implementation
- [WEB_BROWSING_GUIDE.md](../examples/WEB_BROWSING_GUIDE.md) - Web automation
- [STREAMING.md](STREAMING.md) - Streaming support
