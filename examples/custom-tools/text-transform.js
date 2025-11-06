/**
 * Text transformation tool - provides various text manipulation functions
 */

function textTransform(args) {
  const { operation, text } = args;
  
  switch (operation) {
    case 'uppercase':
      return { result: text.toUpperCase() };
    case 'lowercase':
      return { result: text.toLowerCase() };
    case 'reverse':
      return { result: text.split('').reverse().join('') };
    case 'word_count':
      return { result: text.split(/\s+/).filter(w => w.length > 0).length };
    case 'char_count':
      return { result: text.length };
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

textTransform.description = 'Transforms text using various operations (uppercase, lowercase, reverse, word_count, char_count)';
textTransform.inputSchema = {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['uppercase', 'lowercase', 'reverse', 'word_count', 'char_count'],
      description: 'The text transformation operation to perform',
    },
    text: {
      type: 'string',
      description: 'The text to transform',
    },
  },
  required: ['operation', 'text'],
};

module.exports = textTransform;
