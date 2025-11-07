const WorkflowParser = require('../../dist/core/workflow-parser');
const WorkflowExecutor = require('../../dist/core/workflow-executor');
const WebWorkflowExecutor = require('../../dist/web/web-workflow-executor');
const Tracer = require('../../dist/utils/tracer');

describe('Graceful Stop Mechanism', () => {
  describe('WorkflowExecutor', () => {
    it('should have a stop method', () => {
      const workflow = {
        name: 'Test Workflow',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test prompt',
            next: 'end'
          }
        }
      };
      
      const executor = new WorkflowExecutor(workflow, 'http://localhost:11434');
      expect(typeof executor.stop).toBe('function');
    });

    it('should set stopRequested flag when stop is called', () => {
      const workflow = {
        name: 'Test Workflow',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test prompt',
            next: 'end'
          }
        }
      };
      
      const executor = new WorkflowExecutor(workflow, 'http://localhost:11434');
      
      // Access private field through reflection
      expect(executor['stopRequested']).toBe(false);
      
      executor.stop();
      
      expect(executor['stopRequested']).toBe(true);
    });

    it('should only log stop message once when stop is called multiple times', () => {
      const workflow = {
        name: 'Test Workflow',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test prompt',
            next: 'end'
          }
        }
      };
      
      const executor = new WorkflowExecutor(workflow, 'http://localhost:11434');
      
      // Mock console.log
      const originalLog = console.log;
      let logCount = 0;
      console.log = (...args) => {
        if (args.join('').includes('Stop requested')) {
          logCount++;
        }
      };
      
      executor.stop();
      executor.stop();
      executor.stop();
      
      console.log = originalLog;
      
      // Should only log once despite multiple calls
      expect(logCount).toBe(1);
    });
  });

  describe('WebWorkflowExecutor', () => {
    it('should have a stop method', () => {
      const workflow = {
        name: 'Test Workflow',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test prompt',
            next: 'end'
          }
        }
      };
      
      const executor = new WebWorkflowExecutor(workflow, 'http://localhost:11434');
      expect(typeof executor.stop).toBe('function');
    });

    it('should set stopRequested flag when stop is called', () => {
      const workflow = {
        name: 'Test Workflow',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test prompt',
            next: 'end'
          }
        }
      };
      
      const executor = new WebWorkflowExecutor(workflow, 'http://localhost:11434');
      
      // Access private field through reflection
      expect(executor['stopRequested']).toBe(false);
      
      executor.stop();
      
      expect(executor['stopRequested']).toBe(true);
    });

    it('should cancel pending input when stop is called', () => {
      const workflow = {
        name: 'Test Workflow',
        start_state: 'test',
        states: {
          test: {
            type: 'prompt',
            prompt: 'Test prompt',
            next: 'end'
          }
        }
      };
      
      const executor = new WebWorkflowExecutor(workflow, 'http://localhost:11434');
      
      // Simulate pending input
      let rejected = false;
      executor['pendingInput'] = {
        resolve: () => {},
        reject: (error) => {
          rejected = true;
          expect(error.message).toBe('Workflow stopped by user');
        }
      };
      
      executor.stop();
      
      expect(rejected).toBe(true);
      expect(executor['pendingInput']).toBeUndefined();
    });
  });

  describe('Stop Workflow Integration', () => {
    it('should parse workflow files with stop test workflow', () => {
      const workflowYaml = `
name: "Stop Test"
description: "Test graceful stop"
default_model: "gemma3:4b"
start_state: "step1"

states:
  step1:
    type: "input"
    prompt: "Enter something"
    save_as: "input1"
    next: "step2"
  
  step2:
    type: "input"
    prompt: "Enter more"
    save_as: "input2"
    next: "end"
`;
      
      const fs = require('fs');
      const path = require('path');
      const tmpDir = '/tmp/stop-test';
      
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const workflowPath = path.join(tmpDir, 'stop-test.yaml');
      fs.writeFileSync(workflowPath, workflowYaml);
      
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      expect(workflow.name).toBe('Stop Test');
      expect(workflow.states.step1.type).toBe('input');
      expect(workflow.states.step2.type).toBe('input');
      
      // Clean up
      fs.unlinkSync(workflowPath);
    });
  });
});
