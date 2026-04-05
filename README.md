# ruah

Multi-agent orchestration CLI. Workspace isolation, DAG scheduling, file locking, merge coordination.

When multiple AI agents (Claude Code, Aider, Codex, etc.) work on the same codebase simultaneously, their edits collide. ruah solves this with git worktrees for isolation, a DAG scheduler for task ordering, advisory file locks to prevent conflicts, and dependency-ordered merging.

**crag-aware, not crag-dependent.** When [crag](https://www.npmjs.com/package/@whitehatd/crag) governance is present, ruah automatically enforces quality gates before merging. Without crag, ruah works standalone.

## Install

```bash
npm install -g @levi-tc/ruah
```

## Quick Start

```bash
# Initialize in any git repo
ruah init

# Create isolated tasks with file locks
ruah task create auth --files "src/auth/**" --executor claude-code --prompt "Implement authentication"
ruah task create api --files "src/api/**" --executor aider --prompt "Build REST API"

# Start tasks (each runs in its own worktree)
ruah task start auth
ruah task start api

# When done, merge back (runs crag gates if available)
ruah task done auth
ruah task merge auth

# Or run a full workflow from a file
ruah workflow run .ruah/workflows/feature.md
```

## Concepts

### Tasks

A task is a unit of work with an isolated git worktree and branch. Each task can lock files to prevent other tasks from editing the same areas.

```
created → in-progress → done → merged
   │          │
   │          └→ failed
   └→ cancelled
```

### Workflows

Markdown files that define a DAG of tasks with dependencies:

```markdown
# Workflow: new-feature

## Config
- base: main
- parallel: true

## Tasks

### backend
- files: src/api/**
- executor: claude-code
- depends: []
- prompt: |
    Build the backend API endpoints.

### frontend
- files: src/ui/**
- executor: claude-code
- depends: []
- prompt: |
    Build the frontend components.

### tests
- files: tests/**
- executor: claude-code
- depends: [backend, frontend]
- prompt: |
    Write integration tests.
```

Independent tasks run in parallel. Dependent tasks wait for their prerequisites.

### File Locks

Advisory locks checked at task creation. If two tasks try to lock overlapping file patterns, the second is rejected:

```bash
ruah task create auth --files "src/auth/**"   # ✓
ruah task create login --files "src/auth/**"  # ✗ conflict
ruah task create api --files "src/api/**"     # ✓ no overlap
```

### Executors

Built-in adapters for common AI agents:

| Executor | Tool |
|----------|------|
| `claude-code` | Claude Code CLI |
| `aider` | Aider |
| `codex` | OpenAI Codex CLI |
| `open-code` | OpenCode CLI |
| `script` | Any shell command |

Unknown executor names are treated as raw shell commands.

### Subagent Spawning

Any agent running inside a task can spawn subtasks. Subtasks get their own worktrees, branched from the parent's branch — not from base.

```bash
# Parent creates a subtask (from within a running agent's CLI)
ruah task create auth-api --parent auth --files "src/auth/api/**" --executor codex --prompt "Build auth API"
ruah task create auth-ui --parent auth --files "src/auth/ui/**" --executor aider --prompt "Build auth UI"

# Subtasks run in parallel
ruah task start auth-api
ruah task start auth-ui

# Subtasks merge into parent branch
ruah task done auth-api && ruah task merge auth-api
ruah task done auth-ui && ruah task merge auth-ui

# Now parent can merge into base (all children must be merged first)
ruah task done auth && ruah task merge auth
```

**How it works:**
- `--parent <task>` branches from the parent's worktree branch, not base
- Subtask file locks must be within the parent's lock scope
- Subtask merges go into the parent branch (gates deferred to parent merge)
- Parent merge is blocked until all children are merged or cancelled
- Cancelling a parent cascades to all children
- Each executor receives env vars: `RUAH_TASK`, `RUAH_PARENT_TASK`, `RUAH_ROOT`, `RUAH_FILES`, `RUAH_WORKTREE`
- A `.ruah-task.md` is written into each worktree with subtask spawning instructions

**Works with any CLI** — the env vars and task file are executor-agnostic. Claude Code, Codex, Aider, OpenCode, or any custom script can read them and call `ruah task create --parent $RUAH_TASK`.

## CLI Reference

```
ruah init [--force]
ruah task create <name> [--files <globs>] [--base <branch>] [--executor <cmd>] [--prompt <text>] [--parent <task>]
ruah task start <name> [--no-exec] [--dry-run]
ruah task done <name>
ruah task merge <name> [--dry-run] [--skip-gates]
ruah task list [--json]
ruah task children <name> [--json]
ruah task cancel <name>
ruah workflow run <file.md> [--dry-run] [--json]
ruah workflow plan <file.md> [--json]
ruah workflow list [--json]
ruah status [--json]
```

Every command supports `--json` for programmatic consumption by agents.

## crag Integration

ruah auto-detects crag by looking for `.claude/governance.md`. When found, gates are enforced on `task merge` and `workflow run`:

- **MANDATORY** gates block the merge on failure
- **OPTIONAL** gates warn but continue
- **ADVISORY** gates log results only

Use `--skip-gates` for emergencies.

## Ecosystem

```
crag   = governance + discovery + skills + compilation  (@whitehatd/crag)
ruah   = multi-agent orchestration                      (@whitehatd/ruah)
arhy   = system contracts                               (@levi-tc/arhy)
```

## Requirements

- Node.js 18+
- Git (for worktrees)
- Zero npm dependencies

## License

MIT
