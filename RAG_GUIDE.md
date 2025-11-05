# RAG (Retrieval-Augmented Generation) Feature Guide

## Overview

The RAG feature allows workflows to retrieve relevant context from a knowledge base of documents before generating responses. This enables more accurate and contextual AI responses based on your specific documentation, policies, or knowledge.

## How It Works

1. **Document Processing**: Text files in a specified directory are:
   - Scanned and loaded
   - Split into manageable chunks
   - Converted into embeddings (vector representations)
   - Cached in a JSON file for fast reuse

2. **Query Processing**: When a prompt with RAG enabled runs:
   - The prompt is converted to an embedding
   - Similar chunks are retrieved using cosine similarity
   - Top K most relevant chunks are appended to the prompt
   - The enhanced prompt is sent to the AI model

## Configuration

Add a `rag` section to your workflow YAML:

```yaml
rag:
  directory: "./knowledge-base"     # Required: Directory with documents
  model: "llama2"                   # Optional: Model for embeddings
  embeddingsFile: "embeddings.json" # Optional: Cache file name
  chunkSize: 500                    # Optional: Characters per chunk
  topK: 3                           # Optional: Number of chunks to retrieve
```

## Using RAG in States

Add `use_rag: true` to any prompt state:

```yaml
states:
  answer_question:
    type: "prompt"
    prompt: "{{user_question}}"
    use_rag: true  # Enable RAG for this state
    next: "end"
```

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
- `llama2` ✅
- `mistral` ✅
- `codellama` ✅

### 5. Embeddings Cache

- First run: Generates embeddings (slower)
- Subsequent runs: Loads from cache (faster)
- Commit `embeddings.json` to share with team
- Regenerate when documents change

## Performance Tips

1. **Keep knowledge base focused**: Only include relevant documents
2. **Set file size limits**: Large files are automatically skipped (10MB limit)
3. **Use appropriate chunk sizes**: Balance between context and precision
4. **Cache embeddings**: Commit embeddings.json to version control
5. **Monitor embedding generation**: Watch console output for progress

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

See `examples/rag-qa.yaml` for a complete working example with:
- RAG configuration
- Multiple prompt states with RAG enabled
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
