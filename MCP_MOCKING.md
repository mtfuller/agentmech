# MCP Server Mocking in Tests

## Overview

When running the `ai-workflow test` command, all MCP (Model Context Protocol) server connections are automatically mocked to prevent external processes from being spawned. This ensures tests are:
- **Safe**: No unintended external processes or tool executions
- **Fast**: No overhead from spawning and managing external processes
- **Deterministic**: Tests don't depend on external tools being available

## How It Works

### Architecture

The implementation uses dependency injection to provide different MCP client implementations for different contexts:

1. **Normal Execution** (`ai-workflow run`):
   - Uses `McpClient` which spawns actual processes using `child_process.spawn()`
   - Establishes real MCP protocol connections
   - Executes actual tools and resources

2. **Test Execution** (`ai-workflow test`):
   - Uses `MockMcpClient` which simulates MCP operations
   - Records server registrations and connections in memory
   - Does NOT spawn any processes
   - Returns empty tool/resource lists

### Key Components

#### `IMcpClient` Interface (`src/mcp-types.ts`)
Defines the contract that both real and mock implementations follow:
```typescript
interface IMcpClient {
  registerServer(name: string, config: McpServerConfig): void;
  connectServer(name: string): Promise<void>;
  disconnectServer(name: string): Promise<void>;
  disconnectAll(): Promise<void>;
  getAvailableTools(serverNames?: string[]): Array<{ server: string; tool: McpTool }>;
  getAvailableResources(serverNames?: string[]): Array<{ server: string; resource: McpResource }>;
  isConnected(name: string): boolean;
  getConnectedServers(): string[];
}
```

#### `MockMcpClient` (`src/mock-mcp-client.ts`)
Simulates MCP operations without external processes:
- Validates server configurations
- Tracks connection state
- Provides same interface as real client
- Returns immediately (no async operations)

#### `TestWorkflowExecutor` (`src/test-executor.ts`)
Automatically uses mock client for all test scenarios:
```typescript
constructor(workflow: any, ollamaUrl: string, tracer: Tracer, inputs: TestInput[]) {
  const mockMcpClient = new MockMcpClient(tracer);
  super(workflow, ollamaUrl, tracer, mockMcpClient);
  // ... rest of initialization
}
```

## Example

### Workflow with MCP Servers
```yaml
name: "Example Workflow"
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  custom_tools:
    command: "node"
    args: ["dist/custom-mcp-server.js", "examples/custom-tools"]

states:
  analyze:
    type: "prompt"
    prompt: "Analyze the filesystem"
    mcp_servers: ["filesystem", "custom_tools"]
    next: "end"
```

### Test Scenario
```yaml
workflow: example.yaml
test_scenarios:
  - name: "Test with mocked MCP"
    assertions:
      - type: state_reached
        value: end
```

### Behavior
When running `ai-workflow test example.test.yaml`:
1. MCP servers are registered but NOT spawned
2. Connection attempts succeed immediately (mocked)
3. No external processes are created
4. Test completes safely and quickly

## Verification

You can verify MCP mocking is working by:

1. Adding `console.log()` statements in `MockMcpClient.connectServer()`
2. Monitoring system processes during test execution (no `npx` or `node` child processes)
3. Observing test execution speed (mocked tests complete in milliseconds)

## Benefits

- **No Side Effects**: Tests can't accidentally modify files, execute commands, or interact with external systems
- **Consistent**: Tests produce same results regardless of external tool availability
- **Fast**: Test suites run quickly without process spawn overhead
- **Isolated**: Each test runs in complete isolation

## Limitations

The mock client:
- Does not execute actual MCP protocol communication
- Returns empty tool/resource lists
- Cannot validate MCP tool functionality
- Is for structural testing only (workflow logic, state transitions, assertions)

For testing actual MCP tool functionality, integration tests with real MCP servers would be needed separately.
