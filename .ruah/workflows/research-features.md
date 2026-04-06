# Workflow: research-features

## Config
- base: main
- parallel: true

## Tasks

### parallelism-cap
- files: src/core/config.ts, src/core/planner.ts
- executor: claude-code
- depends: []
- prompt: |
    Add a maxParallel config option (default: 5) and enforce it in the planner.
    In src/core/config.ts: add maxParallel?: number to RuahConfig, validate as positive integer.
    In src/core/planner.ts: when a stage has more tasks than maxParallel, split into sub-batches.
    Add tests in test/planner.test.ts for the cap behavior.

### conflict-detection
- files: src/core/git.ts
- executor: claude-code
- depends: []
- prompt: |
    Add a checkMergeConflicts(branchA, branchB, repoRoot) function using git merge-tree.
    The command: git merge-tree --write-tree <base> <branchA> <branchB>
    Returns exit 0 if clean, exit 1 if conflicts. Parse the output for conflict file list.
    Export the function. Add tests in test/git.test.ts.

### on-conflict-strategy
- files: src/core/workflow.ts
- executor: claude-code
- depends: []
- prompt: |
    Add an optional on_conflict property to WorkflowTask: "fail" | "rebase" | "retry".
    Default is "fail" (current behavior). Parse it from workflow markdown like:
    - on_conflict: rebase
    Update WorkflowConfig to also support a default on_conflict.
    Add tests in test/workflow.test.ts.

### mcp-executor
- files: src/core/executor.ts
- executor: claude-code
- depends: []
- prompt: |
    Add a codex-mcp executor adapter that uses the Codex MCP server protocol.
    The adapter should connect to a local MCP server at the URL from env CODEX_MCP_URL
    (default: http://localhost:3100). It sends a JSON-RPC request to execute code tasks.
    For now, implement the adapter structure with a fallback to the existing codex CLI
    adapter when MCP is unavailable. Add the adapter to the ADAPTERS record.
    Add a test for the dry-run path.

### region-locking
- files: src/core/state.ts
- executor: claude-code
- depends: []
- prompt: |
    Extend the file locking system to support optional region locks.
    Add a RegionLock interface: { file: string, startLine?: number, endLine?: number, symbol?: string }.
    Add acquireRegionLocks(state, taskName, regions, parentName?) function.
    Region locks on the same file are compatible if their line ranges don't overlap,
    or if they lock different symbols. If no region is specified, it's a full-file lock (current behavior).
    Add tests in test/state.test.ts for region lock compatibility.
