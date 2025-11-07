import axios, { AxiosError } from 'axios';
import Tracer = require('../utils/tracer');

interface OllamaModel {
  name: string;
  size: number;
}

interface ChatMessage {
  role: string;
  content: string;
  images?: string[];  // Array of base64-encoded images for multimodal support
}

interface GenerateOptions {
  [key: string]: any;
}

class OllamaClient {
  private baseUrl: string;
  private tracer: Tracer;

  constructor(baseUrl: string = 'http://localhost:11434', tracer?: Tracer) {
    this.baseUrl = baseUrl;
    this.tracer = tracer || new Tracer(false);
  }

  /**
   * Generate a response from Ollama
   * @param model - The model to use (e.g., 'gemma3:4b', 'mistral')
   * @param prompt - The prompt to send
   * @param options - Additional options
   * @param images - Optional array of base64-encoded images for multimodal models
   * @returns The generated response
   */
  async generate(model: string, prompt: string, options: GenerateOptions = {}, images?: string[]): Promise<string> {
    // If images are provided, use the chat API instead for multimodal support
    if (images && images.length > 0) {
      return this.chat(model, [{ role: 'user', content: prompt, images }], options);
    }
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model,
        prompt,
        stream: false,
        ...options
      });
      
      const result = response.data.response;
      this.tracer.traceModelInteraction(model, prompt, result, options);
      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      if ((axiosError as any).code === 'ECONNREFUSED') {
        const errorMsg = `Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`;
        this.tracer.traceError('ollama_connection_error', errorMsg, { model, baseUrl: this.baseUrl });
        throw new Error(errorMsg);
      }
      const errorMsg = `Ollama API error: ${axiosError.message}`;
      this.tracer.traceError('ollama_api_error', errorMsg, { model });
      throw new Error(errorMsg);
    }
  }

  /**
   * Chat with Ollama using messages format (supports multimodal with images)
   * @param model - The model to use
   * @param messages - Array of message objects with role, content, and optional images
   * @param options - Additional options
   * @returns The generated response
   */
  async chat(model: string, messages: ChatMessage[], options: GenerateOptions = {}): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model,
        messages,
        stream: false,
        ...options
      });
      
      const result = response.data.message.content;
      
      // Trace with indication of multimodal if images present
      const hasImages = messages.some(m => m.images && m.images.length > 0);
      let traceContext = options;
      
      if (hasImages) {
        const imageCount = messages.reduce((sum, m) => sum + (m.images?.length || 0), 0);
        traceContext = { ...options, multimodal: true, imageCount };
      }
      
      const formattedMessages = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      this.tracer.traceModelInteraction(model, formattedMessages, result, traceContext);
      
      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      if ((axiosError as any).code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`);
      }
      throw new Error(`Ollama API error: ${axiosError.message}`);
    }
  }

  /**
   * List available models
   * @returns List of available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      const axiosError = error as AxiosError;
      if ((axiosError as any).code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`);
      }
      throw new Error(`Ollama API error: ${axiosError.message}`);
    }
  }

  /**
   * Generate embeddings for text
   * @param model - The model to use for embeddings
   * @param prompt - The text to embed
   * @returns The embedding vector
   */
  async embeddings(model: string, prompt: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model,
        prompt
      });
      
      return response.data.embedding;
    } catch (error) {
      const axiosError = error as AxiosError;
      if ((axiosError as any).code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`);
      }
      throw new Error(`Ollama API error: ${axiosError.message}`);
    }
  }
}

export = OllamaClient;
