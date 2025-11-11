import WorkflowParser = require('../workflow/parser');
import WorkflowExecutor = require('../workflow/executor');
import * as RunDirectory from '../utils/run-directory';
import Tracer = require('../utils/tracer');
import * as path from 'path';
import CliFormatter from '../utils/cli-formatter';

interface RunOptions {
  ollamaUrl: string;
  trace: boolean;
  logFile?: string;
}

export async function run(workflowFile: string, options: RunOptions) {
    try {
      // Parse the workflow file
      const workflowPath = path.resolve(workflowFile);
      console.log(CliFormatter.loading(`Loading workflow from: ${CliFormatter.path(workflowPath)}`));

      const workflow = WorkflowParser.parseFile({filePath: workflowPath, workflowDir: '', visitedFiles: new Set()});
      console.log(CliFormatter.success(`Workflow "${CliFormatter.highlight(workflow.name)}" loaded successfully`));
      
      // Create unique run directory for this workflow execution
      const runDirInfo = RunDirectory.createRunDirectory(workflow.name);
      console.log(CliFormatter.folder(`Run directory created: ${CliFormatter.path(runDirInfo.path)}`) + '\n');
      
      // Write run metadata
      RunDirectory.writeRunMetadata(runDirInfo);
      
      // Determine log file path
      let logFilePath = options.logFile;
      
      // If tracing is enabled but no log file specified, use default in run directory
      if (options.trace && !logFilePath) {
        logFilePath = RunDirectory.getTraceLogPath(runDirInfo.path);
      }
      
      // Validate options
      if (options.logFile && !options.trace) {
        console.log(CliFormatter.warning('--log-file requires --trace to be enabled. Enabling tracing automatically.') + '\n');
        options.trace = true;
      }
      
      // Create tracer
      const tracer = new Tracer(options.trace, logFilePath);
      if (options.trace) {
        console.log(CliFormatter.info('Tracing enabled'));
        if (logFilePath) {
          console.log(CliFormatter.file(`Logging to file: ${CliFormatter.path(logFilePath)}`));
        }
        console.log('');
      }
      
      // Execute the workflow with run directory
      const executor = new WorkflowExecutor(workflow, options.ollamaUrl, tracer, runDirInfo.path);
      
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
      
      console.log('\n' + CliFormatter.folder(`Workflow files saved to: ${CliFormatter.path(runDirInfo.path)}`));
      
    } catch (error: any) {
      console.error('\n' + CliFormatter.error(error.message));
      process.exit(1);
    }
  }