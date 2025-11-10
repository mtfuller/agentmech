import WorkflowParser = require('../workflow/parser');
import * as path from 'path';

export async function validate(workflowFile: string) {
    try {
        const workflowPath = path.resolve(workflowFile);
        console.log(`Validating workflow: ${workflowPath}`);

        const workflow = WorkflowParser.parseFile({filePath: workflowPath, workflowDir: '', visitedFiles: new Set()});

        console.log('\n✓ Workflow is valid!');
        console.log(`  Name: ${workflow.name}`);
        console.log(`  States: ${Object.keys(workflow.states).length}`);
        console.log(`  Start state: ${workflow.startState}`);
        
    } catch (error: any) {
        console.error(`\n✗ Validation failed: ${error.message}`);
        process.exit(1);
    }
}