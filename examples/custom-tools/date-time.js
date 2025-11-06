/**
 * Date and time utility tool
 */

function dateTime(args) {
  const { operation, dateString, format } = args;
  
  switch (operation) {
    case 'current':
      return { result: new Date().toISOString() };
    case 'parse':
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date string');
      }
      return { result: date.toISOString() };
    case 'format':
      const d = dateString ? new Date(dateString) : new Date();
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date string');
      }
      
      switch (format) {
        case 'date':
          return { result: d.toLocaleDateString() };
        case 'time':
          return { result: d.toLocaleTimeString() };
        case 'iso':
          return { result: d.toISOString() };
        default:
          return { result: d.toString() };
      }
    case 'timestamp':
      const ts = dateString ? new Date(dateString) : new Date();
      if (isNaN(ts.getTime())) {
        throw new Error('Invalid date string');
      }
      return { result: ts.getTime() };
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

dateTime.description = 'Provides date and time utilities (current, parse, format, timestamp)';
dateTime.inputSchema = {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['current', 'parse', 'format', 'timestamp'],
      description: 'The date/time operation to perform',
    },
    dateString: {
      type: 'string',
      description: 'Date string to parse or format (optional for current/format)',
    },
    format: {
      type: 'string',
      enum: ['date', 'time', 'iso', 'full'],
      description: 'Format type for format operation',
    },
  },
  required: ['operation'],
};

module.exports = dateTime;
