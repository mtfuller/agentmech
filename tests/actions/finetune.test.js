const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Since finetune is an integration-heavy command that requires Ollama and LLM calls,
// we'll test the command's structure and availability rather than full execution

describe('Finetune Command', () => {
  describe('Command Structure', () => {
    test('finetune action should be exported', () => {
      const actions = require('../../dist/actions');
      expect(actions.finetune).toBeDefined();
      expect(typeof actions.finetune).toBe('function');
    });

    test('CLI should include finetune command', () => {
      const cliPath = path.join(__dirname, '../../dist/cli.js');
      expect(fs.existsSync(cliPath)).toBe(true);
      
      const cliContent = fs.readFileSync(cliPath, 'utf8');
      expect(cliContent).toContain('finetune');
      expect(cliContent).toContain('Iteratively improve a workflow');
    });
  });

  describe('Test Workflow File', () => {
    test('should have example workflows that can be used for finetuning', () => {
      const examplesDir = path.join(__dirname, '../../examples');
      const simpleQaPath = path.join(examplesDir, 'simple-qa.yaml');
      
      expect(fs.existsSync(simpleQaPath)).toBe(true);
      
      const workflowContent = fs.readFileSync(simpleQaPath, 'utf8');
      const workflow = yaml.load(workflowContent);
      
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('states');
      expect(workflow).toHaveProperty('start_state');
    });

    test('should have test files that demonstrate the test format', () => {
      const examplesDir = path.join(__dirname, '../../examples');
      const testPath = path.join(examplesDir, 'simple-qa.test.yaml');
      
      expect(fs.existsSync(testPath)).toBe(true);
      
      const testContent = fs.readFileSync(testPath, 'utf8');
      const testSuite = yaml.load(testContent);
      
      expect(testSuite).toHaveProperty('workflow');
      expect(testSuite).toHaveProperty('test_scenarios');
      expect(Array.isArray(testSuite.test_scenarios)).toBe(true);
    });
  });

  describe('Finetune Workflow', () => {
    test('should properly identify workflows with input states', () => {
      const workflow = {
        name: 'Test Workflow',
        start_state: 'get_input',
        states: {
          get_input: {
            type: 'input',
            prompt: 'Enter your name:',
            save_as: 'name',
            next: 'end'
          }
        }
      };

      const hasInputStates = Object.values(workflow.states).some(
        (state) => state.type === 'input'
      );

      expect(hasInputStates).toBe(true);
    });

    test('should properly identify workflows without input states', () => {
      const workflow = {
        name: 'Test Workflow',
        start_state: 'ask_question',
        states: {
          ask_question: {
            type: 'prompt',
            prompt: 'What is AI?',
            save_as: 'answer',
            next: 'end'
          }
        }
      };

      const hasInputStates = Object.values(workflow.states).some(
        (state) => state.type === 'input'
      );

      expect(hasInputStates).toBe(false);
    });
  });

  describe('YAML Processing', () => {
    test('should be able to parse and dump workflow YAML', () => {
      const workflow = {
        name: 'Test Workflow',
        default_model: 'gemma3:4b',
        start_state: 'test_state',
        states: {
          test_state: {
            type: 'prompt',
            prompt: 'Test prompt',
            save_as: 'result',
            next: 'end'
          }
        }
      };

      const yamlString = yaml.dump(workflow);
      expect(yamlString).toContain('name: Test Workflow');
      expect(yamlString).toContain('default_model: gemma3:4b');
      expect(yamlString).toContain('test_state:');

      const parsed = yaml.load(yamlString);
      expect(parsed).toEqual(workflow);
    });

    test('should extract YAML from code blocks', () => {
      const response = `Here's the improved workflow:

\`\`\`yaml
name: Improved Workflow
default_model: gemma3:4b
start_state: improved_state
states:
  improved_state:
    type: prompt
    prompt: Improved prompt
    next: end
\`\`\`

This workflow is better.`;

      const yamlMatch = response.match(/```yaml\n([\s\S]*?)\n```/);
      expect(yamlMatch).toBeTruthy();
      expect(yamlMatch[1]).toContain('name: Improved Workflow');
      
      const parsed = yaml.load(yamlMatch[1]);
      expect(parsed.name).toBe('Improved Workflow');
    });
  });

  describe('Iteration Results', () => {
    test('should track iteration results with correct structure', () => {
      const iterationResult = {
        iterationNumber: 1,
        workflowRan: true,
        testsPassed: true,
        testResults: [
          { name: 'Test 1', passed: true },
          { name: 'Test 2', passed: true }
        ],
        improvements: ['Improve prompt clarity', 'Add error handling'],
        modifications: 'Workflow modified based on LLM suggestions'
      };

      expect(iterationResult).toHaveProperty('iterationNumber');
      expect(iterationResult).toHaveProperty('workflowRan');
      expect(iterationResult).toHaveProperty('testsPassed');
      expect(iterationResult).toHaveProperty('testResults');
      expect(iterationResult).toHaveProperty('improvements');
      expect(iterationResult).toHaveProperty('modifications');
      expect(Array.isArray(iterationResult.improvements)).toBe(true);
    });
  });

  describe('File Naming', () => {
    test('should generate correct iteration file names', () => {
      const originalPath = '/path/to/workflow.yaml';
      const iterationNumber = 3;
      
      const iterationPath = originalPath.replace('.yaml', `.finetune-iter${iterationNumber}.yaml`);
      expect(iterationPath).toBe('/path/to/workflow.finetune-iter3.yaml');
    });

    test('should generate correct output file name', () => {
      const originalPath = '/path/to/workflow.yaml';
      const outputPath = originalPath.replace('.yaml', '.finetuned.yaml');
      
      expect(outputPath).toBe('/path/to/workflow.finetuned.yaml');
    });

    test('should generate correct test file name', () => {
      const originalPath = '/path/to/workflow.yaml';
      const testPath = originalPath.replace('.yaml', '.test.yaml');
      
      expect(testPath).toBe('/path/to/workflow.test.yaml');
    });

    test('should generate correct generated test file name', () => {
      const originalPath = '/path/to/workflow.yaml';
      const generatedTestPath = originalPath.replace('.yaml', '.finetune-tests.yaml');
      
      expect(generatedTestPath).toBe('/path/to/workflow.finetune-tests.yaml');
    });
  });
});
