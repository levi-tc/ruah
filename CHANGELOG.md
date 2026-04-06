# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-04-06

### Added
- **`ruah task retry <name>`** — re-execute failed tasks without recreating worktrees. Supports `--dry-run` and `--no-exec` flags.
- **`ruah config`** — display resolved project configuration
- **Config file support** — load project defaults from `.ruahrc` (JSON) or `package.json` `"ruah"` section. Supports `baseBranch`, `executor`, `timeout`, `files`, `skipGates`, and `parallel`. `.ruahrc` takes precedence.
- **`ruah workflow create <name>`** — scaffold workflow markdown files from a built-in template with config, parallel tasks, and dependency examples. Supports `--force` to overwrite.

### Changed
- Task create and workflow run now read defaults from config file when CLI flags are not provided

## [0.1.1] - 2026-04-06

### Added
- **`ruah setup`** — registers ruah with AI coding agents (Claude Code, Cursor, Windsurf, Cody, Continue) so they auto-detect and use it
- **Update notifications** — non-blocking npm registry check every 24 hours, cached in `~/.ruah/`, disable with `RUAH_NO_UPDATE_CHECK=1`
- **CI/CD pipelines** — GitHub Actions for gates (lint + typecheck + test), PR checks, and auto-publish on tag push
- **GitHub Releases** — auto-created with release notes on version tag push

### Changed
- **Full TypeScript rewrite** — all 11 source files and 6 test files converted to strict TypeScript
- Compiled output ships in `dist/` instead of raw `src/`
- CI upgraded to Node 20
- Biome config added (`biome.json`) to exclude compiled output from linting

## [0.1.0] - 2026-04-05

### Added
- **Task lifecycle** — `create`, `start`, `done`, `merge`, `cancel` with git worktree isolation per task
- **Workflow engine** — markdown-defined DAGs with parallel execution and dependency ordering
- **File locks** — advisory glob-based locks preventing edit conflicts between agents
- **Executor adapters** — built-in support for Claude Code, Aider, Codex, OpenCode, and shell scripts
- **Subagent spawning** — agents can create subtasks that branch from the parent's worktree
- **crag integration** — auto-enforces governance gates (MANDATORY/OPTIONAL/ADVISORY) on merge
- **arhy integration** — detects `.arhy` contract files for file boundary inference
- **JSON output** — every command supports `--json` for programmatic consumption
- **Status dashboard** — `ruah status` shows tasks, locks, worktrees, and integrations
- Zero runtime dependencies
