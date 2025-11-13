import OrchestrationParser = require('../workflow/orchestration-parser');
import OrchestrationExecutor = require('../workflow/orchestration-executor');
import * as path from 'path';
import * as fs from 'fs';
import Tracer = require('../utils/tracer');
import * as RunDirectory from '../utils/run-directory';
import CliFormatter from '../utils/cli-formatter';

interface OrchestrateOptions {
  ollamaUrl: string;
  trace: boolean;
  logFile?: string;
}

export async function orchestrate(orchestrationFile: string, options: OrchestrateOptions) {
  try {
    // Parse the orchestration file
    const orchestrationPath = path.resolve(orchestrationFile);
    console.log(CliFormatter.loading(`Loading orchestration from: ${CliFormatter.path(orchestrationPath)}`));

    if (!fs.existsSync(orchestrationPath)) {
      throw new Error(`Orchestration file not found: ${orchestrationPath}`);
    }

    const orchestration = OrchestrationParser.parseFile(orchestrationPath);
    console.log(CliFormatter.success(`Orchestration "${CliFormatter.highlight(orchestration.name)}" loaded successfully`));

    // Create unique run directory for this orchestration execution
    const runDirInfo = RunDirectory.createRunDirectory(orchestration.name);
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
    }

    // Get orchestration directory for resolving relative workflow paths
    const orchestrationDir = path.dirname(orchestrationPath);

    // Execute orchestration
    const executor = new OrchestrationExecutor(
      orchestration,
      orchestrationDir,
      options.ollamaUrl,
      tracer
    );

    const results = await executor.execute();

    // Write results to run directory
    const resultsPath = path.join(runDirInfo.path, 'results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(CliFormatter.file(`Results saved to: ${CliFormatter.path(resultsPath)}`));

    console.log(CliFormatter.success('\n🎉 Orchestration execution completed successfully!\n'));

  } catch (error: any) {
    console.error(CliFormatter.error(`\n❌ Error: ${error.message}\n`));
    if (error.stack && options.trace) {
      console.error(CliFormatter.error(error.stack));
    }
    process.exit(1);
  }
}
