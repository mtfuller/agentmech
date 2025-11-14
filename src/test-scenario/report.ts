import { TestScenarioResult, AssertionResult, AggregatedTestResult } from './executor';
import * as fs from 'fs';
import CliFormatter from '../utils/cli-formatter';

/**
 * Test report generator
 */
export class TestReportGenerator {
  /**
   * Generate a console report from test results
   * @param results - Array of test scenario results
   * @param workflowName - Name of the tested workflow
   */
  static generateConsoleReport(results: TestScenarioResult[], workflowName: string): void {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n' + CliFormatter.divider('='));
    console.log(CliFormatter.header(`TEST REPORT: ${workflowName}`));
    console.log(CliFormatter.divider('=') + '\n');

    // Print individual test results
    results.forEach((result, index) => {
      const status = result.passed 
        ? CliFormatter.testPass('PASSED') 
        : CliFormatter.testFail('FAILED');
      
      console.log(`${status} ${CliFormatter.highlight(`Test ${index + 1}: ${result.scenario.name}`)}`);
      
      if (result.scenario.description) {
        console.log(CliFormatter.dim(`  Description: ${result.scenario.description}`));
      }
      
      console.log(CliFormatter.time(`  Duration: ${result.duration}ms`));
      
      if (result.error) {
        console.log(CliFormatter.error(`  Error: ${result.error}`));
      }
      
      // Print assertion results
      if (result.assertions.length > 0) {
        console.log(CliFormatter.dim('  Assertions:'));
        result.assertions.forEach((assertion, aIndex) => {
          const assertionIcon = assertion.passed 
            ? CliFormatter.testPass('') 
            : CliFormatter.testFail('');
          console.log(`    ${assertionIcon} ${assertion.message}`);
          if (assertion.assertion.description) {
            console.log(CliFormatter.dim(`       ${assertion.assertion.description}`));
          }
        });
      }
      
      console.log('');
    });

    // Print summary
    console.log(CliFormatter.divider('-'));
    console.log(CliFormatter.header('SUMMARY'));
    console.log(CliFormatter.divider('-'));
    console.log(CliFormatter.info(`Total Tests:    ${CliFormatter.number(totalTests)}`));
    console.log(CliFormatter.success(`Passed:         ${CliFormatter.number(passedTests)}`));
    console.log(CliFormatter.error(`Failed:         ${CliFormatter.number(failedTests)}`));
    console.log(CliFormatter.time(`Total Duration: ${totalDuration}ms`));
    console.log(CliFormatter.highlight(`Success Rate:   ${((passedTests / totalTests) * 100).toFixed(1)}%`));
    console.log(CliFormatter.divider('-') + '\n');

    if (failedTests === 0) {
      console.log(CliFormatter.complete('All tests passed!') + '\n');
    } else {
      console.log(CliFormatter.warning(`${failedTests} test(s) failed`) + '\n');
    }
  }

  /**
   * Generate a JSON report from test results
   * @param results - Array of test scenario results
   * @param workflowName - Name of the tested workflow
   * @param outputPath - Path to save the JSON report
   */
  static generateJsonReport(
    results: TestScenarioResult[],
    workflowName: string,
    outputPath: string
  ): void {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    const report = {
      workflow: workflowName,
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        duration: totalDuration,
        successRate: (passedTests / totalTests) * 100
      },
      tests: results.map(result => ({
        name: result.scenario.name,
        description: result.scenario.description,
        passed: result.passed,
        duration: result.duration,
        error: result.error,
        assertions: result.assertions.map(a => ({
          type: a.assertion.type,
          target: a.assertion.target,
          value: a.assertion.value,
          passed: a.passed,
          message: a.message,
          description: a.assertion.description
        }))
      }))
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('\n' + CliFormatter.file(`JSON report saved to: ${CliFormatter.path(outputPath)}`) + '\n');
  }

  /**
   * Generate a markdown report from test results
   * @param results - Array of test scenario results
   * @param workflowName - Name of the tested workflow
   * @param outputPath - Path to save the markdown report
   */
  static generateMarkdownReport(
    results: TestScenarioResult[],
    workflowName: string,
    outputPath: string
  ): void {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    let markdown = `# Test Report: ${workflowName}\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Tests | ${totalTests} |\n`;
    markdown += `| Passed | ${passedTests} ✓ |\n`;
    markdown += `| Failed | ${failedTests} ✗ |\n`;
    markdown += `| Total Duration | ${totalDuration}ms |\n`;
    markdown += `| Success Rate | ${((passedTests / totalTests) * 100).toFixed(1)}% |\n\n`;

    markdown += `## Test Results\n\n`;
    
    results.forEach((result, index) => {
      const status = result.passed ? '✓ PASSED' : '✗ FAILED';
      markdown += `### ${index + 1}. ${result.scenario.name} - ${status}\n\n`;
      
      if (result.scenario.description) {
        markdown += `**Description:** ${result.scenario.description}\n\n`;
      }
      
      markdown += `**Duration:** ${result.duration}ms\n\n`;
      
      if (result.error) {
        markdown += `**Error:** \`${result.error}\`\n\n`;
      }
      
      if (result.assertions.length > 0) {
        markdown += `**Assertions:**\n\n`;
        result.assertions.forEach(assertion => {
          const icon = assertion.passed ? '✓' : '✗';
          markdown += `- ${icon} ${assertion.message}\n`;
          if (assertion.assertion.description) {
            markdown += `  - ${assertion.assertion.description}\n`;
          }
        });
        markdown += '\n';
      }
    });

    fs.writeFileSync(outputPath, markdown, 'utf8');
    console.log('\n' + CliFormatter.file(`Markdown report saved to: ${CliFormatter.path(outputPath)}`) + '\n');
  }

  /**
   * Generate an aggregated console report from test results
   * @param results - Array of aggregated test results
   * @param workflowName - Name of the tested workflow
   */
  static generateAggregatedConsoleReport(results: AggregatedTestResult[], workflowName: string): void {
    const totalScenarios = results.length;
    const totalRuns = results.reduce((sum, r) => sum + r.iterations, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.totalDuration, 0);

    console.log('\n' + CliFormatter.divider('='));
    console.log(CliFormatter.header(`AGGREGATED TEST REPORT: ${workflowName}`));
    console.log(CliFormatter.divider('=') + '\n');

    // Print individual test results
    results.forEach((result, index) => {
      const allPassed = result.passed === result.iterations;
      const somePassed = result.passed > 0;
      
      const status = allPassed
        ? CliFormatter.testPass('ALL PASSED')
        : somePassed
          ? CliFormatter.warning(`PARTIAL`)
          : CliFormatter.testFail('ALL FAILED');
      
      console.log(`${status} ${CliFormatter.highlight(`Test ${index + 1}: ${result.scenario.name}`)}`);
      
      if (result.scenario.description) {
        console.log(CliFormatter.dim(`  Description: ${result.scenario.description}`));
      }
      
      console.log(CliFormatter.info(`  Iterations: ${result.iterations}`));
      console.log(CliFormatter.success(`  Passed: ${result.passed} (${result.successRate.toFixed(1)}%)`));
      
      if (result.failed > 0) {
        console.log(CliFormatter.error(`  Failed: ${result.failed}`));
      }
      
      console.log(CliFormatter.time(`  Duration: avg ${Math.round(result.avgDuration)}ms, min ${result.minDuration}ms, max ${result.maxDuration}ms`));
      
      // Show LLM-generated inputs if any
      const firstRunWithGeneratedInputs = result.runs.find(r => r.generatedInputs);
      if (firstRunWithGeneratedInputs?.generatedInputs) {
        console.log(CliFormatter.dim('  LLM-Generated Inputs (from first run):'));
        firstRunWithGeneratedInputs.generatedInputs.forEach(input => {
          console.log(CliFormatter.dim(`    - ${input.state}: "${input.value}"`));
        });
      }
      
      // Show failed runs if any
      if (result.failed > 0) {
        const failedRuns = result.runs.filter(r => !r.passed);
        console.log(CliFormatter.error(`  Failed Runs (${failedRuns.length}):`));
        failedRuns.forEach((run, runIndex) => {
          const failedAssertions = run.assertions.filter(a => !a.passed);
          console.log(CliFormatter.dim(`    Run ${result.runs.indexOf(run) + 1}:`));
          failedAssertions.forEach(assertion => {
            console.log(CliFormatter.dim(`      ✗ ${assertion.message}`));
          });
        });
      }
      
      console.log('');
    });

    // Print summary
    console.log(CliFormatter.divider('-'));
    console.log(CliFormatter.header('SUMMARY'));
    console.log(CliFormatter.divider('-'));
    console.log(CliFormatter.info(`Test Scenarios: ${CliFormatter.number(totalScenarios)}`));
    console.log(CliFormatter.info(`Total Runs:     ${CliFormatter.number(totalRuns)}`));
    console.log(CliFormatter.success(`Passed:         ${CliFormatter.number(totalPassed)}`));
    console.log(CliFormatter.error(`Failed:         ${CliFormatter.number(totalFailed)}`));
    console.log(CliFormatter.time(`Total Duration: ${totalDuration}ms`));
    console.log(CliFormatter.highlight(`Success Rate:   ${((totalPassed / totalRuns) * 100).toFixed(1)}%`));
    console.log(CliFormatter.divider('-') + '\n');

    if (totalFailed === 0) {
      console.log(CliFormatter.complete('All tests passed!') + '\n');
    } else {
      console.log(CliFormatter.warning(`${totalFailed} test run(s) failed`) + '\n');
    }
  }

  /**
   * Generate an aggregated JSON report from test results
   * @param results - Array of aggregated test results
   * @param workflowName - Name of the tested workflow
   * @param outputPath - Path to save the JSON report
   */
  static generateAggregatedJsonReport(
    results: AggregatedTestResult[],
    workflowName: string,
    outputPath: string
  ): void {
    const totalScenarios = results.length;
    const totalRuns = results.reduce((sum, r) => sum + r.iterations, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.totalDuration, 0);

    const report = {
      workflow: workflowName,
      timestamp: new Date().toISOString(),
      summary: {
        scenarios: totalScenarios,
        totalRuns,
        passed: totalPassed,
        failed: totalFailed,
        duration: totalDuration,
        successRate: (totalPassed / totalRuns) * 100
      },
      scenarios: results.map(result => ({
        name: result.scenario.name,
        description: result.scenario.description,
        iterations: result.iterations,
        passed: result.passed,
        failed: result.failed,
        successRate: result.successRate,
        avgDuration: result.avgDuration,
        minDuration: result.minDuration,
        maxDuration: result.maxDuration,
        totalDuration: result.totalDuration,
        runs: result.runs.map(run => ({
          passed: run.passed,
          duration: run.duration,
          error: run.error,
          generatedInputs: run.generatedInputs,
          assertions: run.assertions.map(a => ({
            type: a.assertion.type,
            target: a.assertion.target,
            value: a.assertion.value,
            passed: a.passed,
            message: a.message,
            description: a.assertion.description
          }))
        }))
      }))
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('\n' + CliFormatter.file(`Aggregated JSON report saved to: ${CliFormatter.path(outputPath)}`) + '\n');
  }

  /**
   * Generate an aggregated markdown report from test results
   * @param results - Array of aggregated test results
   * @param workflowName - Name of the tested workflow
   * @param outputPath - Path to save the markdown report
   */
  static generateAggregatedMarkdownReport(
    results: AggregatedTestResult[],
    workflowName: string,
    outputPath: string
  ): void {
    const totalScenarios = results.length;
    const totalRuns = results.reduce((sum, r) => sum + r.iterations, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.totalDuration, 0);

    let markdown = `# Aggregated Test Report: ${workflowName}\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Test Scenarios | ${totalScenarios} |\n`;
    markdown += `| Total Runs | ${totalRuns} |\n`;
    markdown += `| Passed | ${totalPassed} ✓ |\n`;
    markdown += `| Failed | ${totalFailed} ✗ |\n`;
    markdown += `| Total Duration | ${totalDuration}ms |\n`;
    markdown += `| Success Rate | ${((totalPassed / totalRuns) * 100).toFixed(1)}% |\n\n`;

    markdown += `## Test Scenarios\n\n`;
    
    results.forEach((result, index) => {
      const allPassed = result.passed === result.iterations;
      const status = allPassed ? '✓ ALL PASSED' : `⚠ ${result.passed}/${result.iterations} PASSED`;
      
      markdown += `### ${index + 1}. ${result.scenario.name} - ${status}\n\n`;
      
      if (result.scenario.description) {
        markdown += `**Description:** ${result.scenario.description}\n\n`;
      }
      
      markdown += `**Statistics:**\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `|--------|-------|\n`;
      markdown += `| Iterations | ${result.iterations} |\n`;
      markdown += `| Passed | ${result.passed} |\n`;
      markdown += `| Failed | ${result.failed} |\n`;
      markdown += `| Success Rate | ${result.successRate.toFixed(1)}% |\n`;
      markdown += `| Avg Duration | ${Math.round(result.avgDuration)}ms |\n`;
      markdown += `| Min Duration | ${result.minDuration}ms |\n`;
      markdown += `| Max Duration | ${result.maxDuration}ms |\n\n`;

      // Show LLM-generated inputs if any
      const firstRunWithGeneratedInputs = result.runs.find(r => r.generatedInputs);
      if (firstRunWithGeneratedInputs?.generatedInputs) {
        markdown += `**LLM-Generated Inputs (from first run):**\n\n`;
        firstRunWithGeneratedInputs.generatedInputs.forEach(input => {
          markdown += `- \`${input.state}\`: "${input.value}"\n`;
        });
        markdown += '\n';
      }
      
      // Show failed runs if any
      if (result.failed > 0) {
        markdown += `**Failed Runs:**\n\n`;
        const failedRuns = result.runs.filter(r => !r.passed);
        failedRuns.forEach((run, runIndex) => {
          const failedAssertions = run.assertions.filter(a => !a.passed);
          markdown += `- Run ${result.runs.indexOf(run) + 1}:\n`;
          failedAssertions.forEach(assertion => {
            markdown += `  - ✗ ${assertion.message}\n`;
          });
        });
        markdown += '\n';
      }
    });

    fs.writeFileSync(outputPath, markdown, 'utf8');
    console.log('\n' + CliFormatter.file(`Aggregated Markdown report saved to: ${CliFormatter.path(outputPath)}`) + '\n');
  }
}
