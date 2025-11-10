# Workflow YAML Schema Improvement Analysis

## Executive Summary

This document provides a comprehensive analysis of the current workflow YAML schema and proposes improvements to make it more consistent, professional, intuitive, and clear.

## Current Schema Strengths

1. **Clear separation of concerns** - States, configuration, and control flow are well organized
2. **Flexible RAG configuration** - Supports multiple configuration styles (default, named, inline)
3. **MCP integration** - Good support for external tool integration
4. **Variable interpolation** - Simple and intuitive `{{variable}}` syntax
5. **Error handling** - Supports both state-level and workflow-level fallback

## Identified Issues and Recommendations

### 1. Inconsistent Field Naming Conventions

**Issue**: Mixed use of snake_case and camelCase across the schema
- `start_state`, `default_model`, `save_as` (snake_case)
- `mcp_servers`, `workflow_ref`, `prompt_file` (snake_case with underscores)

**Recommendation**: Standardize on snake_case throughout for consistency
- Already mostly using snake_case - this is good
- Keep current naming convention
- **Action**: Document this standard explicitly

**Priority**: Low (already mostly consistent)

---

### 2. Inconsistent "type" Field Usage

**Issue**: The `type` field serves different purposes in different contexts:
- In states: indicates state behavior (`"prompt"`, `"input"`, `"workflow_ref"`, `"transition"`)
- In MCP servers: indicates configuration style (`"npx"`, `"custom-tools"`)

**Recommendation**: While this is acceptable, ensure clear documentation distinguishes these uses
- State types: `prompt`, `input`, `workflow_ref`, `transition`
- MCP config types: `npx`, `custom-tools` (shortcuts that get normalized)

**Priority**: Low (acceptable as-is, needs clear documentation)

---

### 3. Choice State Not Properly Defined

**Issue**: The README mentions a `choice` state type with this structure:
```yaml
state_name:
  type: "choice"
  prompt: "Choose an option:"
  save_as: "variable_name"
  choices:
    - label: "Option 1"
      value: "option1"
      next: "state_for_option1"
```

However, this is NOT validated in the parser! The valid types are only: `prompt`, `input`, `workflow_ref`, `transition`

**Recommendation**: Either:
1. Remove `choice` from documentation (users can use `input` + `next_options` instead)
2. OR implement proper `choice` state validation and execution

**Priority**: HIGH - This is a critical documentation/code mismatch

---

### 4. Ambiguous RAG Configuration Options

**Issue**: Three different ways to configure RAG can be confusing:
- Workflow-level `rag:` (default)
- Workflow-level `rags:` (named configurations)
- State-level inline `rag:`
- State-level `use_rag: "name"`

**Recommendation**: 
- This flexibility is actually good, but needs clearer documentation hierarchy
- Add a decision tree diagram to help users choose
- Clarify that inline `rag:` takes precedence over `use_rag:`
- Document validation rule: cannot have both `rag:` and `use_rag:` at state level

**Priority**: Medium (good design, needs better docs)

---

### 5. MCP Server Configuration Inconsistency

**Issue**: Three configuration styles exist:
1. Standard: `command: "npx"`, `args: [...]`
2. Simplified NPX: `type: npx`, `package: "..."`
3. Simplified custom-tools: `type: custom-tools`, `toolsDirectory: "..."`

The simplified types get normalized to standard format during parsing.

**Recommendation**:
- This design is actually good (convenience + normalization)
- However, make it clearer in docs that types are "syntactic sugar"
- Add examples showing both forms
- Consider adding more shortcuts for common patterns

**Priority**: Low (good design, needs documentation clarity)

---

### 6. Unclear State Transition Semantics

**Issue**: Multiple ways to define transitions:
- `next: "state_name"` - unconditional transition
- `next: "end"` - reserved end state
- `next_options: [...]` - LLM-driven routing (only for prompt states)
- Choice state (if implemented) would have per-choice `next`

**Recommendation**:
- Document explicit precedence rules
- Clarify that `next` and `next_options` are mutually exclusive
- Make it clear that `next_options` requires at least 2 options
- Document that only `prompt` states can use `next_options` (LLM decides)
- Consider validating that `next_options` descriptions are meaningful

**Priority**: Medium

---

### 7. Missing Optional Field Documentation

**Issue**: Not always clear which fields are required vs optional:
- Is `description` optional? (Yes)
- Is `default_model` optional? (Yes, but what happens if not set?)
- Is `save_as` optional? (Yes)
- Is `model` in state optional? (Yes, falls back to default_model)

**Recommendation**:
- Add explicit "Required" vs "Optional" markers in all documentation
- Document fallback behavior clearly
- Add schema validation for required fields

**Priority**: Medium

---

### 8. Inconsistent Storage Format Field Names

**Issue**: RAG config uses `storageFormat` (camelCase) while everything else uses snake_case:
```yaml
rag:
  directory: "./knowledge-base"
  storageFormat: "msgpack"  # camelCase!
  embeddingsFile: "..."      # camelCase!
```

**Recommendation**: Rename to snake_case for consistency:
- `storageFormat` → `storage_format`
- `embeddingsFile` → `embeddings_file`
- `chunkSize` → `chunk_size` (already mentioned in some places)
- `topK` → `top_k`

**Priority**: HIGH - Consistency issue

---

### 9. Reserved Keywords Not Documented

**Issue**: `"end"` is a reserved state name, but this isn't prominently documented

**Recommendation**:
- Add a "Reserved Keywords" section to documentation
- List: `end` (reserved termination state)
- Consider adding validation warnings for other potentially problematic names
- Document that `end` doesn't need to be defined in states

**Priority**: Medium

---

### 10. Error Handling Field Naming

**Issue**: The `on_error` field is clear, but inconsistent with naming patterns
- Following pattern would be `error_fallback` or `fallback_state`
- Current: `on_error` suggests an event handler

**Recommendation**: 
- Keep `on_error` as it's already established and intuitive
- OR rename to `fallback_state` for clarity
- Document that this is for error recovery, not error logging

**Priority**: Low (current name is acceptable)

---

### 11. Missing Validation for Circular References

**Issue**: While workflow_ref has circular reference detection, state transitions don't check for infinite loops

**Recommendation**:
- Add optional validation warning for states that could loop infinitely
- Not a critical issue (user can Ctrl+C), but helpful
- Could add max iteration limit as config option

**Priority**: Low

---

### 12. Inconsistent Terminology

**Issue**: Documentation uses multiple terms for the same concept:
- "workflow file" vs "workflow YAML" vs "workflow definition"
- "state type" vs "state kind"
- "MCP server" vs "MCP servers configuration"

**Recommendation**:
- Standardize terminology across all docs
- Create a glossary section
- Use:
  - "workflow" = the complete YAML definition
  - "state" = a single step in the workflow
  - "state type" = the kind of state (prompt, input, etc.)
  - "MCP server" = a single server configuration

**Priority**: Low

---

### 13. prompt vs prompt_file Ambiguity

**Issue**: States can have either `prompt` or `prompt_file` but not both. The validation catches this, but it's not immediately obvious from the schema.

**Recommendation**:
- Document as "oneOf" relationship
- Consider a unified approach: `prompt: { text: "..." }` or `prompt: { file: "..." }`
- However, current approach is simpler and acceptable
- Just needs clearer documentation

**Priority**: Low (current design is fine)

---

### 14. Limited State Types

**Issue**: Only 4 state types: `prompt`, `input`, `workflow_ref`, `transition`
- No `choice` (despite docs mentioning it)
- No `set_variable` or `transform` for data manipulation
- No `conditional` for basic branching without LLM
- No `parallel` for concurrent execution

**Recommendation**:
- Either implement `choice` state or remove from docs
- Consider adding utility state types in future:
  - `set`: Set variable without user input
  - `choice`: Present menu to user (vs `input` for free text)
  - `conditional`: Simple if/else without LLM
- Don't add these now, but plan for extensibility

**Priority**: HIGH for `choice` mismatch, LOW for others

---

### 15. Model Field Inconsistency

**Issue**: 
- Workflow-level: `default_model`
- State-level: `model`
- RAG-level: `model`

This is inconsistent naming for the same concept.

**Recommendation**:
- Keep as-is (the distinction makes sense)
- `default_model` at workflow level is clear
- `model` at state level is an override
- Document the precedence: state `model` > workflow `default_model`

**Priority**: Low (acceptable as-is)

---

## Summary of Recommendations by Priority

### HIGH Priority (Must Fix)
1. **Choice state documentation/implementation mismatch** - Remove from docs or implement
2. **RAG field naming inconsistency** - Change camelCase to snake_case

### MEDIUM Priority (Should Fix)
3. **Optional field documentation** - Mark required vs optional clearly
4. **RAG configuration clarity** - Better docs on which option to use
5. **State transition semantics** - Clearer precedence rules
6. **Reserved keywords** - Document "end" and other reserved names

### LOW Priority (Nice to Have)
7. **Naming convention documentation** - Explicit style guide
8. **Terminology standardization** - Glossary and consistent terms
9. **Type field usage** - Clarify different contexts
10. **Circular reference detection** - Warn about potential infinite loops

---

## Proposed Schema Changes

### 1. Fix RAG Configuration Field Names (BREAKING CHANGE)

Change from camelCase to snake_case:

```yaml
# OLD (current)
rag:
  directory: "./knowledge-base"
  storageFormat: "msgpack"
  embeddingsFile: "embeddings.msgpack"
  chunkSize: 500
  topK: 3

# NEW (proposed)
rag:
  directory: "./knowledge-base"
  storage_format: "msgpack"      # snake_case
  embeddings_file: "embeddings.msgpack"  # snake_case
  chunk_size: 500                 # snake_case
  top_k: 3                        # snake_case
```

### 2. Remove Choice State from Documentation

Since it's not implemented, remove the misleading documentation or implement it properly.

### 3. Add Explicit Required/Optional Markers

Update all documentation:

```yaml
# Workflow Definition Schema
name: string                    # Required - Workflow name
description: string             # Optional - Workflow description
default_model: string          # Optional - Default Ollama model
start_state: string            # Required - Initial state name
on_error: string               # Optional - Fallback state for errors
mcp_servers: object            # Optional - MCP server configurations
rag: object                    # Optional - Default RAG configuration
rags: object                   # Optional - Named RAG configurations
states: object                 # Required - State definitions
```

---

## Implementation Plan

1. **Phase 1: Documentation Fixes (No Code Changes)**
   - Remove choice state from docs or mark as "not implemented"
   - Add required/optional markers
   - Clarify RAG configuration options
   - Document reserved keywords
   - Add glossary

2. **Phase 2: Breaking Changes (Requires Migration)**
   - Rename RAG configuration fields to snake_case
   - Update all examples
   - Add migration guide
   - Support both old and new names temporarily with deprecation warnings

3. **Phase 3: Optional Enhancements**
   - Implement choice state properly
   - Add more state types (set, conditional)
   - Add circular reference detection
   - Improve validation messages

---

## Conclusion

The current schema is **generally well-designed** with good separation of concerns and flexibility. The main issues are:

1. **Documentation inconsistencies** (choice state, required/optional fields)
2. **Naming inconsistency** (camelCase in RAG config)
3. **Need for clearer guidance** on configuration options

The recommended changes will make the schema more professional, consistent, and easier to use without major breaking changes.
