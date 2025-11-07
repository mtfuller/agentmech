# RAG (Retrieval-Augmented Generation) Feature Guide

## Overview

The RAG feature allows workflows to retrieve relevant context from a knowledge base of documents before generating responses. This enables more accurate and contextual AI responses based on your specific documentation, policies, or knowledge.

## How It Works

1. **Document Processing**: Text files in a specified directory are:
   - Scanned and loaded
   - Split into manageable chunks
   - Converted into embeddings (vector representations)
   - Cached in a MessagePack binary file for fast reuse (or optionally JSON)

2. **Query Processing**: When a prompt with RAG enabled runs:
   - The prompt is converted to an embedding
   - Similar chunks are retrieved using cosine similarity
   - Top K most relevant chunks are appended to the prompt
   - The enhanced prompt is sent to the AI model

## Storage Format

**NEW:** Embeddings are now stored in efficient MessagePack binary format by default, providing:
- **~79% smaller file size** compared to JSON
- **Faster loading and saving** of embeddings
- **Backward compatible** with existing JSON embeddings files
- **Automatic migration** from JSON to MessagePack

You can still use JSON format if needed by setting `storageFormat: "json"` in your configuration.

## Configuration Options

RAG can be configured in three flexible ways:

### 1. Default RAG (Workflow-level)

Best for: Single knowledge base used across multiple states

```yaml
rag:
  directory: "./knowledge-base"          # Required: Directory with documents
  model: "gemma3:4b"                     # Optional: Model for embeddings
  embeddingsFile: "embeddings.msgpack"   # Optional: Cache file name (default: embeddings.msgpack)
  storageFormat: "msgpack"               # Optional: "msgpack" (default) or "json"
  chunkSize: 500                         # Optional: Characters per chunk
  topK: 3                                # Optional: Number of chunks to retrieve
```

States use it with: `use_rag: true`

### 2. Named RAG Configurations

Best for: Multiple knowledge bases in one workflow

```yaml
rags:
  product_kb:
    directory: "./docs/products"
    chunkSize: 500
    topK: 3
  
  technical_kb:
    directory: "./docs/technical"
    chunkSize: 800
    topK: 5
```

States reference by name: `use_rag: "product_kb"`

### 3. Inline RAG (State-level)

Best for: State-specific knowledge base or settings

```yaml
states:
  answer_question:
    type: "prompt"
    prompt: "{{user_question}}"
    rag:
      directory: "./specific-docs"
      chunkSize: 400
      topK: 2
    next: "end"
```

## Using RAG in States

Three ways to enable RAG in a prompt state:

```yaml
# Option 1: Use default RAG configuration
state1:
  type: "prompt"
  prompt: "Question here"
  use_rag: true
  next: "end"

# Option 2: Use named RAG configuration
state2:
  type: "prompt"
  prompt: "Question here"
  use_rag: "technical_kb"
  next: "end"

# Option 3: Use inline RAG configuration
state3:
  type: "prompt"
  prompt: "Question here"
  rag:
    directory: "./docs"
    chunkSize: 600
  next: "end"
```

**Note**: You cannot combine `rag` and `use_rag` in the same state.

## Supported File Types

RAG automatically processes these file types:
- `.txt` - Text files
- `.md` - Markdown files
- `.json` - JSON files
- `.yaml`, `.yml` - YAML files
- `.js`, `.ts` - JavaScript/TypeScript files
- `.py` - Python files
- `.html` - HTML files
- `.css` - CSS files

## Best Practices

### 1. Organize Your Knowledge Base

```
knowledge-base/
├── product/
│   ├── features.txt
│   └── pricing.txt
├── installation/
│   ├── setup.md
│   └── troubleshooting.md
└── api/
    ├── endpoints.json
    └── examples.md
```

### 2. Chunk Size

- **Small chunks (200-500)**: Better for precise, specific information
- **Large chunks (1000-2000)**: Better for broader context
- Default: 1000 characters

### 3. TopK Parameter

- **Small (1-3)**: More focused, less context
- **Large (5-10)**: More context, potentially less focused
- Default: 3 chunks

### 4. Model Selection

Use embedding-capable models:
- `gemma3:4b` ✅
- `mistral` ✅
- `codellama` ✅

### 5. Embeddings Cache

- First run: Generates embeddings (slower)
- Subsequent runs: Loads from cache (faster)
- Default format: MessagePack binary (`.msgpack`)
- Commit embeddings to share with team
- Regenerate when documents change

### 6. Storage Format Options

**MessagePack (Default - Recommended)**:
- ~79% smaller file size than JSON
- Faster loading and saving
- Binary format (`.msgpack` extension)
- Best for most use cases

**JSON (Legacy)**:
- Human-readable format
- Larger file size
- Use `storageFormat: "json"` to enable
- For debugging or specific requirements

### 7. Migrating from JSON to MessagePack

Existing JSON embeddings are automatically migrated:
1. System detects legacy `embeddings.json` file
2. Loads existing embeddings
3. Saves to new `embeddings.msgpack` format
4. Original JSON file is preserved
5. Delete old JSON file after verifying migration

Manual migration:
```yaml
# Simply change your config to use msgpack
rag:
  directory: "./knowledge-base"
  storageFormat: "msgpack"  # Add this line
  embeddingsFile: "embeddings.msgpack"  # And update filename
```

## Performance Tips

1. **Keep knowledge base focused**: Only include relevant documents
2. **Set file size limits**: Large files are automatically skipped (10MB limit)
3. **Use appropriate chunk sizes**: Balance between context and precision
4. **Use MessagePack format**: Default format provides ~79% size reduction
5. **Cache embeddings**: Commit embeddings file to version control
6. **Monitor embedding generation**: Watch console output for progress

## Limitations

1. **File size**: Files larger than 10MB are skipped
2. **Directory depth**: Scans recursively (skips node_modules, .git, dist)
3. **Encoding**: UTF-8 only
4. **Embedding API**: Requires Ollama with embedding support
5. **Fallback embeddings**: 256-dimension fallback if API unavailable

## Troubleshooting

### Slow embedding generation
- Reduce number of files
- Increase chunk size
- Use cached embeddings

### Poor search results
- Adjust topK value
- Modify chunk size
- Improve document quality
- Ensure relevant documents in knowledge base

### API errors
- Verify Ollama is running
- Check model supports embeddings
- Review Ollama logs

### Dimension mismatch warnings
- Delete embeddings.json and regenerate
- Ensure consistent model usage
- Avoid mixing fallback and API embeddings

## Example Workflow

See `examples/multi-rag-qa.yaml` for a complete working example demonstrating:
- All three RAG configuration approaches (default, named, and inline)
- Multiple prompt states with different RAG strategies
- Sample knowledge base in `examples/knowledge-base/`

## Security Considerations

✅ No alerts found in security scan
- File traversal limited to specified directory
- File size limits prevent memory issues
- Error handling for permission issues
- Input validation on all configuration

## Future Enhancements

Potential improvements for RAG:
- Multiple knowledge base directories
- Metadata filtering
- Document freshness tracking
- Hybrid search (keyword + semantic)
- Custom embedding models
- Real-time document updates
