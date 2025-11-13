# Troubleshooting Guide

This guide helps you diagnose and fix common issues with AgentMech.

## Quick Diagnostics

Run these checks first:

```bash
# Check Node.js version (need 14+)
node --version

# Check if Ollama is running
curl http://localhost:11434/api/tags

# List available models
agentmech list-models

# Validate your workflow
agentmech validate your-workflow.yaml
```

## Installation Issues

### Cannot install AgentMech globally

**Error:**
```
npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules
```

**Solution:**
Use npx or fix npm permissions:

```bash
# Option 1: Use npx (no global install needed)
npx @agentmech/agentmech run workflow.yaml

# Option 2: Fix npm permissions (Linux/Mac)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 3: Install locally and use npm start
git clone https://github.com/mtfuller/agentmech.git
cd agentmech
npm install && npm run build
npm start run examples/simple-qa.yaml
```

### Module not found after installation

**Error:**
```
Error: Cannot find module '@agentmech/agentmech'
```

**Solution:**
```bash
# Reinstall with force
npm install -g @agentmech/agentmech --force

# Or use the full path
/usr/local/bin/agentmech run workflow.yaml
```

### Build fails with TypeScript errors

**Error:**
```
error TS2307: Cannot find module 'js-yaml'
```

**Solution:**
```bash
# Delete and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Connection Issues

### Cannot connect to Ollama

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:11434
```

**Diagnosis:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Check Ollama process
ps aux | grep ollama
```

**Solutions:**

1. **Start Ollama:**
   ```bash
   ollama serve
   ```

2. **Check port:**
   ```bash
   # If Ollama uses different port
   agentmech run workflow.yaml --ollama-url http://localhost:OTHER_PORT
   ```

3. **Check firewall:**
   ```bash
   # Linux - allow port 11434
   sudo ufw allow 11434
   
   # Mac - check System Preferences > Security & Privacy
   ```

4. **Restart Ollama:**
   ```bash
   # Linux
   sudo systemctl restart ollama
   
   # Mac
   killall ollama
   ollama serve
   ```

### Ollama API timeout

**Error:**
```
Error: timeout of 30000ms exceeded
```

**Solutions:**

1. **Use smaller model:**
   ```yaml
   default_model: "phi"  # Smaller and faster
   ```

2. **Increase timeout** (coming in future version)

3. **Check system resources:**
   ```bash
   # Check memory
   free -h
   
   # Check CPU
   top
   ```

4. **Ensure GPU drivers** (if using GPU acceleration)

### Model not found

**Error:**
```
Error: model 'gemma3:4b' not found
```

**Solution:**
```bash
# Pull the model
ollama pull gemma3:4b

# List available models
ollama list

# Check model exists
curl http://localhost:11434/api/tags | jq '.models[].name'
```

## Workflow Errors

### Workflow file not found

**Error:**
```
Error: ENOENT: no such file or directory, open 'workflow.yaml'
```

**Solutions:**

1. **Use correct path:**
   ```bash
   # Relative path
   agentmech run ./examples/simple-qa.yaml
   
   # Absolute path
   agentmech run /full/path/to/workflow.yaml
   ```

2. **Check current directory:**
   ```bash
   pwd
   ls -la *.yaml
   ```

3. **Verify filename:**
   ```bash
   # List all YAML files
   find . -name "*.yaml"
   ```

### Validation fails: "start_state not found"

**Error:**
```
Validation error: start_state "first" does not exist in states
```

**Solution:**
Fix the state name in your workflow:
```yaml
name: "My Workflow"
start_state: "first_state"  # Must match state name below

states:
  first_state:  # This name must match start_state
    type: "prompt"
    prompt: "Hello"
    next: "end"
```

### Validation fails: "next state not found"

**Error:**
```
State "step1" references non-existent next state "step2"
```

**Solution:**
Check all state references:
```yaml
states:
  step1:
    type: "prompt"
    prompt: "First step"
    next: "step_2"  # Typo! Should be "step2"
  
  step2:  # State name
    type: "prompt"
    prompt: "Second step"
    next: "end"
```

### Validation fails: "prompt field missing"

**Error:**
```
Prompt state "my_state" must have either "prompt" or "prompt_file" field
```

**Solution:**
Add a prompt:
```yaml
states:
  my_state:
    type: "prompt"
    prompt: "Your question here"  # Add this
    next: "end"
```

Or use external file:
```yaml
states:
  my_state:
    type: "prompt"
    prompt_file: "prompts/my-prompt.md"  # Or this
    next: "end"
```

### External file not found

**Error:**
```
Error: Prompt file not found: prompts/story.md
```

**Solution:**

1. **Check file exists:**
   ```bash
   ls -la prompts/story.md
   ```

2. **Use correct relative path** (relative to workflow file):
   ```yaml
   # If workflow is in /workflows/main.yaml
   # and prompt is in /workflows/prompts/story.md
   prompt_file: "prompts/story.md"  # Correct
   
   # Not this:
   prompt_file: "/prompts/story.md"  # Wrong
   ```

3. **Verify file permissions:**
   ```bash
   chmod 644 prompts/story.md
   ```

## Variable Issues

### Variables not interpolating

**Problem:**
Variables show as `{{variable}}` in output instead of their value.

**Diagnosis:**
```yaml
states:
  test:
    type: "prompt"
    prompt: "Hello {{name}}"  # Showing literally
    next: "end"
```

**Solutions:**

1. **Ensure variable is defined:**
   ```yaml
   variables:
     name: "Alice"  # Define at workflow level
   
   states:
     get_name:
       type: "input"
       prompt: "Enter name:"
       save_as: "name"  # Or save during execution
   ```

2. **Check variable name matches:**
   ```yaml
   # Case-sensitive!
   save_as: "userName"
   prompt: "Hello {{userName}}"  # Must match exactly
   ```

3. **Verify state order:**
   ```yaml
   states:
     save_var:
       save_as: "result"
       next: "use_var"
     
     use_var:
       prompt: "Result was: {{result}}"  # Only available after save_var
   ```

### Built-in variables not working

**Problem:**
`{{run_directory}}` shows literally instead of actual path.

**Solution:**
```yaml
# Correct usage
states:
  use_run_dir:
    type: "prompt"
    files: ["{{run_directory}}/output.json"]  # Correct
    next: "end"

# Note: run_directory is only available during execution
# It won't show in validation or static checks
```

## MCP Server Issues

### MCP server not connecting

**Error:**
```
Error: Failed to connect to MCP server: filesystem
```

**Diagnosis:**
```bash
# Test MCP server manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | \
  npx -y @modelcontextprotocol/server-filesystem /tmp
```

**Solutions:**

1. **Check configuration:**
   ```yaml
   mcp_servers:
     filesystem:
       command: "npx"  # Correct command
       args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
   ```

2. **Verify npx is available:**
   ```bash
   npx --version
   ```

3. **Test package installation:**
   ```bash
   npx -y @modelcontextprotocol/server-filesystem --help
   ```

4. **Check permissions:**
   ```yaml
   # Ensure directory is accessible
   args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]  # Use accessible dir
   ```

### Custom tools not loading

**Error:**
```
Error: No tools found in directory: ./my-tools
```

**Solutions:**

1. **Check directory exists:**
   ```bash
   ls -la ./my-tools
   ```

2. **Verify tool files:**
   ```bash
   # Tools must be .js files
   ls -la ./my-tools/*.js
   ```

3. **Check tool export:**
   ```javascript
   // my-tool.js
   function myTool(args) {
     return { result: "success" };
   }
   module.exports = myTool;  // Must export!
   ```

4. **Test tool manually:**
   ```bash
   node dist/custom-mcp-server.js ./my-tools
   ```

### AI not using available tools

**Problem:**
MCP tools are configured but AI doesn't use them.

**Solutions:**

1. **Make prompt more explicit:**
   ```yaml
   # Vague - AI might not use tools
   prompt: "Check the files"
   
   # Better - explicitly mention tool action
   prompt: "Use the filesystem tools to list all files in /tmp"
   ```

2. **Verify tools are available to state:**
   ```yaml
   states:
     use_tools:
       type: "prompt"
       prompt: "List files"
       mcp_servers: ["filesystem"]  # Must specify!
       next: "end"
   ```

3. **Check tool descriptions:**
   ```javascript
   // Improve tool description
   myTool.description = 'Lists all files in a directory (use when user asks about files)';
   ```

## RAG Issues

### RAG embeddings generation is slow

**Problem:**
First run with RAG takes very long.

**Explanation:**
This is normal! Generating embeddings for the first time is slow.

**Solutions:**

1. **Be patient** - wait for completion
2. **Reduce chunk size** - creates fewer chunks:
   ```yaml
   rag:
     kb:
       chunk_size: 1000  # Increase from 500
   ```

3. **Reduce knowledge base size:**
   ```bash
   # Move unused files out
   mkdir knowledge-base/archive
   mv knowledge-base/old-docs/* knowledge-base/archive/
   ```

4. **Use cached embeddings** - commit to git:
   ```bash
   git add knowledge-base/embeddings.msgpack
   git commit -m "Add embeddings cache"
   ```

### RAG returns irrelevant results

**Problem:**
Retrieved context doesn't match the query.

**Solutions:**

1. **Increase top_k:**
   ```yaml
   rag:
     kb:
       top_k: 5  # Get more context
   ```

2. **Adjust chunk size:**
   ```yaml
   rag:
     kb:
       chunk_size: 300  # Smaller for precise matching
       # or
       chunk_size: 1500  # Larger for more context
   ```

3. **Improve document quality:**
   - Remove duplicate content
   - Use clear, descriptive text
   - Add section headers
   - Break up large files

4. **Verify embedding model:**
   ```yaml
   rag:
     kb:
       model: "all-minilm"  # Must be embedding model
       # NOT: "gemma3:4b"  # Wrong!
   ```

### Embedding model not found

**Error:**
```
Error: model 'all-minilm' not found
```

**Solution:**
```bash
# Pull embedding model
ollama pull all-minilm

# Verify it's available
ollama list | grep minilm
```

### Embeddings dimension mismatch

**Error:**
```
Warning: Dimension mismatch. Expected 384, got 512
```

**Solution:**
```bash
# Delete and regenerate embeddings
rm knowledge-base/embeddings.msgpack

# Ensure consistent model
ollama pull all-minilm
agentmech run workflow.yaml
```

### RAG directory not found

**Error:**
```
Error: RAG directory not found: ./knowledge-base
```

**Solution:**

1. **Create directory:**
   ```bash
   mkdir -p knowledge-base
   ```

2. **Add some documents:**
   ```bash
   echo "Sample content" > knowledge-base/doc1.txt
   ```

3. **Check path in workflow:**
   ```yaml
   rag:
     kb:
       directory: "./knowledge-base"  # Relative to workflow file
   ```

## Testing Issues

### Test workflow not found

**Error:**
```
Error: Cannot find workflow: my-workflow.yaml
```

**Solution:**

1. **Use correct path in test file:**
   ```yaml
   # test.yaml
   workflow: "../workflows/my-workflow.yaml"  # Relative to test file
   ```

2. **Or use absolute path:**
   ```yaml
   workflow: "/full/path/to/my-workflow.yaml"
   ```

### Test inputs not working

**Problem:**
Test fails even though input is provided.

**Diagnosis:**
```yaml
test_scenarios:
  - name: "Test"
    inputs:
      - state: "get_name"  # Must match exact state name
        value: "Alice"
    assertions:
      - type: "equals"
        target: "name"  # Must match save_as variable
        value: "Alice"
```

**Solutions:**

1. **Check state name matches:**
   ```yaml
   # In workflow
   states:
     get_name:  # Exact name
       type: "input"
       save_as: "name"
   
   # In test
   inputs:
     - state: "get_name"  # Must match exactly
   ```

2. **Verify save_as matches:**
   ```yaml
   # Workflow
   save_as: "user_name"
   
   # Test assertion
   target: "user_name"  # Must match
   ```

### Assertion always fails

**Problem:**
Contains assertion fails even though text is present.

**Solutions:**

1. **Check exact text:**
   ```yaml
   # Case-sensitive!
   assertions:
     - type: "contains"
       target: "response"
       value: "hello"  # Won't match "Hello"
   ```

2. **Use broader match:**
   ```yaml
   assertions:
     - type: "regex"
       target: "response"
       value: "[Hh]ello"  # Matches both cases
   ```

3. **Check variable name:**
   ```yaml
   # Must match save_as from workflow
   target: "result"  # Check this matches save_as
   ```

## Performance Issues

### Workflow runs very slowly

**Diagnosis:**
```bash
# Check system resources
top
free -h

# Check Ollama logs
journalctl -u ollama -f
```

**Solutions:**

1. **Use smaller/faster model:**
   ```yaml
   default_model: "phi"  # Much faster than llama3
   ```

2. **Reduce prompt complexity:**
   ```yaml
   # Instead of
   prompt: "Analyze this in detail with examples and explanations..."
   
   # Use
   prompt: "Summarize this briefly"
   ```

3. **Enable GPU acceleration:**
   - Install NVIDIA drivers (Linux)
   - Ensure CUDA is available
   - Check Ollama uses GPU: `nvidia-smi`

4. **Optimize RAG:**
   ```yaml
   rag:
     kb:
       chunk_size: 1000  # Larger chunks
       top_k: 2  # Fewer chunks
   ```

5. **Reduce MCP overhead:**
   - Only enable needed MCP servers
   - Minimize tool calls

### High memory usage

**Problem:**
System runs out of memory.

**Solutions:**

1. **Use smaller model:**
   ```bash
   # Check model sizes
   ollama list
   
   # Use smaller model
   default_model: "phi"  # ~2GB vs 4-8GB for larger models
   ```

2. **Close other applications**

3. **Increase swap space** (Linux):
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. **Reduce chunk size** (for RAG):
   ```yaml
   rag:
     kb:
       chunk_size: 500  # Smaller chunks use less memory
   ```

## Streaming Issues

### No streaming output

**Problem:**
Response appears all at once instead of token-by-token.

**Diagnosis:**
```bash
# Check Ollama version
ollama --version  # Need v0.1.0+
```

**Solutions:**

1. **Update Ollama:**
   ```bash
   # Linux
   curl https://ollama.ai/install.sh | sh
   
   # Mac
   brew upgrade ollama
   ```

2. **Verify Ollama supports streaming:**
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "gemma3:4b",
     "prompt": "Say hi",
     "stream": true
   }'
   ```

3. **Check AgentMech version:**
   ```bash
   agentmech --version  # Update if old
   npm install -g @agentmech/agentmech@latest
   ```

### Streaming is choppy/delayed

**Problem:**
Tokens appear in bursts instead of smoothly.

**Explanation:**
This is normal for:
- Network buffering
- Model generation speed
- Terminal rendering

**Solutions:**

1. **Use faster model:**
   ```yaml
   model: "phi"  # Generates tokens faster
   ```

2. **Check network latency** (if Ollama is remote)

3. **Verify terminal supports streaming** (some don't)

## Web UI Issues

### Web UI won't start

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Use different port
agentmech serve examples --port 8080

# Or kill process using port 3000
lsof -ti:3000 | xargs kill
```

### Cannot access Web UI from browser

**Problem:**
Browser shows "Connection refused" at http://localhost:3000

**Solutions:**

1. **Check server is running:**
   ```bash
   # Should show "Server running on http://localhost:3000"
   agentmech serve examples
   ```

2. **Try different port:**
   ```bash
   agentmech serve examples --port 3001
   ```

3. **Check firewall:**
   ```bash
   # Linux - allow port
   sudo ufw allow 3000
   ```

4. **Try 127.0.0.1:**
   ```
   http://127.0.0.1:3000
   ```

### Workflows don't appear in Web UI

**Problem:**
Directory is empty or shows no workflows.

**Solutions:**

1. **Check directory path:**
   ```bash
   # Ensure workflows exist
   ls examples/*.yaml
   
   # Start with correct path
   agentmech serve ./examples  # Use ./ for current directory
   ```

2. **Verify YAML syntax:**
   ```bash
   # Invalid YAML files might not load
   agentmech validate examples/*.yaml
   ```

3. **Check browser console** for JavaScript errors (F12)

## Getting Help

If you're still stuck:

1. **Check logs:**
   ```bash
   # Workflow logs
   cat ~/.agentmech/runs/*/log.txt
   
   # Ollama logs (Linux)
   journalctl -u ollama -n 100
   ```

2. **Run with trace:**
   ```bash
   agentmech run workflow.yaml --trace
   ```

3. **Search issues:**
   - https://github.com/mtfuller/agentmech/issues

4. **Create an issue:**
   - Include error messages
   - Share workflow YAML (if possible)
   - Describe steps to reproduce
   - Include system info:
     ```bash
     node --version
     ollama --version
     agentmech --version
     uname -a
     ```

## See Also

- [FAQ.md](FAQ.md) - Frequently asked questions
- [USAGE.md](USAGE.md) - Usage guide
- [README.md](../README.md) - Main documentation
