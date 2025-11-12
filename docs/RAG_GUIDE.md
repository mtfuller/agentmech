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

You can still use JSON format if needed by setting `storage_format: "json"` in your configuration.

## Configuration Options

RAG can be configured in two flexible ways:

### 1. Named RAG Configurations

Best for: Multiple knowledge bases in one workflow

```yaml
rags:
  product_kb:
    directory: "./docs/products"
    chunk_size: 500
    top_k: 3
  
  technical_kb:
    directory: "./docs/technical"
    chunk_size: 800
    top_k: 5
```

States reference by name: `use_rag: "product_kb"`

### 2. Inline RAG (State-level)

Best for: State-specific knowledge base or settings

```yaml
states:
  answer_question:
    type: "prompt"
    prompt: "{{user_question}}"
    rag:
      directory: "./specific-docs"
      chunk_size: 400
      top_k: 2
    next: "end"
```

## Using RAG in States

Three ways to enable RAG in a prompt state:

```yaml
# Option 1: Use default RAG configuration
state1:
  type: "prompt"
  prompt: "Question here"
  use_rag: "wow"
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
    chunk_size: 600
  next: "end"
```

**Note**: You cannot combine `rag` and `use_rag` in the same state.

## Customizing RAG Context Injection

**NEW:** You can now customize how RAG chunks are formatted and injected into your prompts using custom templates.

### Custom Templates

RAG supports two types of templates:

#### 1. Chunk Template (`chunk_template`)

Controls how individual RAG chunks are formatted. Available placeholders:
- `{{chunk.source}}` - Source file path
- `{{chunk.text}}` - Chunk content
- `{{chunk.id}}` - Chunk identifier
- `{{index}}` - 0-based chunk index
- `{{number}}` - 1-based chunk number

**Example:**
```yaml
rag:
  product_kb:
    directory: "./docs/products"
    chunk_template: |
      {{number}}. From {{chunk.source}}:
      {{chunk.text}}
```

#### 2. Context Template (`context_template`)

Controls how the overall RAG context (all chunks) is combined with your prompt. Available placeholders:
- `{{chunks}}` - All chunks formatted with `chunk_template`
- `{{prompt}}` - The original user prompt

**Example:**
```yaml
rag:
  technical_kb:
    directory: "./docs/technical"
    context_template: |
      Reference Documentation:
      {{chunks}}
      
      User Question: {{prompt}}
      
      Please answer based on the references above.
```

### Complete Example

Combine both templates for complete control:

```yaml
rag:
  knowledge_base:
    directory: "./knowledge"
    model: "all-minilm"
    chunk_size: 500
    top_k: 3
    chunk_template: |
      ### Source: {{chunk.source}}
      {{chunk.text}}
    context_template: |
      ## Knowledge Base Context
      
      {{chunks}}
      
      ---
      
      **Query**: {{prompt}}
      
      **Instructions**: Answer the query using only the context provided above.

states:
  answer:
    type: "prompt"
    prompt: "{{user_question}}"
    use_rag: "knowledge_base"
    next: "end"
```

### Default Behavior

If no custom templates are specified, RAG uses these defaults:

**Default chunk format:**
```
[Source: {{chunk.source}}]
{{chunk.text}}
```

**Default context format:**
```

Relevant context from knowledge base:

{{chunks}}

```

### Use Cases for Custom Templates

1. **Structured Output**: Format chunks as numbered lists, markdown sections, or bullet points
2. **Prompt Engineering**: Add specific instructions on how to use the context
3. **Metadata Display**: Include chunk IDs or indexes for traceability
4. **Language-Specific Formatting**: Adapt formatting for different languages or writing styles
5. **Chain-of-Thought**: Structure context to encourage better reasoning from the LLM

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

Use only the following embedding models:
- `embeddinggemma` ✅
- `qwen3-embedding` ✅
- `all-minilm` ✅

**Note:** These are specialized embedding models. General-purpose models like `gemma3:4b`, `mistral`, or `codellama` are not supported for RAG embeddings.

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
- Use `storage_format: "json"` to enable
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
  storage_format: "msgpack"  # Add this line
  embeddings_file: "embeddings.msgpack"  # And update filename
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
- Adjust top_k value
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
