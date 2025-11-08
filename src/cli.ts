#!/usr/bin/env node

import { Command } from 'commander';
import * as Actions from './actions';

const program = new Command();

program
  .name('agentmech')
  .description('A CLI tool for running AI workflows locally with Ollama')
  .version('1.0.0');

program
  .command('run')
  .description('Run a workflow from a YAML file')
  .argument('<workflow-file>', 'Path to workflow YAML file')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-t, --trace', 'Enable tracing/observability for workflow execution', false)
  .option('-l, --log-file <path>', 'Path to file for logging trace events')
  .action(Actions.run);

program
  .command('validate')
  .description('Validate a workflow YAML file')
  .argument('<workflow-file>', 'Path to workflow YAML file')
  .action(Actions.validate);

program
  .command('list-models')
  .description('List available Ollama models')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(Actions.listModels);

program
  .command('serve')
  .description('Start a web UI for browsing and initiating workflows')
  .argument('[workflow-dir]', 'Directory containing workflow files', './examples')
  .option('-p, --port <port>', 'Port to run the web server on', '3000')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(Actions.serve);

program
  .command('test')
  .description('Run test scenarios for a workflow')
  .argument('<test-file>', 'Path to test scenario YAML file')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-o, --output <path>', 'Path to save test report (for json/markdown formats)')
  .option('-f, --format <format>', 'Report format: console, json, or markdown', 'console')
  .action(Actions.test);

program
  .command('generate')
  .description('Generate a new workflow YAML file from a natural language description')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-o, --output <path>', 'Output file path for the generated workflow')
  .option('-m, --model <model>', 'Model to use for generation', 'gemma3:4b')
  .action(Actions.generate);

program.parse();
