# Reddit Posts: r/node and r/commandline

Research date: April 6, 2026

---

## r/node

**Status:** Primary target. High-value audience.

**Strategy notes:**

r/node respects engineering substance over product marketing. The post must read like a peer explaining architectural tradeoffs, not a founder pitching a tool. Key signals this audience responds to:

- Zero runtime dependencies (devDependencies only: TypeScript, Biome, @types/node)
- ESM-only with `"type": "module"` — no CJS dual-publish complexity
- 152 test cases run via `node --test` (built-in runner, no Jest/Vitest dep)
- Process spawning model for executors (child_process.spawn, not workers)
- Atomic state writes (write-to-tmp + rename, not direct file writes)
- No framework dependencies for CLI argument parsing — hand-rolled router
- Pure Node.js standard library: fs, path, child_process, crypto. Nothing else.

The title should signal "Node engineering" not "AI product." Lead with the technical architecture. Mention AI orchestration as the use case, not the identity.

**Timing:** Post Tuesday-Thursday, 14:00-17:00 UTC. Avoid weekends.

**Flair:** Use "Show Off a Project" or equivalent.

---

### Title

`I built a zero-dep Node CLI for process orchestration using git worktrees, glob-based file locking, and DAG scheduling`

### Body

````md
I've been working on a CLI tool called `ruah` that coordinates parallel processes — each gets its own git worktree, file locks prevent overlap, and a DAG scheduler handles dependency ordering. The main use case is running multiple AI coding agents simultaneously, but the internals are just Node process management and git plumbing.

I wanted to share the engineering decisions since this sub tends to appreciate that more than feature lists.

**Zero runtime deps, for real**

`package.json` has zero `dependencies`. Everything is `devDependencies` (TypeScript, Biome linter, @types/node). The published package is just compiled JS. No left-pad, no chalk, no commander, no yargs.

- CLI argument parsing is a hand-rolled parser (~40 lines) that produces `{ _: string[], flags: Record<string, string | boolean> }` and routes to command handlers. It handles `--key value`, `--key=value`, `--bool-flag`, and positional args. No framework needed for a finite set of commands.
- Color output uses raw ANSI escapes behind a `NO_COLOR` / `FORCE_COLOR` check.
- Config loading checks `.ruahrc` (JSON) then falls back to a `"ruah"` key in `package.json`. Two `readFileSync` calls, one `JSON.parse` each. Done.

**ESM-only, TypeScript strict**

`"type": "module"` in package.json, all imports use `.js` extensions (the TypeScript → ESM convention). No CJS compatibility shim, no dual publishing. `engines` requires Node >= 18. TypeScript runs in strict mode with `noUncheckedIndexedAccess`.

**State management: atomic JSON writes**

All state lives in `.ruah/state.json` — tasks, locks, history. The write path does:

```typescript
const tmp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
renameSync(tmp, file);
```

Write to a random temp file, then atomic rename. No corruption on crash. No database, no SQLite, no lock files — just a JSON file with safe writes. History is capped at 200 entries with a sliding window.

**Process spawning model**

Each "executor" (Claude Code, Aider, Codex, or any CLI) is spawned via `child_process.spawn` into its worktree directory:

```typescript
const child = spawn(cmd, args, {
  cwd: worktreePath,
  env: { ...process.env, RUAH_TASK: name, RUAH_WORKTREE: path },
  stdio: silent ? "pipe" : "inherit",
});
```

Executors are just adapter functions: `(prompt: string) => { command: string, args: string[] }`. Adding a new executor is 3 lines. Unknown executors are treated as raw shell commands — `ruah task start foo --executor "python3 run.py"` just works.

A safety net auto-commits any uncommitted work when the child process exits (or errors), so agent crashes don't lose work:

```typescript
child.on("close", (code) => {
  autoCommitChanges(taskName, worktreePath);  // best-effort, non-fatal
  resolve({ success: code === 0, exitCode: code });
});
```

**File locking via glob overlap detection**

Locks are glob patterns, not inode locks. When task A locks `src/auth/**` and task B tries to lock `src/auth/login.ts`, the overlap detection catches it:

```typescript
// Both globs and specific paths are handled
patternsOverlap("src/auth/**", "src/auth/login.ts") // true
patternsOverlap("src/api/**", "src/ui/**")           // false
```

Subtask locks must be within the parent's scope — you can't lock files your parent doesn't own. Siblings can conflict with each other, but not with the parent.

**DAG scheduling from markdown**

Workflows are defined in markdown files (parsed line-by-line, no markdown AST library). The scheduler does a standard topological sort to produce execution stages:

```
Stage 0: [models, config]     ← no deps, run parallel
Stage 1: [api, auth]          ← depend on models
Stage 2: [integration-tests]  ← depends on api + auth
```

When `parallel: true` is set, a planner analyzes pairwise file overlaps within each stage and decides: run parallel (no overlap), parallel-with-contracts (low overlap — agents get owned/shared-append/read-only file lists), or serialize (high overlap).

**--json everywhere**

Every command that produces output supports `--json`. `ruah task list --json`, `ruah status --json`, `ruah workflow plan --json`. Makes it composable with jq, scripts, CI pipelines.

**Testing**

152 test cases using Node's built-in `node --test` runner. No test framework dependency. Tests cover state management, lock conflict detection, DAG validation, glob overlap, workflow parsing, CLI argument parsing, and git operations.

---

Repo: https://github.com/levi-tc/ruah

```bash
npm install -g @levi-tc/ruah
# or try the 3-second interactive demo:
npx @levi-tc/ruah demo
```

I'm especially interested in feedback on:
- The process spawning model — is `spawn` with `stdio: "inherit"` the right default, or should I always pipe and stream?
- State-as-JSON vs. something like better-sqlite3 for the lock/task store
- The glob overlap algorithm — currently string-prefix based, considering switching to micromatch for accuracy

Source is ~2k lines of TypeScript across 8 core modules. Happy to walk through any part of it.
````

### First comment (post immediately after submitting)

````md
For anyone curious about the architecture layout, the core modules are:

- `state.ts` — JSON state store with atomic writes, lock acquisition, task CRUD
- `executor.ts` — process spawning with adapter pattern, auto-commit safety net
- `git.ts` — worktree lifecycle, merge with conflict detection, branch management
- `planner.ts` — pairwise overlap analysis, file contracts, stage strategy decisions
- `workflow.ts` — markdown parser, DAG validation (cycle detection), topological sort
- `integrations.ts` — governance gate runner, entity contract parser
- `config.ts` — cascading config from .ruahrc / package.json
- `reconcile.ts` — detects externally merged branches and cleans up stale state

The whole thing is ~2k lines. No class hierarchies, no DI containers — just functions and interfaces.
````

### Engagement plan

If the post gets traction:

1. Answer technical questions with code snippets from the actual source, not descriptions
2. If someone asks "why not use X library" — give the honest tradeoff, not a defensive answer
3. If someone suggests better-sqlite3 or a real lock manager — acknowledge it as a valid scaling path and explain the current design point (single-user CLI, <100 tasks)
4. Do not link to the GitHub more than once in comments (looks spammy)
5. Do not mention "AI agents" in comment replies unless someone else brings it up first — keep the conversation on Node engineering

---

## r/commandline

**Status:** SKIP. Do not post.

**Why:**

- r/commandline explicitly bans generative-AI-related projects unless they are already notable or widely adopted (see meta-post on "AI slop" rules)
- ruah's primary purpose is AI agent orchestration, which falls squarely in the disallowed category
- Even with all AI language stripped, the tool's GitHub README, npm description, and keyword tags all reference AI agents — a single click exposes the connection
- The popular tools in this community (fzf, fd, bat, ripgrep, delta) follow Unix philosophy: do one thing, pipe to the next. ruah is an orchestrator, which is the opposite pattern
- Risk of removal + negative reputation is not worth the potential reach
- Wait until ruah has organic GitHub stars (500+) or is referenced by others in the community before approaching this sub

**Fallback draft (use only if explicitly testing, expect removal)**

If you decide to test this community despite the risk, strip every reference to AI, agents, coding assistants, and LLMs. Frame it purely as a process orchestration CLI.

### Title

`ruah: git worktree isolation + file locking + DAG scheduling for parallel terminal tasks`

### Body

````md
I built a CLI for running parallel terminal tasks where each task gets its own git worktree, file-scope locks prevent two tasks from touching the same paths, and a DAG scheduler handles dependency ordering.

The problem it solves: you have N terminal processes that need to modify the same repo simultaneously without stepping on each other. Instead of branch discipline, each task gets an isolated worktree automatically. File patterns are locked per-task so overlapping writes are caught before they happen. When tasks finish, they merge back in dependency order.

Design choices:

- **Zero runtime deps** — published package is just compiled JS, no node_modules tree
- **--json on every command** — `ruah task list --json | jq '.[] | select(.status == "running")'`
- **No daemon** — stateless CLI, state is a single JSON file in `.ruah/state.json`
- **Composable** — stdout is clean for piping, stderr gets status messages
- **Workflows from markdown** — define task DAGs in `.md` files, parseable and version-controllable

```bash
# Create two isolated tasks with file locks
ruah task create api --files "src/api/**"
ruah task create ui --files "src/ui/**"

# Start both — they get separate worktrees, can't touch each other's files
ruah task start api
ruah task start ui

# When done, merge in order
ruah task done api && ruah task merge api
ruah task done ui && ruah task merge ui
```

```bash
# Status as JSON for scripting
ruah status --json

# Workflow DAG visualization
ruah workflow plan deploy.md
```

MIT licensed, TypeScript, ESM. Repo: https://github.com/levi-tc/ruah

Would be curious if anyone has hit the "multiple processes, same repo" problem and how you solved it — rsync copies, git worktrees manually, or just yelling at each other.
````

### Notes if posting

- Do NOT mention AI, agents, LLMs, Claude, Codex, or coding assistants anywhere — title, body, or comments
- If someone asks "what kind of terminal tasks?" say "build pipelines, test runners, deploy scripts, anything that modifies files in the same repo"
- If someone directly asks if this is for AI agents, be honest, but don't volunteer it
- Monitor for mod removal in the first 2 hours. If removed, do not repost.

---

## Sources

- https://www.reddit.com/r/node/about/rules/.json
- https://www.reddit.com/r/node/about.json
- https://www.reddit.com/r/node/comments/1rk0krx/i_built_tool_name_a_modern_tech_stackfirst_what/
- https://www.reddit.com/r/node/comments/1s45302/i_built_dependency_sandboxing_for_node_opensourced/
- https://www.reddit.com/r/commandline/about/rules/.json
- https://www.reddit.com/r/commandline/about.json
- https://www.reddit.com/r/commandline/comments/1qpcsb6/rcommandline_metapost_new_rules_re_ai_slop/
- https://www.reddit.com/r/commandline/comments/1rnyc3r/opensource_cli_for_switching_codex_and_claude/
