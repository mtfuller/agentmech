import { TestScenarioResult, AssertionResult } from './test-executor';
import * as fs from 'fs';

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

    console.log('\n' + '='.repeat(60));
    console.log(`TEST REPORT: ${workflowName}`);
    console.log('='.repeat(60) + '\n');

    // Print individual test results
    results.forEach((result, index) => {
      const icon = result.passed ? '✓' : '✗';
      const status = result.passed ? 'PASSED' : 'FAILED';
      
      console.log(`${icon} Test ${index + 1}: ${result.scenario.name} - ${status}`);
      
      if (result.scenario.description) {
        console.log(`  Description: ${result.scenario.description}`);
      }
      
      console.log(`  Duration: ${result.duration}ms`);
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      
      // Print assertion results
      if (result.assertions.length > 0) {
        console.log(`  Assertions:`);
        result.assertions.forEach((assertion, aIndex) => {
          const assertionIcon = assertion.passed ? '  ✓' : '  ✗';
          console.log(`    ${assertionIcon} ${assertion.message}`);
          if (assertion.assertion.description) {
            console.log(`       ${assertion.assertion.description}`);
          }
        });
      }
      
      console.log('');
    });

    // Print summary
    console.log('-'.repeat(60));
    console.log('SUMMARY');
    console.log('-'.repeat(60));
    console.log(`Total Tests:    ${totalTests}`);
    console.log(`Passed:         ${passedTests} ✓`);
    console.log(`Failed:         ${failedTests} ✗`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate:   ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('-'.repeat(60) + '\n');

    if (failedTests === 0) {
      console.log('🎉 All tests passed!\n');
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed\n`);
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
    console.log(`\nJSON report saved to: ${outputPath}\n`);
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
    console.log(`\nMarkdown report saved to: ${outputPath}\n`);
  }
}
