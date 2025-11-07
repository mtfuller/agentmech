import * as fs from 'fs';
import * as path from 'path';

/**
 * Supported file types for multimodal inputs
 */
enum FileType {
  IMAGE = 'image',
  PDF = 'pdf',
  WORD = 'word',
  TEXT = 'text',
  UNKNOWN = 'unknown'
}

/**
 * Processed file content with metadata
 */
interface ProcessedFile {
  type: FileType;
  content: string;  // Base64 for images, text for others
  mimeType?: string;
  filename: string;
}

/**
 * File handler for processing different file types for multimodal AI workflows
 */
class FileHandler {
  
  /**
   * Determine file type based on extension
   */
  static getFileType(filePath: string): FileType {
    const ext = path.extname(filePath).toLowerCase();
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const pdfExtensions = ['.pdf'];
    const wordExtensions = ['.doc', '.docx'];
    const textExtensions = ['.txt', '.md', '.json', '.yaml', '.yml', '.csv'];
    
    if (imageExtensions.includes(ext)) {
      return FileType.IMAGE;
    } else if (pdfExtensions.includes(ext)) {
      return FileType.PDF;
    } else if (wordExtensions.includes(ext)) {
      return FileType.WORD;
    } else if (textExtensions.includes(ext)) {
      return FileType.TEXT;
    }
    
    return FileType.UNKNOWN;
  }
  
  /**
   * Get MIME type for a file
   */
  static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.csv': 'text/csv'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
  
  /**
   * Process a file and return its content in a format suitable for AI models
   */
  static async processFile(filePath: string): Promise<ProcessedFile> {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileType = this.getFileType(absolutePath);
    const filename = path.basename(absolutePath);
    const mimeType = this.getMimeType(absolutePath);
    
    switch (fileType) {
      case FileType.IMAGE:
        return this.processImage(absolutePath, filename, mimeType);
      
      case FileType.TEXT:
        return this.processTextFile(absolutePath, filename, mimeType);
      
      case FileType.PDF:
        return this.processPdf(absolutePath, filename, mimeType);
      
      case FileType.WORD:
        return this.processWordDoc(absolutePath, filename, mimeType);
      
      default:
        throw new Error(`Unsupported file type: ${path.extname(absolutePath)}`);
    }
  }
  
  /**
   * Process an image file - convert to base64
   */
  private static async processImage(filePath: string, filename: string, mimeType: string): Promise<ProcessedFile> {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    
    return {
      type: FileType.IMAGE,
      content: base64,
      mimeType,
      filename
    };
  }
  
  /**
   * Process a text file - read as UTF-8 string
   */
  private static async processTextFile(filePath: string, filename: string, mimeType: string): Promise<ProcessedFile> {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    return {
      type: FileType.TEXT,
      content,
      mimeType,
      filename
    };
  }
  
  /**
   * Process a PDF file - for now, return error suggesting text extraction
   * In a full implementation, this would use a library like pdf-parse
   */
  private static async processPdf(filePath: string, filename: string, mimeType: string): Promise<ProcessedFile> {
    // For MVP, we'll read PDF as base64 and let vision models handle it
    // Or we could extract text using a library
    throw new Error(
      `PDF processing not yet implemented. Please convert PDF to text or images first. ` +
      `For text extraction, consider using pdf-parse or similar tools.`
    );
  }
  
  /**
   * Process a Word document - for now, return error suggesting text extraction
   * In a full implementation, this would use a library like mammoth
   */
  private static async processWordDoc(filePath: string, filename: string, mimeType: string): Promise<ProcessedFile> {
    throw new Error(
      `Word document processing not yet implemented. Please convert to text or PDF first. ` +
      `For text extraction, consider using mammoth or similar tools.`
    );
  }
  
  /**
   * Process multiple files at once
   */
  static async processFiles(filePaths: string[]): Promise<ProcessedFile[]> {
    const results: ProcessedFile[] = [];
    
    for (const filePath of filePaths) {
      try {
        const processed = await this.processFile(filePath);
        results.push(processed);
      } catch (error: any) {
        console.warn(`Warning: Failed to process file "${filePath}": ${error.message}`);
        // Continue processing other files
      }
    }
    
    return results;
  }
}

export = FileHandler;
