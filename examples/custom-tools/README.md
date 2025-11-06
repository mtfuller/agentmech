# Custom Tools Examples

This directory contains example JavaScript tool implementations that can be used in AI workflows.

## Available Tools

### calculator.js
Performs basic arithmetic operations:
- `add`: Add two numbers
- `subtract`: Subtract two numbers
- `multiply`: Multiply two numbers
- `divide`: Divide two numbers

**Example:**
```javascript
{ operation: 'add', a: 5, b: 3 } // Returns: { result: 8 }
```

### text-transform.js
Provides various text manipulation operations:
- `uppercase`: Convert text to uppercase
- `lowercase`: Convert text to lowercase
- `reverse`: Reverse the text
- `word_count`: Count words in text
- `char_count`: Count characters in text

**Example:**
```javascript
{ operation: 'uppercase', text: 'hello' } // Returns: { result: 'HELLO' }
```

### date-time.js
Date and time utilities:
- `current`: Get current date/time in ISO format
- `parse`: Parse a date string
- `format`: Format a date (date, time, iso, full)
- `timestamp`: Get timestamp in milliseconds

**Example:**
```javascript
{ operation: 'current' } // Returns: { result: '2024-01-15T10:30:00.000Z' }
```

### json-util.js
JSON parsing, validation, and extraction:
- `parse`: Parse JSON string to object
- `stringify`: Convert object to JSON string
- `validate`: Check if string is valid JSON
- `extract`: Extract value from JSON object using path

**Example:**
```javascript
{ operation: 'validate', input: '{"name": "John"}' } // Returns: { result: true, message: 'Valid JSON' }
```

## Using in Workflows

To use these tools in your workflows:

1. Configure the custom MCP server in your workflow YAML:

```yaml
mcp_servers:
  custom_tools:
    command: "node"
    args: ["dist/custom-mcp-server.js", "examples/custom-tools"]
```

2. Reference the tools in your states:

```yaml
states:
  my_state:
    type: "prompt"
    prompt: "Use the calculator to add 5 and 3"
    mcp_servers: ["custom_tools"]
    next: "end"
```

## Creating Your Own Tools

See the [Custom Tools Guide](../../CUSTOM_TOOLS_GUIDE.md) for detailed instructions on creating your own custom tools.

## Testing Tools

You can test individual tools using the custom MCP server:

```bash
# List all available tools
(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'; \
 echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}') | \
  node dist/custom-mcp-server.js examples/custom-tools

# Call a tool
(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'; \
 echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"calculator","arguments":{"operation":"add","a":5,"b":3}}}') | \
  node dist/custom-mcp-server.js examples/custom-tools
```
