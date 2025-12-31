# Tools Configuration Guide

AgentMech now supports a simplified `tools` configuration format that makes it easier to define and use external tools in your workflows.

## Quick Comparison

### Old Format (Still Supported)
```yaml
mcp_servers:
  filesystem:
    type: npx
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
  
  custom_tools:
    type: custom-tools
    tools_directory: "examples/custom-tools"
```

### New Format (Recommended)
```yaml
tools:
  filesystem:
    npm_package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
  
  custom_tools:
    file_path: "examples/custom-tools"
```

## Benefits

1. **Simpler syntax** - Less boilerplate, clearer intent
2. **Easier to read** - More intuitive field names
3. **Backward compatible** - Old format still works
4. **Automatic conversion** - Parser handles the translation internally

## Tool Definition Fields

### For NPM Packages
```yaml
tools:
  my_tool:
    npm_package: "@scope/package-name"  # Required
    args: ["arg1", "arg2"]              # Optional
    env:                                # Optional
      VAR_NAME: "value"
```

### For Custom JavaScript Tools
```yaml
tools:
  my_custom_tool:
    file_path: "path/to/tools/directory"  # Required
    args: ["arg1", "arg2"]                # Optional
    env:                                  # Optional
      VAR_NAME: "value"
```

## Using Tools in States

Reference tools in states using the `mcp_servers` field (the name stays the same for backward compatibility):

```yaml
states:
  my_state:
    type: "prompt"
    prompt: "Do something with the tool"
    mcp_servers: ["my_tool", "my_custom_tool"]
    next: "end"
```

## Migration Guide

To migrate from the old format to the new format:

### NPM Package Tools
**Before:**
```yaml
mcp_servers:
  filesystem:
    type: npx
    package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
```

**After:**
```yaml
tools:
  filesystem:
    npm_package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]
```

### Custom Tools
**Before:**
```yaml
mcp_servers:
  custom_tools:
    type: custom-tools
    tools_directory: "examples/custom-tools"
```

**After:**
```yaml
tools:
  custom_tools:
    file_path: "examples/custom-tools"
```

## Examples

- **tools-configuration-demo.yaml** - Comprehensive demonstration of the new tools format
- **advanced-custom-tools.yaml** - Shows custom JavaScript tools with the new format
- **comprehensive-mcp-integration.yaml** - Demonstrates both old and new formats side-by-side

## Backward Compatibility

You can use both formats in the same workflow file. The `mcp_servers` format is still fully supported and will continue to work. If a tool is defined in both `tools` and `mcp_servers` with the same name, the `mcp_servers` definition takes precedence.

```yaml
# Both formats work together
tools:
  filesystem:
    npm_package: "@modelcontextprotocol/server-filesystem"
    args: ["/tmp"]

mcp_servers:
  memory:
    type: npx
    package: "@modelcontextprotocol/server-memory"

states:
  test:
    type: "prompt"
    prompt: "Use both tools"
    mcp_servers: ["filesystem", "memory"]
    next: "end"
```
