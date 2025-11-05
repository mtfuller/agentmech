#!/usr/bin/env node

import { Command } from 'commander';
import WorkflowParser = require('./workflow-parser');
import WorkflowExecutor = require('./workflow-executor');
import OllamaClient = require('./ollama-client');
import Tracer = require('./tracer');
import * as path from 'path';

const program = new Command();

program
  .name('ai-workflow')
  .description('A CLI tool for running AI workflows locally with Ollama')
  .version('1.0.0');

interface RunOptions {
  ollamaUrl: string;
  trace: boolean;
}

program
  .command('run')
  .description('Run a workflow from a YAML file')
  .argument('<workflow-file>', 'Path to workflow YAML file')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-t, --trace', 'Enable tracing/observability for workflow execution', false)
  .action(async (workflowFile: string, options: RunOptions) => {
    try {
      // Parse the workflow file
      const workflowPath = path.resolve(workflowFile);
      console.log(`Loading workflow from: ${workflowPath}`);
      
      const workflow = WorkflowParser.parseFile(workflowPath);
      console.log(`Workflow "${workflow.name}" loaded successfully`);
      
      // Create tracer
      const tracer = new Tracer(options.trace);
      if (options.trace) {
        console.log('Tracing enabled\n');
      }
      
      // Execute the workflow
      const executor = new WorkflowExecutor(workflow, options.ollamaUrl, tracer);
      await executor.execute();
      
    } catch (error: any) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a workflow YAML file')
  .argument('<workflow-file>', 'Path to workflow YAML file')
  .action((workflowFile: string) => {
    try {
      const workflowPath = path.resolve(workflowFile);
      console.log(`Validating workflow: ${workflowPath}`);
      
      const workflow = WorkflowParser.parseFile(workflowPath);
      
      console.log('\n✓ Workflow is valid!');
      console.log(`  Name: ${workflow.name}`);
      console.log(`  States: ${Object.keys(workflow.states).length}`);
      console.log(`  Start state: ${workflow.start_state}`);
      
    } catch (error: any) {
      console.error(`\n✗ Validation failed: ${error.message}`);
      process.exit(1);
    }
  });

interface ListModelsOptions {
  ollamaUrl: string;
}

program
  .command('list-models')
  .description('List available Ollama models')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(async (options: ListModelsOptions) => {
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
      
    } catch (error: any) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
