const { RAGService } = require('../../dist/rag/rag-service');

describe('RAG Context Formatting', () => {
  // Mock chunks for testing
  const mockChunks = [
    {
      id: 'doc1_chunk_0',
      text: 'AgentMech is a Node.js CLI tool for running AI workflows locally with Ollama.',
      source: 'README.md'
    },
    {
      id: 'doc2_chunk_0',
      text: 'RAG (Retrieval-Augmented Generation) allows workflows to retrieve relevant context from a knowledge base.',
      source: 'docs/RAG_GUIDE.md'
    }
  ];

  describe('Default formatting', () => {
    test('should format chunks with default template', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack'
      };
      
      const ragService = new RAGService(config);
      const formatted = ragService.formatContext(mockChunks);
      
      expect(formatted).toContain('Relevant context from knowledge base:');
      expect(formatted).toContain('[Source: README.md]');
      expect(formatted).toContain('[Source: docs/RAG_GUIDE.md]');
      expect(formatted).toContain('AgentMech is a Node.js CLI tool');
      expect(formatted).toContain('RAG (Retrieval-Augmented Generation)');
    });

    test('should return empty string for no chunks', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack'
      };
      
      const ragService = new RAGService(config);
      const formatted = ragService.formatContext([]);
      
      expect(formatted).toBe('');
    });
  });

  describe('Custom chunk template', () => {
    test('should format chunks with custom chunk template', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack',
        chunkTemplate: '{{number}}. From {{chunk.source}}:\n{{chunk.text}}'
      };
      
      const ragService = new RAGService(config);
      const formatted = ragService.formatContext(mockChunks);
      
      expect(formatted).toContain('1. From README.md:');
      expect(formatted).toContain('2. From docs/RAG_GUIDE.md:');
      expect(formatted).toContain('AgentMech is a Node.js CLI tool');
    });

    test('should support chunk.id placeholder', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack',
        chunkTemplate: 'ID: {{chunk.id}} - {{chunk.text}}'
      };
      
      const ragService = new RAGService(config);
      const formatted = ragService.formatContext(mockChunks);
      
      expect(formatted).toContain('ID: doc1_chunk_0');
      expect(formatted).toContain('ID: doc2_chunk_0');
    });

    test('should support index placeholder (0-based)', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack',
        chunkTemplate: '[{{index}}] {{chunk.text}}'
      };
      
      const ragService = new RAGService(config);
      const formatted = ragService.formatContext(mockChunks);
      
      expect(formatted).toContain('[0]');
      expect(formatted).toContain('[1]');
    });
  });

  describe('Custom context template', () => {
    test('should format context with custom template and chunks placeholder', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack',
        contextTemplate: 'Reference materials:\n{{chunks}}'
      };
      
      const ragService = new RAGService(config);
      const formatted = ragService.formatContext(mockChunks);
      
      expect(formatted).toContain('Reference materials:');
      expect(formatted).toContain('[Source: README.md]');
      expect(formatted).toContain('AgentMech is a Node.js CLI tool');
    });

    test('should include prompt in context template', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack',
        contextTemplate: 'Context:\n{{chunks}}\n\nQuestion: {{prompt}}'
      };
      
      const ragService = new RAGService(config);
      const prompt = 'What is AgentMech?';
      const formatted = ragService.formatContext(mockChunks, prompt);
      
      expect(formatted).toContain('Context:');
      expect(formatted).toContain('Question: What is AgentMech?');
      expect(formatted).toContain('[Source: README.md]');
    });

    test('should handle prompt placeholder when prompt not provided', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack',
        contextTemplate: 'Context:\n{{chunks}}\n\nQuestion: {{prompt}}'
      };
      
      const ragService = new RAGService(config);
      const formatted = ragService.formatContext(mockChunks);
      
      expect(formatted).toContain('Context:');
      expect(formatted).toContain('Question: ');
      expect(formatted).not.toContain('{{prompt}}');
    });
  });

  describe('Combined custom templates', () => {
    test('should use both chunk and context templates together', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack',
        chunkTemplate: '- Source: {{chunk.source}}\n  Content: {{chunk.text}}',
        contextTemplate: 'Knowledge Base References:\n{{chunks}}\n\nUser Query: {{prompt}}\n\nPlease answer based on the references above.'
      };
      
      const ragService = new RAGService(config);
      const prompt = 'Tell me about RAG';
      const formatted = ragService.formatContext(mockChunks, prompt);
      
      expect(formatted).toContain('Knowledge Base References:');
      expect(formatted).toContain('- Source: README.md');
      expect(formatted).toContain('  Content: AgentMech is a Node.js CLI tool');
      expect(formatted).toContain('- Source: docs/RAG_GUIDE.md');
      expect(formatted).toContain('User Query: Tell me about RAG');
      expect(formatted).toContain('Please answer based on the references above.');
    });

    test('should preserve newlines and formatting in templates', () => {
      const config = {
        directory: './test',
        model: 'all-minilm',
        embeddingsFile: 'embeddings.msgpack',
        chunkSize: 1000,
        topK: 3,
        storageFormat: 'msgpack',
        chunkTemplate: '### {{chunk.source}}\n{{chunk.text}}',
        contextTemplate: '## Context Information\n\n{{chunks}}\n\n---\n\n**Query**: {{prompt}}'
      };
      
      const ragService = new RAGService(config);
      const prompt = 'Explain the feature';
      const formatted = ragService.formatContext(mockChunks, prompt);
      
      expect(formatted).toContain('## Context Information');
      expect(formatted).toContain('### README.md');
      expect(formatted).toContain('### docs/RAG_GUIDE.md');
      expect(formatted).toContain('---');
      expect(formatted).toContain('**Query**: Explain the feature');
    });
  });
});
