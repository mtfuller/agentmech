import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import WorkflowDiscovery = require('./workflow-discovery');
import WorkflowParser = require('./workflow-parser');
import WorkflowExecutor = require('./workflow-executor');
import WebWorkflowExecutor = require('./web-workflow-executor');

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
        const executor = new WebWorkflowExecutor(workflow, this.options.ollamaUrl);
        
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

  private getIndexHtml(): string {
    const indexPath = path.join(__dirname, 'views', 'index.html');
    return fs.readFileSync(indexPath, 'utf-8');
  }

  private getExecutionHtml(): string {
    const executionPath = path.join(__dirname, 'views', 'execution.html');
    return fs.readFileSync(executionPath, 'utf-8');
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
