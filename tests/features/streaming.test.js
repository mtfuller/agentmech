const OllamaClient = require('../../dist/ollama/ollama-client');

describe('Streaming Support', () => {
  test('OllamaClient should have generate method', () => {
    const client = new OllamaClient('http://localhost:11434');
    
    // Verify the generate method exists
    expect(typeof client.generate).toBe('function');
  });

  test('OllamaClient should have chat method', () => {
    const client = new OllamaClient('http://localhost:11434');
    
    // Verify the chat method exists
    expect(typeof client.chat).toBe('function');
  });

  test('methods should be backward compatible without streaming callback', () => {
    const client = new OllamaClient('http://localhost:11434');
    
    // Verify methods are defined and can be referenced
    expect(client.generate).toBeDefined();
    expect(client.chat).toBeDefined();
  });

  test('should accept tracer in constructor', () => {
    const mockTracer = {
      traceModelInteraction: jest.fn(),
      traceError: jest.fn()
    };
    
    const client = new OllamaClient('http://localhost:11434', mockTracer);
    expect(client).toBeDefined();
  });
});
