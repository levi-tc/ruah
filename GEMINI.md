# GEMINI.md

> Generated from governance.md by crag. Regenerate: `crag compile --target gemini`

## Project Context

- **Name:** @levi-tc/ruah
- **Description:** Multi-agent orchestration CLI. Workspace isolation, DAG scheduling, file locking, merge coordination.
- **Runtimes:** node

## Rules

### Quality Gates

Run these checks in order before committing any changes:

1. [lint & format] `npx @biomejs/biome check --write .`
2. [lint & format] `npx @biomejs/biome check .`
3. [test] `node --test test/*.test.js`

### Security

- Never hardcode secrets, API keys, or credentials in source code
- Grep for sk_live, AKIA, password= before every commit
- Validate all user input at system boundaries

### Workflow

- Use conventional commits (feat:, fix:, docs:, chore:, etc.)
- Run quality gates before committing
- Review security implications of all changes
