import * as fs from 'fs';
import * as path from 'path';
import WorkflowParser = require('./workflow-parser');

interface WorkflowInfo {
  name: string;
  description?: string;
  filePath: string;
  fileName: string;
  valid: boolean;
  error?: string;
}

class WorkflowDiscovery {
  /**
   * Discover all workflow files in a directory
   * @param dirPath - Directory to search for workflow files
   * @returns Array of workflow information
   */
  static discoverWorkflows(dirPath: string): WorkflowInfo[] {
    const workflows: WorkflowInfo[] = [];
    
    try {
      // Check if directory exists
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${dirPath}`);
      }
      
      // Read all files in directory
      const files = fs.readdirSync(dirPath);
      
      // Filter for YAML files
      const yamlFiles = files.filter(file => 
        file.endsWith('.yaml') || file.endsWith('.yml')
      );
      
      // Parse each YAML file
      for (const file of yamlFiles) {
        const filePath = path.join(dirPath, file);
        
        try {
          const workflow = WorkflowParser.parseFile(filePath);
          workflows.push({
            name: workflow.name,
            description: workflow.description,
            filePath: filePath,
            fileName: file,
            valid: true
          });
        } catch (error: any) {
          // Include invalid workflows with error information
          workflows.push({
            name: file,
            filePath: filePath,
            fileName: file,
            valid: false,
            error: error.message
          });
        }
      }
      
    } catch (error: any) {
      throw new Error(`Failed to discover workflows: ${error.message}`);
    }
    
    return workflows;
  }
}

export = WorkflowDiscovery;
