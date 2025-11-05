import axios, { AxiosError } from 'axios';

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

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a response from Ollama
   * @param model - The model to use (e.g., 'llama2', 'mistral')
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
      
      return response.data.response;
    } catch (error) {
      const axiosError = error as AxiosError;
      if ((axiosError as any).code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`);
      }
      throw new Error(`Ollama API error: ${axiosError.message}`);
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
}

export = OllamaClient;
