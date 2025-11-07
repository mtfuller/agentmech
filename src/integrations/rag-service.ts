import * as fs from 'fs';
import * as path from 'path';
import { encode, decode } from '@msgpack/msgpack';
import OllamaClient = require('./ollama-client');

interface DocumentChunk {
  id: string;
  text: string;
  source: string;
  embedding?: number[];
}

interface RagConfig {
  directory: string;
  model?: string;
  embeddings_file?: string;
  chunk_size?: number;
  top_k?: number;
  storage_format?: 'json' | 'msgpack';
}

// Constants for embeddings storage
const DEFAULT_JSON_EMBEDDINGS_FILE = 'embeddings.json';
const DEFAULT_MSGPACK_EMBEDDINGS_FILE = 'embeddings.msgpack';
const MSGPACK_EXTENSIONS = ['.msgpack', '.mp']; // .mp is a common short extension for MessagePack

interface EmbeddingsStore {
  chunks: DocumentChunk[];
  config: RagConfig;
  createdAt: string;
}

class RagService {
  private ollamaClient: OllamaClient;
  private config: RagConfig;
  private chunks: DocumentChunk[] = [];

  constructor(config: RagConfig, ollamaUrl: string = 'http://localhost:11434') {
    this.config = {
      model: config.model || 'gemma3:4b',
      embeddings_file: config.embeddings_file || DEFAULT_MSGPACK_EMBEDDINGS_FILE,
      chunk_size: config.chunk_size || 1000,
      top_k: config.top_k || 3,
      storage_format: config.storage_format || 'msgpack',
      ...config
    };
    this.ollamaClient = new OllamaClient(ollamaUrl);
  }

  /**
   * Initialize RAG by loading or creating embeddings
   */
  async initialize(): Promise<void> {
    const embeddingsPath = path.join(this.config.directory, this.config.embeddings_file!);
    
    // Check if embeddings file exists
    if (fs.existsSync(embeddingsPath)) {
      console.log(`Loading existing embeddings from ${embeddingsPath}`);
      await this.loadEmbeddings(embeddingsPath);
    } else {
      // Check for legacy JSON file if using msgpack format
      if (this.config.storage_format === 'msgpack') {
        const legacyJsonPath = path.join(this.config.directory, DEFAULT_JSON_EMBEDDINGS_FILE);
        if (fs.existsSync(legacyJsonPath)) {
          console.log(`Found legacy JSON embeddings at ${legacyJsonPath}`);
          console.log(`Migrating to MessagePack format at ${embeddingsPath}`);
          await this.loadEmbeddings(legacyJsonPath);
          await this.saveEmbeddings(embeddingsPath);
          console.log(`Migration complete. You can delete ${legacyJsonPath} if desired.`);
        } else {
          console.log(`Creating new embeddings from ${this.config.directory}`);
          await this.createEmbeddings();
          await this.saveEmbeddings(embeddingsPath);
        }
      } else {
        console.log(`Creating new embeddings from ${this.config.directory}`);
        await this.createEmbeddings();
        await this.saveEmbeddings(embeddingsPath);
      }
    }
    
    console.log(`RAG initialized with ${this.chunks.length} chunks`);
  }

  /**
   * Load embeddings from file
   */
  private async loadEmbeddings(filePath: string): Promise<void> {
    try {
      // Auto-detect format based on file extension
      const fileExt = path.extname(filePath).toLowerCase();
      const isMsgpack = MSGPACK_EXTENSIONS.includes(fileExt);
      
      let store: EmbeddingsStore;
      
      if (isMsgpack) {
        // Load MessagePack format
        const buffer = fs.readFileSync(filePath);
        store = decode(buffer) as EmbeddingsStore;
        console.log(`Loaded embeddings from MessagePack format`);
      } else {
        // Try JSON format (legacy or explicitly .json)
        const data = fs.readFileSync(filePath, 'utf8');
        store = JSON.parse(data);
        console.log(`Loaded embeddings from JSON format`);
      }
      
      // Validate embeddings store structure
      if (!store.chunks || !Array.isArray(store.chunks)) {
        throw new Error('Invalid embeddings file: missing or invalid chunks array');
      }
      
      // Validate that chunks have required fields
      for (const chunk of store.chunks) {
        if (!chunk.id || !chunk.text || !chunk.embedding) {
          throw new Error('Invalid embeddings file: chunks missing required fields');
        }
      }
      
      this.chunks = store.chunks;
    } catch (error: any) {
      throw new Error(`Failed to load embeddings: ${error.message}`);
    }
  }

  /**
   * Save embeddings to file
   */
  private async saveEmbeddings(filePath: string): Promise<void> {
    try {
      const store: EmbeddingsStore = {
        chunks: this.chunks,
        config: this.config,
        createdAt: new Date().toISOString()
      };
      
      // Determine format from file extension or config
      const fileExt = path.extname(filePath).toLowerCase();
      const isMsgpack = MSGPACK_EXTENSIONS.includes(fileExt) || this.config.storage_format === 'msgpack';
      
      if (isMsgpack) {
        // Save as MessagePack format (binary)
        const buffer = encode(store);
        fs.writeFileSync(filePath, buffer);
        console.log(`Embeddings saved to ${filePath} (MessagePack format, ${buffer.length} bytes)`);
      } else {
        // Save as JSON format (legacy)
        fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
        console.log(`Embeddings saved to ${filePath} (JSON format)`);
      }
    } catch (error: any) {
      throw new Error(`Failed to save embeddings: ${error.message}`);
    }
  }

  /**
   * Create embeddings for all documents in the directory
   */
  private async createEmbeddings(): Promise<void> {
    const files = this.getTextFiles(this.config.directory);
    
    if (files.length === 0) {
      console.warn(`No text files found in ${this.config.directory}`);
      return;
    }

    console.log(`Processing ${files.length} files...`);
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
    
    for (const file of files) {
      try {
        // Check file size before reading
        const stats = fs.statSync(file);
        if (stats.size > MAX_FILE_SIZE) {
          console.warn(`Skipping ${file}: file too large (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
          continue;
        }
        
        const content = fs.readFileSync(file, 'utf8');
        const chunks = this.chunkText(content, this.config.chunk_size!);
      
        for (let i = 0; i < chunks.length; i++) {
          const chunk: DocumentChunk = {
            id: `${path.basename(file)}_chunk_${i}`,
            text: chunks[i],
            source: path.relative(this.config.directory, file)
          };
          
          // Generate embedding for the chunk
          console.log(`Generating embedding for ${chunk.id}...`);
          chunk.embedding = await this.generateEmbedding(chunk.text);
          
          this.chunks.push(chunk);
        }
      } catch (error: any) {
        console.warn(`Error processing ${file}: ${error.message}`);
        // Continue processing other files
      }
    }
  }

  /**
   * Get all text files from directory (recursive)
   */
  private getTextFiles(dir: string): string[] {
    const textExtensions = ['.txt', '.md', '.json', '.yaml', '.yml', '.js', '.ts', '.py', '.html', '.css'];
    const files: string[] = [];
    
    const traverse = (currentPath: string) => {
      try {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          
          try {
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              // Skip common directories
              if (item === 'node_modules' || item === '.git' || item === 'dist') {
                continue;
              }
              traverse(fullPath);
            } else if (stat.isFile()) {
              const ext = path.extname(item).toLowerCase();
              if (textExtensions.includes(ext)) {
                files.push(fullPath);
              }
            }
          } catch (error: any) {
            // Skip files/directories we can't access
            console.warn(`Warning: Cannot access ${fullPath}: ${error.message}`);
          }
        }
      } catch (error: any) {
        // Skip directories we can't read
        console.warn(`Warning: Cannot read directory ${currentPath}: ${error.message}`);
      }
    };
    
    traverse(dir);
    return files;
  }

  /**
   * Split text into chunks
   */
  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let currentChunk = '';
    
    for (const line of lines) {
      if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Generate embedding for text using Ollama
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use Ollama's embedding API endpoint
      return await this.ollamaClient.embeddings(this.config.model!, text);
    } catch (error: any) {
      // Fallback: Create a simple hash-based embedding if API fails
      // Note: This fallback uses 256 dimensions and is only for testing/debugging
      // In production, ensure Ollama is properly configured with embedding support
      console.warn(`Failed to generate embedding via API, using fallback: ${error.message}`);
      console.warn(`Note: Fallback embeddings use 256 dimensions and may not be compatible with all models`);
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate a simple fallback embedding (for testing when embeddings API is not available)
   * WARNING: This is a simplified embedding that uses 256 dimensions.
   * It is not compatible with embeddings from different models that use different dimensions.
   * This should only be used for testing or when Ollama is not available.
   */
  private generateFallbackEmbedding(text: string): number[] {
    // Simple hash-based embedding (256 dimensions)
    const embedding = new Array(256).fill(0);
    const normalized = text.toLowerCase().trim();
    
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      embedding[charCode % 256] += 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    
    return embedding;
  }

  /**
   * Search for relevant chunks based on query
   */
  async search(query: string): Promise<DocumentChunk[]> {
    if (this.chunks.length === 0) {
      return [];
    }

    console.log(`Searching RAG context for query...`);
    
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Calculate similarity scores
    const scores = this.chunks.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding!)
    }));
    
    // Sort by similarity and return top K
    scores.sort((a, b) => b.score - a.score);
    const topChunks = scores.slice(0, this.config.top_k!).map(s => s.chunk);
    
    console.log(`Found ${topChunks.length} relevant chunks`);
    return topChunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      console.warn(`Warning: Embedding dimension mismatch (${vec1.length} vs ${vec2.length}). Returning 0 similarity.`);
      return 0;
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Format search results into context string
   */
  formatContext(chunks: DocumentChunk[]): string {
    if (chunks.length === 0) {
      return '';
    }
    
    let context = '\n\nRelevant context from knowledge base:\n\n';
    
    chunks.forEach((chunk, index) => {
      context += `[Source: ${chunk.source}]\n${chunk.text}\n\n`;
    });
    
    return context;
  }
}

export = RagService;
