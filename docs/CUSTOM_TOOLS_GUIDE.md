# Custom JavaScript Tools Guide

This guide explains how to create and use custom JavaScript tools in your AI workflows.

## Overview

AgentMech allows you to define your own tools as JavaScript functions and use them in your workflows through the Model Context Protocol (MCP). This enables you to extend workflow capabilities with custom logic, data transformations, external API calls, and more.

## Quick Start

### 1. Create a Tools Directory

First, create a directory to store your custom tool JavaScript files:

```bash
mkdir my-custom-tools
```

### 2. Create a Tool File

Create a JavaScript file (e.g., `calculator.js`) that exports a function:

```javascript
/**
 * Calculator tool - performs basic arithmetic operations
 */
function calculator(args) {
  const { operation, a, b } = args;
  
  switch (operation) {
    case 'add':
      return { result: a + b };
    case 'subtract':
      return { result: a - b };
    case 'multiply':
      return { result: a * b };
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero');
      }
      return { result: a / b };
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// Add metadata to the function
calculator.description = 'Performs basic arithmetic operations (add, subtract, multiply, divide)';
calculator.inputSchema = {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['add', 'subtract', 'multiply', 'divide'],
      description: 'The arithmetic operation to perform',
    },
    a: {
      type: 'number',
      description: 'First number',
    },
    b: {
      type: 'number',
      description: 'Second number',
    },
  },
  required: ['operation', 'a', 'b'],
};

module.exports = calculator;
```

### 3. Configure Your Workflow

Add the custom tools MCP server to your workflow YAML:

```yaml
name: "My Workflow with Custom Tools"
description: "A workflow that uses custom JavaScript tools"
default_model: "gemma3:4b"
start_state: "use_tool"

# Configure custom MCP server with JavaScript tools
mcp_servers:
  custom_tools:
    command: "node"
    args: ["dist/custom-mcp-server.js", "my-custom-tools"]

states:
  use_tool:
    type: "prompt"
    prompt: "Calculate 5 + 3 using the calculator tool"
    mcp_servers: ["custom_tools"]
    save_as: "result"
    next: "end"
  
  end:
    type: "end"
```

### 4. Run Your Workflow

```bash
agentmech run my-workflow.yaml
```

## Tool File Structure

### Basic Function Export

The simplest way to create a tool is to export a function:

```javascript
function myTool(args) {
  // Your tool logic here
  return { result: 'some value' };
}

module.exports = myTool;
```

The filename (without `.js` extension) becomes the tool name. In this example, if the file is named `myTool.js`, the tool name will be `myTool`.

### Adding Metadata

To provide better documentation and validation, add metadata to your function:

```javascript
function myTool(args) {
  const { input } = args;
  return { result: input.toUpperCase() };
}

// Add description
myTool.description = 'Converts text to uppercase';

// Add input schema for validation
myTool.inputSchema = {
  type: 'object',
  properties: {
    input: {
      type: 'string',
      description: 'Text to convert',
    },
  },
  required: ['input'],
};

module.exports = myTool;
```

### Object Export with Configuration

You can also export a configuration object:

```javascript
module.exports = {
  name: 'myTool',
  description: 'Converts text to uppercase',
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Text to convert',
      },
    },
    required: ['input'],
  },
  execute: function(args) {
    const { input } = args;
    return { result: input.toUpperCase() };
  },
};
```

### Async Functions

Tools can be asynchronous:

```javascript
async function fetchData(args) {
  const { url } = args;
  const response = await fetch(url);
  const data = await response.json();
  return { result: data };
}

fetchData.description = 'Fetches data from a URL';
fetchData.inputSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      description: 'URL to fetch data from',
    },
  },
  required: ['url'],
};

module.exports = fetchData;
```

### Multiple Tools in One File

You can export multiple tools from a single file by exporting an object:

```javascript
module.exports = {
  add: {
    description: 'Adds two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
    execute: (args) => ({ result: args.a + args.b }),
  },
  
  multiply: {
    description: 'Multiplies two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
    execute: (args) => ({ result: args.a * args.b }),
  },
};
```

## Input Schema

The `inputSchema` follows JSON Schema specification and is used to:
- Validate input parameters
- Provide documentation to the LLM
- Enable better tooling and IDE support

### Common Schema Types

**String:**
```javascript
inputSchema: {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description: 'Input text',
    },
  },
  required: ['text'],
}
```

**Number:**
```javascript
inputSchema: {
  type: 'object',
  properties: {
    count: {
      type: 'number',
      description: 'Number of items',
      minimum: 0,
      maximum: 100,
    },
  },
  required: ['count'],
}
```

**Enum:**
```javascript
inputSchema: {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['create', 'update', 'delete'],
      description: 'Operation to perform',
    },
  },
  required: ['operation'],
}
```

**Array:**
```javascript
inputSchema: {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'List of items',
    },
  },
  required: ['items'],
}
```

**Object:**
```javascript
inputSchema: {
  type: 'object',
  properties: {
    config: {
      type: 'object',
      properties: {
        timeout: { type: 'number' },
        retries: { type: 'number' },
      },
      description: 'Configuration object',
    },
  },
  required: ['config'],
}
```

## Return Values

Tools should return a value that can be serialized to JSON. Common patterns:

**Simple Value:**
```javascript
return { result: 42 };
```

**Object:**
```javascript
return {
  result: {
    status: 'success',
    data: { /* ... */ },
  },
};
```

**Array:**
```javascript
return {
  result: [1, 2, 3, 4, 5],
};
```

**String (will be converted to JSON):**
```javascript
return "Simple string result";
```

## Error Handling

Throw errors when something goes wrong:

```javascript
function myTool(args) {
  if (!args.required_param) {
    throw new Error('required_param is missing');
  }
  
  try {
    // Your logic here
    return { result: 'success' };
  } catch (error) {
    throw new Error(`Failed to execute: ${error.message}`);
  }
}
```

The error will be properly formatted and returned through the MCP protocol.

## Examples

### Text Processing Tool

```javascript
function textProcess(args) {
  const { operation, text } = args;
  
  const operations = {
    uppercase: () => text.toUpperCase(),
    lowercase: () => text.toLowerCase(),
    reverse: () => text.split('').reverse().join(''),
    wordCount: () => text.split(/\s+/).filter(w => w.length > 0).length,
    charCount: () => text.length,
  };
  
  if (!operations[operation]) {
    throw new Error(`Unknown operation: ${operation}`);
  }
  
  return { result: operations[operation]() };
}

textProcess.description = 'Performs various text processing operations';
textProcess.inputSchema = {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['uppercase', 'lowercase', 'reverse', 'wordCount', 'charCount'],
      description: 'Operation to perform',
    },
    text: {
      type: 'string',
      description: 'Text to process',
    },
  },
  required: ['operation', 'text'],
};

module.exports = textProcess;
```

### HTTP Request Tool

```javascript
const https = require('https');

async function httpRequest(args) {
  const { url, method = 'GET' } = args;
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ result: parsed });
        } catch {
          resolve({ result: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });
    
    req.end();
  });
}

httpRequest.description = 'Makes an HTTP request and returns the response';
httpRequest.inputSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      description: 'URL to request',
    },
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'HTTP method',
    },
  },
  required: ['url'],
};

module.exports = httpRequest;
```

### File System Tool

```javascript
const fs = require('fs').promises;
const path = require('path');

async function fileRead(args) {
  const { filePath, encoding = 'utf8' } = args;
  
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, encoding);
    return { result: content };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

fileRead.description = 'Reads content from a file';
fileRead.inputSchema = {
  type: 'object',
  properties: {
    filePath: {
      type: 'string',
      description: 'Path to the file to read',
    },
    encoding: {
      type: 'string',
      enum: ['utf8', 'ascii', 'base64'],
      description: 'File encoding (default: utf8)',
    },
  },
  required: ['filePath'],
};

module.exports = fileRead;
```

## Best Practices

1. **Use Descriptive Names**: Choose clear, descriptive names for your tools and parameters
2. **Document Everything**: Provide descriptions for tools and all parameters
3. **Validate Input**: Check for required parameters and validate their types
4. **Handle Errors Gracefully**: Throw errors with clear messages when something goes wrong
5. **Return Structured Data**: Return objects with a consistent structure
6. **Keep Tools Focused**: Each tool should do one thing well
7. **Use Input Schema**: Define schemas to help the LLM understand what parameters are expected
8. **Test Your Tools**: Test tools independently before using them in workflows

## Testing Your Tools

You can test your custom tools directly using the custom MCP server:

```bash
# Initialize and list tools
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | \
  node dist/custom-mcp-server.js my-custom-tools

echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | \
  node dist/custom-mcp-server.js my-custom-tools

# Call a tool
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"calculator","arguments":{"operation":"add","a":5,"b":3}}}' | \
  node dist/custom-mcp-server.js my-custom-tools
```

## Troubleshooting

### Tool Not Found

If your tool isn't being loaded:
- Ensure the file has a `.js` extension
- Check that the file is in the tools directory you specified
- Verify the file exports a function or object

### Tool Execution Errors

If tool execution fails:
- Check the error message in the workflow output
- Ensure all required parameters are provided
- Verify parameter types match the schema
- Test the tool independently using the MCP server

### Schema Validation Issues

If parameters aren't being validated correctly:
- Ensure `inputSchema` follows JSON Schema specification
- Check that required fields are listed in the `required` array
- Verify property types are correct

## See Also

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [JSON Schema Documentation](https://json-schema.org/)
- [Examples in the repository](../examples/custom-tools/)
