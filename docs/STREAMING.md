# Streaming Support

AgentMech now supports streaming responses from Ollama, allowing you to see tokens as they are generated in real-time.

## Overview

Streaming is automatically enabled for all workflows when you run them. This provides a more interactive experience where you can see the LLM's response appear token-by-token rather than waiting for the complete response.

## How It Works

### CLI (Command Line Interface)

When you run a workflow using the CLI, responses from the LLM are streamed directly to stdout:

```bash
agentmech run examples/streaming-demo.yaml
```

You'll see the response appear character by character as the model generates it, providing immediate feedback and a more engaging experience.

### Web UI

When running workflows through the web interface:

```bash
agentmech serve examples/
```

The web UI displays streaming responses with:
- A blinking cursor indicator while tokens are being generated
- Real-time token-by-token display
- Markdown rendering after the response is complete

## Technical Details

### OllamaClient API

The `OllamaClient` class supports streaming through optional callback parameters:

```typescript
// Generate with streaming
const response = await ollamaClient.generate(
  model,
  prompt,
  options,
  images,
  (token: string) => {
    // This callback is called for each token
    process.stdout.write(token);
  }
);

// Chat with streaming
const response = await ollamaClient.chat(
  model,
  messages,
  options,
  (token: string) => {
    // This callback is called for each token
    console.log(token);
  }
);
```

### Backward Compatibility

Streaming is implemented with full backward compatibility. If no streaming callback is provided, the methods behave exactly as before, returning the complete response.

### Event Types (Web UI)

The web interface uses Server-Sent Events (SSE) with the following event types for streaming:

- `response_start` - Indicates that response generation has begun
- `response_token` - Contains a single token from the stream
- `response_end` - Signals that the response is complete (includes full response)

## Performance

Streaming provides several benefits:

1. **Immediate Feedback**: Users see results instantly as they're generated
2. **Better UX**: The blinking cursor and incremental display create a more engaging experience
3. **No Perceived Delay**: Long responses feel faster because users can start reading immediately
4. **Efficient**: Uses the same API calls as non-streaming but with better user experience

## Examples

### Simple Streaming Demo

Try the included example:

```bash
agentmech run examples/streaming-demo.yaml
```

This demonstrates streaming with a simple story generation prompt.

### Web Interface

Start the web server and open any workflow:

```bash
agentmech serve examples/
# Open http://localhost:3000 in your browser
```

Click on any workflow to see streaming in action.

## Implementation Notes

- Streaming uses Ollama's native streaming API (`stream: true`)
- The implementation handles JSON chunks from the streaming response
- Error handling ensures graceful degradation if streaming fails
- Tracer logs include a `streamed: true` flag for streamed responses
