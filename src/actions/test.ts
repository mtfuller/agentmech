import WorkflowParser = require('../workflow/parser');
import TestScenarioParser = require('../test-scenario/parser');
import { TestExecutor } from '../test-scenario/executor';
import { TestReportGenerator } from '../test-scenario/report';
import * as path from 'path';
import * as fs from 'fs';
import CliFormatter from '../utils/cli-formatter';


interface TestOptions {
  ollamaUrl: string;
  output?: string;
  format?: 'console' | 'json' | 'markdown';
  iterations?: number;
}

export async function test(testFile: string, options: TestOptions) {
    try {
      // Parse test scenario file
      const testPath = path.resolve(testFile);
      console.log(CliFormatter.test(`Loading test scenarios from: ${CliFormatter.path(testPath)}`) + '\n');
      
      const testSuite = TestScenarioParser.parseFile(testPath);
      
      // Resolve workflow path relative to test file
      const testDir = path.dirname(testPath);
      const workflowPath = path.resolve(testDir, testSuite.workflow);
      
      if (!fs.existsSync(workflowPath)) {
        console.error('\n' + CliFormatter.error(`Workflow file not found: ${CliFormatter.path(workflowPath)}`));
        process.exit(1);
      }
      
      // Parse workflow to get its name
      const workflow = WorkflowParser.parseFile({filePath: workflowPath, workflowDir: '', visitedFiles: new Set()});
      console.log(CliFormatter.info(`Testing workflow: ${CliFormatter.highlight(workflow.name)}`));
      console.log(CliFormatter.info(`Test scenarios: ${CliFormatter.number(testSuite.test_scenarios.length)}`) + '\n');
      
      // Create test executor
      const testExecutor = new TestExecutor(options.ollamaUrl);
      
      // Determine if we should use aggregation (multiple iterations)
      const cliIterations = options.iterations;
      const suiteIterations = testSuite.iterations;
      const useAggregation = cliIterations || suiteIterations || 
                             testSuite.test_scenarios.some(s => s.iterations && s.iterations > 1);
      
      if (useAggregation) {
        // Run with aggregation
        const aggregatedResults = [];
        for (let i = 0; i < testSuite.test_scenarios.length; i++) {
          const scenario = testSuite.test_scenarios[i];
          const iterations = cliIterations || scenario.iterations || suiteIterations || 1;
          
          console.log(CliFormatter.loading(
            `Running test ${i + 1}/${testSuite.test_scenarios.length}: ${CliFormatter.highlight(scenario.name)} ` +
            `(${iterations} iteration${iterations > 1 ? 's' : ''})...`
          ));
          
          const aggregatedResult = await testExecutor.executeTestScenarioWithIterations(
            workflowPath,
            scenario,
            iterations
          );
          aggregatedResults.push(aggregatedResult);
          
          const status = aggregatedResult.passed === aggregatedResult.iterations
            ? CliFormatter.testPass('ALL PASSED')
            : aggregatedResult.passed > 0
              ? CliFormatter.warning(`PARTIAL (${aggregatedResult.passed}/${aggregatedResult.iterations})`)
              : CliFormatter.testFail('ALL FAILED');
          
          console.log(`  ${status} ${CliFormatter.time(`(avg: ${Math.round(aggregatedResult.avgDuration)}ms)`)}` + '\n');
        }
        
        // Generate report based on format
        if (options.format === 'console' || !options.output) {
          TestReportGenerator.generateAggregatedConsoleReport(aggregatedResults, workflow.name);
        }
        
        if (options.format === 'json' && options.output) {
          TestReportGenerator.generateAggregatedJsonReport(aggregatedResults, workflow.name, options.output);
        }
        
        if (options.format === 'markdown' && options.output) {
          TestReportGenerator.generateAggregatedMarkdownReport(aggregatedResults, workflow.name, options.output);
        }
        
        // Exit with appropriate code
        const allPassed = aggregatedResults.every(r => r.passed === r.iterations);
        process.exit(allPassed ? 0 : 1);
        
      } else {
        // Run without aggregation (backward compatible)
        const results = [];
        for (let i = 0; i < testSuite.test_scenarios.length; i++) {
          const scenario = testSuite.test_scenarios[i];
          console.log(CliFormatter.loading(`Running test ${i + 1}/${testSuite.test_scenarios.length}: ${CliFormatter.highlight(scenario.name)}...`));
          
          const result = await testExecutor.executeTestScenario(workflowPath, scenario);
          results.push(result);
          
          const status = result.passed ? CliFormatter.testPass('PASSED') : CliFormatter.testFail('FAILED');
          console.log(`  ${status} ${CliFormatter.time(`(${result.duration}ms)`)}` + '\n');
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
      }
      
    } catch (error: any) {
      console.error('\n' + CliFormatter.error(error.message));
      process.exit(1);
    }
  }