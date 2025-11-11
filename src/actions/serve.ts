import * as RunDirectory from '../utils/run-directory';
import WebServer = require('../web/server');
import * as path from 'path';
import * as fs from 'fs';
import CliFormatter from '../utils/cli-formatter';

interface ServeOptions {
    port: number;
    ollamaUrl: string;
}

export async function serve(workflowDir: string, options: ServeOptions) {
    try {
        // Resolve workflow directory path
        const resolvedWorkflowDir = path.resolve(workflowDir);

        // Check if directory exists
        if (!fs.existsSync(resolvedWorkflowDir)) {
            console.error('\n' + CliFormatter.error(`Directory not found: ${CliFormatter.path(resolvedWorkflowDir)}`));
            process.exit(1);
        }

        const stat = fs.statSync(resolvedWorkflowDir);
        if (!stat.isDirectory()) {
            console.error('\n' + CliFormatter.error(`Path is not a directory: ${CliFormatter.path(resolvedWorkflowDir)}`));
            process.exit(1);
        }

        // Parse port option
        const port = parseInt(options.port.toString(), 10);
        if (isNaN(port) || port < 1 || port > 65535) {
            console.error('\n' + CliFormatter.error(`Invalid port number: ${options.port}`));
            process.exit(1);
        }

        // Create and start web server
        const server = new WebServer({
            port: port,
            workflowDir: resolvedWorkflowDir,
            ollamaUrl: options.ollamaUrl
        });

        await server.start();

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\n' + CliFormatter.stop('Shutting down server...'));
            server.stop();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\n\n' + CliFormatter.stop('Shutting down server...'));
            server.stop();
            process.exit(0);
        });

    } catch (error: any) {
        console.error('\n' + CliFormatter.error(error.message));
        process.exit(1);
    }
}