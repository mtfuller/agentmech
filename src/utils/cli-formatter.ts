import chalk from 'chalk';

/**
 * CLI formatter utility for consistent, colorful, and emoji-rich output
 */
export class CliFormatter {
  /**
   * Format a success message with green color and checkmark emoji
   */
  static success(message: string): string {
    return chalk.green(`✅ ${message}`);
  }

  /**
   * Format an error message with red color and X emoji
   */
  static error(message: string): string {
    return chalk.red(`❌ ${message}`);
  }

  /**
   * Format a warning message with yellow color and warning emoji
   */
  static warning(message: string): string {
    return chalk.yellow(`⚠️  ${message}`);
  }

  /**
   * Format an info message with blue color and info emoji
   */
  static info(message: string): string {
    return chalk.blue(`ℹ️  ${message}`);
  }

  /**
   * Format a workflow/process start message with purple color and rocket emoji
   */
  static workflowStart(message: string): string {
    return chalk.magenta(`🚀 ${message}`);
  }

  /**
   * Format a state/step message with cyan color and arrow emoji
   */
  static step(message: string): string {
    return chalk.cyan(`➡️  ${message}`);
  }

  /**
   * Format a file-related message with color and file emoji
   */
  static file(message: string): string {
    return chalk.gray(`📄 ${message}`);
  }

  /**
   * Format a folder/directory message with folder emoji
   */
  static folder(message: string): string {
    return chalk.gray(`📁 ${message}`);
  }

  /**
   * Format a loading/processing message with spinner emoji
   */
  static loading(message: string): string {
    return chalk.cyan(`⏳ ${message}`);
  }

  /**
   * Format a completion message with celebration emoji
   */
  static complete(message: string): string {
    return chalk.green(`🎉 ${message}`);
  }

  /**
   * Format a robot/AI message with robot emoji
   */
  static ai(message: string): string {
    return chalk.magenta(`🤖 ${message}`);
  }

  /**
   * Format a stop/halt message with stop sign emoji
   */
  static stop(message: string): string {
    return chalk.red(`🛑 ${message}`);
  }

  /**
   * Format a server/network message with globe emoji
   */
  static server(message: string): string {
    return chalk.green(`🌐 ${message}`);
  }

  /**
   * Format a test message with test tube emoji
   */
  static test(message: string): string {
    return chalk.cyan(`🧪 ${message}`);
  }

  /**
   * Format a passed test with green checkmark
   */
  static testPass(message: string): string {
    return chalk.green(`✓ ${message}`);
  }

  /**
   * Format a failed test with red X
   */
  static testFail(message: string): string {
    return chalk.red(`✗ ${message}`);
  }

  /**
   * Format a header/title with bold text
   */
  static header(message: string): string {
    return chalk.bold.cyan(message);
  }

  /**
   * Format a section divider
   */
  static divider(char: string = '='): string {
    return chalk.gray(char.repeat(60));
  }

  /**
   * Format a path with special color
   */
  static path(path: string): string {
    return chalk.underline.cyan(path);
  }

  /**
   * Format a model name with special color
   */
  static model(name: string): string {
    return chalk.yellow(`🧠 ${name}`);
  }

  /**
   * Format a numeric value with special color
   */
  static number(value: number | string): string {
    return chalk.bold.white(value.toString());
  }

  /**
   * Format a highlight/emphasis
   */
  static highlight(message: string): string {
    return chalk.bold.yellow(message);
  }

  /**
   * Format a muted/dim message
   */
  static dim(message: string): string {
    return chalk.dim(message);
  }

  /**
   * Format a multimodal/image message
   */
  static image(message: string): string {
    return chalk.magenta(`📷 ${message}`);
  }

  /**
   * Format a RAG/search message
   */
  static rag(message: string): string {
    return chalk.blue(`🔍 ${message}`);
  }

  /**
   * Format an MCP/tool message
   */
  static tool(message: string): string {
    return chalk.green(`🔧 ${message}`);
  }

  /**
   * Format a time/duration message
   */
  static time(message: string): string {
    return chalk.gray(`⏱️  ${message}`);
  }
}

export default CliFormatter;
