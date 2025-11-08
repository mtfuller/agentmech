/**
 * Run Directory Management Utility
 * Creates and manages unique directories for each workflow run
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface RunDirectoryInfo {
  path: string;
  workflowName: string;
  timestamp: string;
}

/**
 * Generate a unique directory name for a workflow run
 * @param workflowName - Name of the workflow
 * @param timestamp - Optional ISO timestamp (uses current time if not provided)
 * @returns Directory name in format: workflowName-timestamp
 */
export function generateRunDirectoryName(workflowName: string, timestamp?: string): string {
  // Sanitize workflow name for filesystem
  const sanitizedName = workflowName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Use provided timestamp or generate new one
  const isoTimestamp = timestamp || new Date().toISOString();
  const formattedTimestamp = isoTimestamp
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .substring(0, 19); // YYYY-MM-DDTHH-MM-SS
  
  return `${sanitizedName}-${formattedTimestamp}`;
}

/**
 * Create a unique run directory for a workflow
 * @param workflowName - Name of the workflow
 * @param baseDir - Optional base directory (defaults to ~/.agentmech/runs)
 * @returns RunDirectoryInfo with path and metadata
 */
export function createRunDirectory(workflowName: string, baseDir?: string): RunDirectoryInfo {
  // Default base directory in user's home
  const defaultBaseDir = path.join(os.homedir(), '.agentmech', 'runs');
  const runsBaseDir = baseDir || defaultBaseDir;
  
  // Generate timestamp once for consistency
  const timestamp = new Date().toISOString();
  
  // Generate unique directory name using the same timestamp
  const dirName = generateRunDirectoryName(workflowName, timestamp);
  
  // Create full path
  const runPath = path.join(runsBaseDir, dirName);
  
  // Create directory (recursive)
  try {
    fs.mkdirSync(runPath, { recursive: true });
  } catch (error: any) {
    throw new Error(`Failed to create run directory at ${runPath}: ${error.message}`);
  }
  
  return {
    path: runPath,
    workflowName,
    timestamp
  };
}

/**
 * Get the default trace log path for a run directory
 * @param runDirectoryPath - Path to the run directory
 * @returns Path to trace.log file
 */
export function getTraceLogPath(runDirectoryPath: string): string {
  return path.join(runDirectoryPath, 'trace.log');
}

/**
 * Write run metadata to the run directory
 * @param runDirInfo - Run directory information
 */
export function writeRunMetadata(runDirInfo: RunDirectoryInfo): void {
  const metadataPath = path.join(runDirInfo.path, 'run-metadata.json');
  const metadata = {
    workflowName: runDirInfo.workflowName,
    timestamp: runDirInfo.timestamp,
    runDirectory: runDirInfo.path
  };
  
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error: any) {
    // Non-critical error, just log warning
    console.warn(`Warning: Failed to write run metadata: ${error.message}`);
  }
}
