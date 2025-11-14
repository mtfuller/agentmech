import OllamaClient = require('../ollama/ollama-client');
import { LLMInputGeneration, TestInput } from './test-scenario';
import Tracer = require('../utils/tracer');

/**
 * Generates user inputs using an LLM for workflow testing
 */
export class LLMInputGenerator {
  private ollamaClient: OllamaClient;
  private tracer: Tracer;

  constructor(ollamaUrl: string, tracer: Tracer) {
    this.ollamaClient = new OllamaClient(ollamaUrl, tracer);
    this.tracer = tracer;
  }

  /**
   * Generate inputs for all input states in a workflow
   * @param workflow - The workflow configuration
   * @param config - LLM input generation configuration
   * @returns Array of generated test inputs
   */
  async generateInputs(workflow: any, config: LLMInputGeneration): Promise<TestInput[]> {
    const inputStates = this.findInputStates(workflow);
    
    if (inputStates.length === 0) {
      return [];
    }

    const model = config.model || workflow.default_model || 'gemma3:4b';
    const context = config.context || '';

    // Create a prompt asking the LLM to generate appropriate inputs
    const prompt = this.buildGenerationPrompt(workflow, inputStates, context);

    try {
      const response = await this.ollamaClient.generate(model, prompt);
      return this.parseGeneratedInputs(response, inputStates);
    } catch (error: any) {
      throw new Error(`Failed to generate inputs using LLM: ${error.message}`);
    }
  }

  /**
   * Find all input states in a workflow
   * @param workflow - The workflow configuration
   * @returns Array of input state names with their prompts
   */
  private findInputStates(workflow: any): Array<{name: string, prompt: string, defaultValue?: string}> {
    const inputStates: Array<{name: string, prompt: string, defaultValue?: string}> = [];

    for (const [stateName, state] of Object.entries(workflow.states)) {
      const stateConfig = state as any;
      if (stateConfig.type === 'input') {
        inputStates.push({
          name: stateName,
          prompt: stateConfig.prompt,
          defaultValue: stateConfig.default_value
        });
      }
    }

    return inputStates;
  }

  /**
   * Build the prompt for LLM to generate inputs
   * @param workflow - The workflow configuration
   * @param inputStates - List of input states
   * @param context - Additional context from test configuration
   * @returns Prompt string
   */
  private buildGenerationPrompt(
    workflow: any,
    inputStates: Array<{name: string, prompt: string, defaultValue?: string}>,
    context: string
  ): string {
    let prompt = `You are helping to test a workflow called "${workflow.name || 'Unknown Workflow'}".`;
    
    if (workflow.description) {
      prompt += ` The workflow description is: "${workflow.description}".`;
    }

    if (context) {
      prompt += ` Additional context: ${context}`;
    }

    prompt += '\n\nThe workflow needs the following user inputs:\n\n';

    inputStates.forEach((state, index) => {
      prompt += `${index + 1}. State "${state.name}": ${state.prompt}`;
      if (state.defaultValue) {
        prompt += ` (default: "${state.defaultValue}")`;
      }
      prompt += '\n';
    });

    prompt += '\nGenerate realistic and appropriate test inputs for each of these prompts. ';
    prompt += 'Respond ONLY with a JSON array of objects, where each object has "state" and "value" fields. ';
    prompt += 'Do not include any explanatory text, markdown formatting, or code blocks - just the raw JSON array.\n\n';
    prompt += 'Example format: [{"state": "state_name", "value": "your input here"}, ...]';

    return prompt;
  }

  /**
   * Parse the LLM response to extract generated inputs
   * @param response - LLM response string
   * @param inputStates - Expected input states
   * @returns Array of test inputs
   */
  private parseGeneratedInputs(
    response: string,
    inputStates: Array<{name: string, prompt: string, defaultValue?: string}>
  ): TestInput[] {
    try {
      // Try to extract JSON from the response
      // The LLM might wrap it in markdown code blocks
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON array
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }

      const parsedInputs = JSON.parse(jsonStr);

      if (!Array.isArray(parsedInputs)) {
        throw new Error('LLM response is not a JSON array');
      }

      // Validate that we have inputs for all required states
      const generatedInputs: TestInput[] = [];
      for (const state of inputStates) {
        const input = parsedInputs.find((i: any) => i.state === state.name);
        if (input && input.value) {
          generatedInputs.push({
            state: input.state,
            value: String(input.value)
          });
        } else if (state.defaultValue) {
          // Use default value if LLM didn't provide one
          generatedInputs.push({
            state: state.name,
            value: state.defaultValue
          });
        } else {
          throw new Error(`LLM did not generate input for required state: ${state.name}`);
        }
      }

      return generatedInputs;

    } catch (error: any) {
      throw new Error(`Failed to parse LLM response as JSON: ${error.message}. Response: ${response}`);
    }
  }
}
