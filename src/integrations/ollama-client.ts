import axios, { AxiosError } from 'axios';
import Tracer = require('../utils/tracer');

interface OllamaModel {
  name: string;
  size: number;
}

interface ChatMessage {
  role: string;
  content: string;
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
   * @returns The generated response
   */
  async generate(model: string, prompt: string, options: GenerateOptions = {}): Promise<string> {
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
   * Chat with Ollama using messages format
   * @param model - The model to use
   * @param messages - Array of message objects with role and content
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
      
      return response.data.message.content;
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
