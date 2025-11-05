#!/usr/bin/env node

const { Command } = require('commander');
const WorkflowParser = require('./workflow-parser');
const WorkflowExecutor = require('./workflow-executor');
const OllamaClient = require('./ollama-client');
const path = require('path');

const program = new Command();

program
  .name('ai-workflow')
  .description('A CLI tool for running AI workflows locally with Ollama')
  .version('1.0.0');

program
  .command('run')
  .description('Run a workflow from a YAML file')
  .argument('<workflow-file>', 'Path to workflow YAML file')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(async (workflowFile, options) => {
    try {
      // Parse the workflow file
      const workflowPath = path.resolve(workflowFile);
      console.log(`Loading workflow from: ${workflowPath}`);
      
      const workflow = WorkflowParser.parseFile(workflowPath);
      console.log(`Workflow "${workflow.name}" loaded successfully`);
      
      // Execute the workflow
      const executor = new WorkflowExecutor(workflow, options.ollamaUrl);
      await executor.execute();
      
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a workflow YAML file')
  .argument('<workflow-file>', 'Path to workflow YAML file')
  .action((workflowFile) => {
    try {
      const workflowPath = path.resolve(workflowFile);
      console.log(`Validating workflow: ${workflowPath}`);
      
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      console.log('\n✓ Workflow is valid!');
      console.log(`  Name: ${workflow.name}`);
      console.log(`  States: ${Object.keys(workflow.states).length}`);
      console.log(`  Start state: ${workflow.start_state}`);
      
    } catch (error) {
      console.error(`\n✗ Validation failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('list-models')
  .description('List available Ollama models')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(async (options) => {
    try {
      const client = new OllamaClient(options.ollamaUrl);
      console.log('Fetching available models...\n');
      
      const models = await client.listModels();
      
      if (models.length === 0) {
        console.log('No models found. Pull a model using: ollama pull <model-name>');
      } else {
        console.log('Available models:');
        models.forEach(model => {
          console.log(`  - ${model.name} (${(model.size / 1e9).toFixed(2)} GB)`);
        });
      }
      
    } catch (error) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
