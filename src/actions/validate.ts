import WorkflowParser = require('../workflow/parser');
import * as path from 'path';
import CliFormatter from '../utils/cli-formatter';

export async function validate(workflowFile: string) {
    try {
        const workflowPath = path.resolve(workflowFile);
        console.log(CliFormatter.loading(`Validating workflow: ${CliFormatter.path(workflowPath)}`));

        const workflow = WorkflowParser.parseFile({filePath: workflowPath, workflowDir: '', visitedFiles: new Set()});

        console.log('\n' + CliFormatter.success('Workflow is valid!'));
        console.log(CliFormatter.dim(`  Name: ${CliFormatter.highlight(workflow.name)}`));
        console.log(CliFormatter.dim(`  States: ${CliFormatter.number(Object.keys(workflow.states).length)}`));
        console.log(CliFormatter.dim(`  Start state: ${CliFormatter.highlight(workflow.startState)}`));
        
    } catch (error: any) {
        console.error('\n' + CliFormatter.error(`Validation failed: ${error.message}`));
        process.exit(1);
    }
}