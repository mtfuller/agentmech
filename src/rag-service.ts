import * as fs from 'fs';
import * as path from 'path';
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
  embeddingsFile?: string;
  chunkSize?: number;
  topK?: number;
}

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
      model: config.model || 'llama2',
      embeddingsFile: config.embeddingsFile || 'embeddings.json',
      chunkSize: config.chunkSize || 1000,
      topK: config.topK || 3,
      ...config
    };
    this.ollamaClient = new OllamaClient(ollamaUrl);
  }

  /**
   * Initialize RAG by loading or creating embeddings
   */
  async initialize(): Promise<void> {
    const embeddingsPath = path.join(this.config.directory, this.config.embeddingsFile!);
    
    // Check if embeddings file exists
    if (fs.existsSync(embeddingsPath)) {
      console.log(`Loading existing embeddings from ${embeddingsPath}`);
      await this.loadEmbeddings(embeddingsPath);
    } else {
      console.log(`Creating new embeddings from ${this.config.directory}`);
      await this.createEmbeddings();
      await this.saveEmbeddings(embeddingsPath);
    }
    
    console.log(`RAG initialized with ${this.chunks.length} chunks`);
  }

  /**
   * Load embeddings from file
   */
  private async loadEmbeddings(filePath: string): Promise<void> {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const store: EmbeddingsStore = JSON.parse(data);
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
      fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
      console.log(`Embeddings saved to ${filePath}`);
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
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const chunks = this.chunkText(content, this.config.chunkSize!);
      
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
    }
  }

  /**
   * Get all text files from directory (recursive)
   */
  private getTextFiles(dir: string): string[] {
    const textExtensions = ['.txt', '.md', '.json', '.yaml', '.yml', '.js', '.ts', '.py', '.html', '.css'];
    const files: string[] = [];
    
    const traverse = (currentPath: string) => {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
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
      console.warn(`Failed to generate embedding via API, using fallback: ${error.message}`);
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate a simple fallback embedding (for testing when embeddings API is not available)
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
    const topChunks = scores.slice(0, this.config.topK!).map(s => s.chunk);
    
    console.log(`Found ${topChunks.length} relevant chunks`);
    return topChunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
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
