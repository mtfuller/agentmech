const axios = require('axios');

class OllamaClient {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a response from Ollama
   * @param {string} model - The model to use (e.g., 'llama2', 'mistral')
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Additional options
   * @returns {Promise<string>} The generated response
   */
  async generate(model, prompt, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model,
        prompt,
        stream: false,
        ...options
      });
      
      return response.data.response;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`);
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  /**
   * Chat with Ollama using messages format
   * @param {string} model - The model to use
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options
   * @returns {Promise<string>} The generated response
   */
  async chat(model, messages, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model,
        messages,
        stream: false,
        ...options
      });
      
      return response.data.message.content;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`);
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  /**
   * List available models
   * @returns {Promise<Array>} List of available models
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`);
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }
}

module.exports = OllamaClient;
