#!/usr/bin/env node

import { Command } from 'commander';
import WorkflowParser = require('./workflow-parser');
import WorkflowExecutor = require('./workflow-executor');
import OllamaClient = require('./ollama-client');
import Tracer = require('./tracer');
import WebServer = require('./web-server');
import { TestScenarioParser } from './test-scenario-parser';
import { TestExecutor } from './test-executor';
import { TestReportGenerator } from './test-report-generator';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

program
  .name('ai-workflow')
  .description('A CLI tool for running AI workflows locally with Ollama')
  .version('1.0.0');

interface RunOptions {
  ollamaUrl: string;
  trace: boolean;
  logFile?: string;
}

program
  .command('run')
  .description('Run a workflow from a YAML file')
  .argument('<workflow-file>', 'Path to workflow YAML file')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-t, --trace', 'Enable tracing/observability for workflow execution', false)
  .option('-l, --log-file <path>', 'Path to file for logging trace events')
  .action(async (workflowFile: string, options: RunOptions) => {
    try {
      // Parse the workflow file
      const workflowPath = path.resolve(workflowFile);
      console.log(`Loading workflow from: ${workflowPath}`);
      
      const workflow = WorkflowParser.parseFile(workflowPath);
      console.log(`Workflow "${workflow.name}" loaded successfully`);
      
      // Validate options
      if (options.logFile && !options.trace) {
        console.log('Warning: --log-file requires --trace to be enabled. Enabling tracing automatically.\n');
        options.trace = true;
      }
      
      // Create tracer
      const tracer = new Tracer(options.trace, options.logFile);
      if (options.trace) {
        console.log('Tracing enabled');
        if (options.logFile) {
          console.log(`Logging to file: ${options.logFile}`);
        }
        console.log('');
      }
      
      // Execute the workflow
      const executor = new WorkflowExecutor(workflow, options.ollamaUrl, tracer);
      
      // Handle graceful shutdown on Ctrl+C
      const handleStop = () => {
        executor.stop();
      };
      
      process.on('SIGINT', handleStop);
      process.on('SIGTERM', handleStop);
      
      await executor.execute();
      
      // Remove signal handlers
      process.removeListener('SIGINT', handleStop);
      process.removeListener('SIGTERM', handleStop);
      
      // Close the tracer to flush file stream
      tracer.close();
      
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

interface ServeOptions {
  port: number;
  ollamaUrl: string;
}

program
  .command('serve')
  .description('Start a web UI for browsing and initiating workflows')
  .argument('[workflow-dir]', 'Directory containing workflow files', './examples')
  .option('-p, --port <port>', 'Port to run the web server on', '3000')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .action(async (workflowDir: string, options: ServeOptions) => {
    try {
      // Resolve workflow directory path
      const resolvedWorkflowDir = path.resolve(workflowDir);
      
      // Check if directory exists
      if (!fs.existsSync(resolvedWorkflowDir)) {
        console.error(`\nError: Directory not found: ${resolvedWorkflowDir}`);
        process.exit(1);
      }
      
      const stat = fs.statSync(resolvedWorkflowDir);
      if (!stat.isDirectory()) {
        console.error(`\nError: Path is not a directory: ${resolvedWorkflowDir}`);
        process.exit(1);
      }
      
      // Parse port option
      const port = parseInt(options.port.toString(), 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error(`\nError: Invalid port number: ${options.port}`);
        process.exit(1);
      }
      
      // Create and start web server
      const server = new WebServer({
        port: port,
        workflowDir: resolvedWorkflowDir,
        ollamaUrl: options.ollamaUrl
      });
      
      await server.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n\nShutting down server...');
        server.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\n\nShutting down server...');
        server.stop();
        process.exit(0);
      });
      
    } catch (error: any) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

interface TestOptions {
  ollamaUrl: string;
  output?: string;
  format?: 'console' | 'json' | 'markdown';
}

program
  .command('test')
  .description('Run test scenarios for a workflow')
  .argument('<test-file>', 'Path to test scenario YAML file')
  .option('-u, --ollama-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-o, --output <path>', 'Path to save test report (for json/markdown formats)')
  .option('-f, --format <format>', 'Report format: console, json, or markdown', 'console')
  .action(async (testFile: string, options: TestOptions) => {
    try {
      // Parse test scenario file
      const testPath = path.resolve(testFile);
      console.log(`Loading test scenarios from: ${testPath}\n`);
      
      const testSuite = TestScenarioParser.parseFile(testPath);
      
      // Resolve workflow path relative to test file
      const testDir = path.dirname(testPath);
      const workflowPath = path.resolve(testDir, testSuite.workflow);
      
      if (!fs.existsSync(workflowPath)) {
        console.error(`\nError: Workflow file not found: ${workflowPath}`);
        process.exit(1);
      }
      
      // Parse workflow to get its name
      const workflow = WorkflowParser.parseFile(workflowPath);
      console.log(`Testing workflow: ${workflow.name}`);
      console.log(`Test scenarios: ${testSuite.test_scenarios.length}\n`);
      
      // Create test executor
      const testExecutor = new TestExecutor(options.ollamaUrl);
      
      // Run all test scenarios
      const results = [];
      for (let i = 0; i < testSuite.test_scenarios.length; i++) {
        const scenario = testSuite.test_scenarios[i];
        console.log(`Running test ${i + 1}/${testSuite.test_scenarios.length}: ${scenario.name}...`);
        
        const result = await testExecutor.executeTestScenario(workflowPath, scenario);
        results.push(result);
        
        const status = result.passed ? '✓ PASSED' : '✗ FAILED';
        console.log(`  ${status} (${result.duration}ms)\n`);
      }
      
      // Generate report based on format
      if (options.format === 'console' || !options.output) {
        TestReportGenerator.generateConsoleReport(results, workflow.name);
      }
      
      if (options.format === 'json' && options.output) {
        TestReportGenerator.generateJsonReport(results, workflow.name, options.output);
      }
      
      if (options.format === 'markdown' && options.output) {
        TestReportGenerator.generateMarkdownReport(results, workflow.name, options.output);
      }
      
      // Exit with appropriate code
      const allPassed = results.every(r => r.passed);
      process.exit(allPassed ? 0 : 1);
      
    } catch (error: any) {
      console.error(`\nError: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
