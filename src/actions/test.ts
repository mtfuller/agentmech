import WorkflowParser = require('../workflow/parser');
import { TestScenarioParser } from '../test-scenario/parser';
import { TestExecutor } from '../test-scenario/executor';
import { TestReportGenerator } from '../test-scenario/report';
import * as path from 'path';
import * as fs from 'fs';


interface TestOptions {
  ollamaUrl: string;
  output?: string;
  format?: 'console' | 'json' | 'markdown';
}

export async function test(testFile: string, options: TestOptions) {
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
      const workflow = WorkflowParser.parseFile({filePath: workflowPath, workflowDir: '', visitedFiles: new Set()});
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
  }