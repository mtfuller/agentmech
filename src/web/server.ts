import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import WorkflowDiscovery = require('../workflow/discovery');
import WorkflowParser = require('../workflow/parser');
import WorkflowExecutor = require('../workflow/executor');
import WebWorkflowExecutor = require('./workflow-executor');
import * as RunDirectory from '../utils/run-directory';

interface ServeOptions {
  port: number;
  workflowDir: string;
  ollamaUrl: string;
}

class WebServer {
  private app: express.Application;
  private options: ServeOptions;
  private server: any;
  private activeExecutions: Map<string, WebWorkflowExecutor>;

  constructor(options: ServeOptions) {
    this.options = options;
    this.app = express();
    this.activeExecutions = new Map();
    
    // Middleware
    this.app.use(cors());
    this.app.use(express.json());
    
    // Setup routes
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Serve static frontend
    this.app.get('/', (req: Request, res: Response) => {
      res.send(this.getIndexHtml());
    });

    // Serve execution page
    this.app.get('/execute/:fileName', (req: Request, res: Response) => {
      res.send(this.getExecutionHtml());
    });

    // Serve CSS files
    this.app.get('/styles/:fileName', (req: Request, res: Response) => {
      const cssFileName = req.params.fileName;
      
      // Security: Only allow specific CSS filenames (whitelist)
      const allowedFiles = ['styles.css', 'index.css', 'execution.css'];
      if (!allowedFiles.includes(cssFileName)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.setHeader('Content-Type', 'text/css');
      res.send(this.getCssFile(cssFileName));
    });

    // API: List all workflows
    this.app.get('/api/workflows', (req: Request, res: Response) => {
      try {
        const workflows = WorkflowDiscovery.discoverWorkflows(this.options.workflowDir);
        res.json({ workflows });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // API: Get workflow details
    this.app.get('/api/workflows/:fileName', (req: Request, res: Response) => {
      try {
        const filePath = path.join(this.options.workflowDir, req.params.fileName);
        
        // Security check: ensure file is within workflow directory
        const resolvedPath = path.resolve(filePath);
        const resolvedDir = path.resolve(this.options.workflowDir);
        if (!resolvedPath.startsWith(resolvedDir)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        const workflow = WorkflowParser.parseFile(filePath);
        res.json(workflow);
      } catch (error: any) {
        res.status(404).json({ error: error.message });
      }
    });

    // API: Start workflow execution with SSE
    this.app.get('/api/workflows/:fileName/execute', (req: Request, res: Response) => {
      const filePath = path.join(this.options.workflowDir, req.params.fileName);
      
      // Security check: ensure file is within workflow directory
      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(this.options.workflowDir);
      if (!resolvedPath.startsWith(resolvedDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      try {
        // Parse and create executor
        const workflow = WorkflowParser.parseFile(filePath);
        const sessionId = `${req.params.fileName}-${Date.now()}`;
        
        // Create unique run directory for this workflow execution
        const runDirInfo = RunDirectory.createRunDirectory(workflow.name);
        RunDirectory.writeRunMetadata(runDirInfo);
        
        const executor = new WebWorkflowExecutor(workflow, this.options.ollamaUrl, runDirInfo.path);
        
        // Store executor
        this.activeExecutions.set(sessionId, executor);
        
        // Set SSE response and send session ID
        // Note: This calls writeHead() which must be done before any other response methods
        // like res.json() or res.setHeader() that would fail after headers are sent
        executor.setSseResponse(res, sessionId);
        
        // Handle client disconnect
        req.on('close', () => {
          this.activeExecutions.delete(sessionId);
        });
        
        // Start execution
        executor.execute().catch((error) => {
          console.error('Workflow execution error:', error);
        }).finally(() => {
          // Clean up
          this.activeExecutions.delete(sessionId);
        });
        
      } catch (error: any) {
        // Only send JSON error if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      }
    });

    // API: Provide input to workflow execution
    this.app.post('/api/workflows/:fileName/input', (req: Request, res: Response) => {
      try {
        const { sessionId, input } = req.body;
        
        if (!sessionId || input === undefined) {
          return res.status(400).json({ error: 'Missing sessionId or input' });
        }
        
        const executor = this.activeExecutions.get(sessionId);
        if (!executor) {
          return res.status(404).json({ error: 'Execution session not found' });
        }
        
        executor.provideInput(input);
        res.json({ success: true });
        
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // API: Stop workflow execution
    this.app.post('/api/workflows/:fileName/stop', (req: Request, res: Response) => {
      try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
          return res.status(400).json({ error: 'Missing sessionId' });
        }
        
        const executor = this.activeExecutions.get(sessionId);
        if (!executor) {
          return res.status(404).json({ error: 'Execution session not found' });
        }
        
        executor.stop();
        res.json({ success: true });
        
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Escape HTML special characters to prevent XSS attacks
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Get the index.html page content
   * Reads from dist/views/index.html (after build script copies from src/views/)
   * Note: Path is constructed from trusted sources (__dirname + hardcoded path),
   * not from user input, so no path traversal vulnerability exists.
   */
  private getIndexHtml(): string {
    try {
      const indexPath = path.join(__dirname, '..', 'views', 'index.html');
      return fs.readFileSync(indexPath, 'utf-8');
    } catch (error: any) {
      console.error('Failed to load index.html:', error.message);
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - AgentMech</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .error-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 600px;
            text-align: center;
        }
        h1 { color: #dc3545; margin-bottom: 20px; }
        p { color: #666; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>⚠️ Error Loading Page</h1>
        <p>Failed to load the web interface. Please ensure the application was built correctly.</p>
        <p><strong>Error:</strong> ${this.escapeHtml(error.message)}</p>
        <p>Try running <code>npm run build</code> to rebuild the application.</p>
    </div>
</body>
</html>`;
    }
  }

  /**
   * Get the execution.html page content
   * Reads from dist/views/execution.html (after build script copies from src/views/)
   * Note: Path is constructed from trusted sources (__dirname + hardcoded path),
   * not from user input, so no path traversal vulnerability exists.
   */
  private getExecutionHtml(): string {
    try {
      const executionPath = path.join(__dirname, '..', 'views', 'execution.html');
      return fs.readFileSync(executionPath, 'utf-8');
    } catch (error: any) {
      console.error('Failed to load execution.html:', error.message);
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - AgentMech</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .error-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 600px;
            text-align: center;
        }
        h1 { color: #dc3545; margin-bottom: 20px; }
        p { color: #666; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>⚠️ Error Loading Page</h1>
        <p>Failed to load the execution interface. Please ensure the application was built correctly.</p>
        <p><strong>Error:</strong> ${this.escapeHtml(error.message)}</p>
        <p>Try running <code>npm run build</code> to rebuild the application.</p>
    </div>
</body>
</html>`;
    }
  }

  /**
   * Get a CSS file content
   * Reads from dist/views/ (after build script copies from src/views/)
   * Note: Path is constructed from trusted sources (__dirname + hardcoded path + whitelisted filename),
   * not from user input, so no path traversal vulnerability exists.
   */
  private getCssFile(fileName: string): string {
    try {
      const cssPath = path.join(__dirname, '..', 'views', fileName);
      return fs.readFileSync(cssPath, 'utf-8');
    } catch (error: any) {
      console.error(`Failed to load ${fileName}:`, error.message);
      return `/* Error loading ${fileName}: ${error.message} */
body::before {
  content: "Error loading stylesheet. Please ensure the application was built correctly.";
  display: block;
  background: #ffebee;
  color: #c62828;
  padding: 20px;
  text-align: center;
  font-weight: bold;
}`;
    }
  }

  /**
   * Start the web server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, () => {
          console.log(`\n🚀 AI Workflow Web UI is running!`);
          console.log(`📁 Workflow directory: ${this.options.workflowDir}`);
          console.log(`🌐 Open your browser to: http://localhost:${this.options.port}`);
          console.log(`🤖 Ollama URL: ${this.options.ollamaUrl}`);
          console.log(`\nPress Ctrl+C to stop the server.\n`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.options.port} is already in use. Try a different port with --port option.`));
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the web server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}

export = WebServer;
