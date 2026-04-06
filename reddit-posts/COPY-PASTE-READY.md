# Reddit Posts — Copy & Paste Ready

Each post has: TITLE (paste into Reddit title field) and BODY (paste into Reddit body field). Some also have a FIRST COMMENT to post immediately after.

---
---

# 1. r/coolgithubprojects

Post type: Link post to https://github.com/levi-tc/ruah

## TITLE

[CLI] ruah — give each AI coding agent its own worktree so they never touch the same files

## FIRST COMMENT

I kept running into the same problem: spin up two AI agents on the same repo and their edits collide within minutes. So I built a CLI that eliminates it structurally.

**What it does:**

Each task gets its own git worktree and branch. Files are locked before any agent starts. If two tasks claim overlapping files, the second one is rejected — no conflicts possible.

```
  agent 1 ──→ worktree A ──→ src/auth/**  locked
  agent 2 ──→ worktree B ──→ src/ui/**    locked  ← no collisions
  agent 3 ──→ worktree C ──→ tests/**     locked
```

**Highlights:**

- Worktree isolation per task (not docker, not temp dirs — actual git worktrees)
- Advisory file locks checked at task creation
- Markdown-defined DAG workflows — independent tasks run in parallel, dependent tasks wait
- Subagent spawning — a running agent can create child tasks that branch from *its* worktree
- Works with Claude Code, Aider, Codex, Cursor, Windsurf, or any CLI
- Zero runtime deps, MIT licensed, 152 tests

**3-second demo (creates a temp repo, shows everything, cleans up):**

```bash
npx @levi-tc/ruah demo
```

Feedback welcome — especially on the lock model and whether the DAG workflow format makes sense.

---
---

# 2. r/IMadeThis

Post type: Text post

## TITLE

I kept losing hours to AI agents fighting over the same files, so I built a CLI to give each one its own workspace

## BODY

For the last few months I've been using multiple AI coding agents at the same time -- Claude Code on one feature, Codex on another, sometimes Aider for a quick refactor. The promise is obvious: parallelize your work, ship faster.

The reality was me staring at a terminal at 11pm trying to untangle what happened when two agents both decided to rewrite the same utility file. One would finish, the other would finish on stale code, and git merge would hand me a pile of conflicts that neither agent understood. I'd spend more time cleaning up than I saved.

After the third time I lost an evening to this, I started building ruah.

The idea is dead simple: each task gets its own git worktree (so agents literally can't see each other's changes), and you declare which files each task owns up front. If two tasks claim the same file, ruah rejects it before anything runs. No more "I'll just be careful" -- the tool enforces the boundaries.

It also handles the merge sequencing. If task B depends on task A, ruah merges A first, then rebases B, then merges B. You describe the dependency graph in a markdown file and ruah executes it.

It works with any CLI agent -- Claude Code, Codex, Aider, Cursor, Windsurf, whatever. Zero runtime dependencies, MIT licensed, written in TypeScript.

I'm still actively working on it (v0.3.2 right now), so it's rough around some edges. But the core loop -- worktree isolation, file locking, DAG-based merge order -- has been solid for me.

What's the dumbest amount of time you've lost to a problem that should have been trivial? I need to feel less alone about my 11pm merge sessions.

## FIRST COMMENT

Links for anyone who wants to try it:

- GitHub: https://github.com/levi-tc/ruah
- npm: `npm install -g @levi-tc/ruah`
- 3-second demo: `npx @levi-tc/ruah demo`

Happy to answer any questions about the implementation. The whole thing is ~2K lines of TypeScript with 152 tests and zero runtime deps.

---
---

# 3. r/ClaudeAI

Post type: Text post

## TITLE

I built an orchestration layer for running multiple Claude Code sessions on the same repo without them destroying each other's work

## BODY

I've been using Claude Code as my primary coding tool for months now. It's genuinely great for focused single-task work. But I kept hitting the same wall:

**The moment I needed two Claude Code sessions working on the same repo, everything fell apart.**

Session A rewrites a file. Session B is working from a stale read of that file. Session A finishes, I merge, then Session B finishes with a version of the file that conflicts. Now I'm spending 20 minutes hand-resolving merge conflicts that an agent was supposed to save me from.

Or: I'm on a feature that touches auth, API routes, and frontend components. The context window can't hold all of it at once. So I split it into three sessions — but now I'm the scheduler. I'm the merge coordinator. I'm the conflict detector. I'm doing the work the agents were supposed to eliminate.

**So I built ruah.**

It's an open-source CLI that sits underneath Claude Code (or any coding agent) and handles the coordination layer:

- **Worktree isolation** — each task gets its own git worktree and branch. Agents literally cannot see each other's uncommitted work. No stale reads, no interference.
- **File locking** — before a task starts, ruah locks the file patterns it will touch. If two tasks overlap, you find out *before* any agent runs, not after 10 minutes of wasted compute.
- **DAG workflows** — define a markdown file with tasks and dependencies. Independent tasks run in parallel, dependent tasks wait. ruah's planner analyzes file overlaps and decides per-stage whether to run full parallel, parallel with modification contracts, or serial.
- **Subagent spawning** — a running Claude Code session can spawn child tasks. Children branch from the parent (not main), do their work in isolation, and merge back into the parent first. Parent merge to main is blocked until children are done.
- **Governance gates** — if you have a `.claude/governance.md`, ruah auto-runs those gates before every merge.

Real example of what my workflow looks like now:

    ruah task create auth --files "src/auth/**" --executor claude-code \
      --prompt "Implement JWT authentication with refresh tokens"
    ruah task create api --files "src/api/**" --executor claude-code \
      --prompt "Build REST endpoints for user management"
    ruah task create tests --files "test/**" --executor claude-code \
      --prompt "Write integration tests for auth and API" \
      --depends auth,api

    ruah task start auth
    ruah task start api
    # tests waits automatically until auth and api finish

The auth and api tasks run in parallel in separate worktrees with locked file scopes. The test task doesn't start until both are merged. No manual coordination.

It also works with Aider, Codex, and any other CLI — 7 built-in executor adapters — but I built it primarily because Claude Code is what I use daily and the single-session ceiling was the bottleneck.

**Try it:**

    npx @levi-tc/ruah demo

3-second interactive demo that creates a temp repo, shows isolation, locking, and conflict detection, then cleans up.

Repo: https://github.com/levi-tc/ruah

Zero runtime deps, MIT, TypeScript, 152 tests.

---

Genuine question for other Claude Code power users: **what's your current strategy when a task is too big for one session?** Do you split manually across sessions? Use worktrees by hand? Just feed everything into one massive context and hope? I'm curious what the actual workflow looks like for people hitting this ceiling.

---
---

# 4. r/SideProject

Post type: Text post
Best time: Saturday or Sunday, 9am-12pm EST

## TITLE

I mass-produce merge conflicts for a living (or: what happens when you run 3 AI coding agents on the same repo)

## BODY

Let me describe a workflow that sounds great on paper and is miserable in practice.

You have a feature to build. It has three independent pieces -- auth backend, dashboard UI, API tests. You spin up Claude Code on auth, Codex on the dashboard, Aider on the tests. In theory, you just tripled your throughput.

Here's what actually happens.

Claude Code finishes auth and touches `src/lib/utils.ts` to add a helper. Codex, working off the original branch, also touches `src/lib/utils.ts` because it needed a formatting function. Neither knows the other exists. You now have two divergent versions of the same file, and git merge gives you a conflict block that makes sense to neither agent nor human.

But it gets worse. The API tests depend on the auth module that Claude Code just built. Aider started from the old code, so its tests reference function signatures that don't exist anymore. The tests pass in Aider's worktree and fail the moment you merge.

I ran into variations of this pattern for weeks. The failure mode was always the same: **agents working in isolation is great until their outputs have to recombine.** The merge step is where everything falls apart, and there's no undo button because both agents already committed their work.

The frustrating part is that the solution is conceptually simple. You need three things:

1. **Actual isolation** -- not "please don't touch this file," but real filesystem-level separation so agents physically cannot interfere
2. **Declared ownership** -- each task states which files it will touch, and overlaps are rejected before execution
3. **Ordered merging** -- if task B depends on task A, A merges first, B rebases onto the result, then B merges

That's what I built. It's called ruah -- an open-source CLI that handles multi-agent orchestration using git worktrees.

Each task gets its own worktree (a real, separate copy of the repo that git manages natively). You define file patterns each task owns. If two tasks claim overlapping files, ruah blocks it at creation time, not after an hour of wasted compute. Dependencies between tasks are expressed in a simple markdown workflow file, and ruah executes the merge DAG in the right order.

It's agent-agnostic. Claude Code, Codex, Aider, Cursor, Windsurf -- anything that runs in a terminal. No plugins, no API keys, no runtime dependencies. Just git.

I've been using it daily for about two months. The thing that surprised me most isn't the merge conflict prevention (that's table stakes) -- it's how much faster I context-switch when each task is physically isolated. I can `cd` into a worktree and see only the changes for that task. No mental overhead of "which changes are mine."

Still early (v0.3.2), still actively building. But the core has 152 tests and has been solid.

For anyone here running multiple agents or even just multiple feature branches simultaneously: **what's your merge strategy?** Do you just YOLO and fix conflicts manually? Do you serialize everything and give up parallelism? I'm genuinely curious because every approach I tried before building this felt like a hack.

## FIRST COMMENT

Links and technical details:

- GitHub: https://github.com/levi-tc/ruah
- npm: `npm install -g @levi-tc/ruah`
- 3-second interactive demo: `npx @levi-tc/ruah demo`

Quick example of what usage looks like:

    ruah task create auth --files "src/auth/**" --executor claude-code --prompt "Add authentication"
    ruah task create ui --files "src/ui/**" --executor codex --prompt "Build dashboard"
    ruah task start auth
    ruah task start ui

Stack: TypeScript, zero runtime deps, MIT licensed. Works on macOS and Linux (Windows via WSL).

Happy to go deep on any implementation decisions. The worktree + file-lock approach has some interesting tradeoffs I can talk about.

---
---

# 5. r/LocalLLaMA

Post type: Link post to https://github.com/levi-tc/ruah
Best time: 3 AM EST (international audience)

## TITLE

ruah — open-source CLI for running multiple coding agents in parallel without merge conflicts. Executor-agnostic: works with any CLI, any model, any provider.

## FIRST COMMENT

I built ruah because multi-agent coding workflows have a coordination problem that's independent of which model or provider you use.

The moment you have two agents working on the same repo — whether that's two Aider sessions with DeepSeek, a local Ollama setup piped through a script, Claude Code, Codex, or any mix — you get the same failure modes:

1. **Stale reads** — Agent B reads a file that Agent A is about to rewrite
2. **Edit collisions** — both agents modify overlapping files, producing unresolvable conflicts
3. **Merge ordering** — no clear way to sequence merges when tasks have dependencies
4. **No isolation** — agents share working directory state, so one agent's half-finished work pollutes another's context

ruah solves this at the git level:

- **Worktree isolation** — each task runs in its own git worktree and branch. Agents are physically separated.
- **File-pattern locking** — `--files "src/auth/**"` locks those paths. A second task claiming overlapping files is rejected before any compute runs.
- **DAG scheduling** — define task dependencies in a markdown file. Independent tasks run in parallel, dependent ones wait. The planner analyzes file overlaps and picks the right execution strategy per stage.
- **Subagent spawning** — a running agent can spawn child tasks that branch from the parent worktree, not from main. Hierarchical merge-back.

**The executor interface is deliberately minimal.** ruah ships 7 adapters (claude-code, aider, codex, open-code, codex-mcp, script, unknown) but the `script` executor is the escape hatch: any command that runs in a shell works. If your workflow is `ollama run codellama | python apply_diff.py`, you can wrap that as a script executor and ruah handles isolation and merging around it.

This was a design decision I'd like feedback on. I could have built a plugin system with hooks and lifecycle events. Instead I went with "the executor is a black box that runs in an isolated worktree, and ruah manages everything outside that box." Simpler, but it means ruah can't do things like stream agent output or retry at the prompt level — only at the task level.

    npx @levi-tc/ruah demo

3 seconds, creates a temp repo, demonstrates isolation and locking, cleans up.

Repo: https://github.com/levi-tc/ruah
Zero runtime deps, MIT, TypeScript, 152 tests.

---

A few questions for people running multi-agent coding setups with local models:

1. **Do you actually run agents in parallel on the same repo today?** Or does the coordination overhead make it not worth it?
2. **What's your executor look like?** Is it Aider pointed at a local endpoint? A custom script? Something else?
3. **Would you want the orchestrator to understand model-specific constraints** (context window size, token budget) or should it stay model-agnostic and let the executor handle that?

---
---

# 6. r/node

Post type: Text post
Best time: Tuesday-Thursday, 14:00-17:00 UTC

## TITLE

I built a zero-dep Node CLI for process orchestration using git worktrees, glob-based file locking, and DAG scheduling

## BODY

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

## FIRST COMMENT

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

---
---

# 7. r/webdev

Post type: Text post
MUST post on: Saturday, April 11, 2026

## TITLE

[Showoff Saturday] I got tired of AI agents stomping on each other's files, so I made a CLI that gives each one its own worktree

## BODY

Like a lot of people here, I've been leaning on AI coding agents more and more — Claude Code, Codex, Aider, whatever fits the task. The workflow that always sounded great was: "just run three agents in parallel on different parts of the codebase."

In practice it was a mess. Agent A touches a shared util while Agent B is reading it. You merge one branch and the other has stale context. You spend more time babysitting merges than you saved by parallelizing.

I kept trying to solve it with conventions — "don't touch files outside your directory" — but agents don't respect conventions reliably. So I built something that makes conflicts structurally impossible instead of just discouraged.

**The core idea:**

Each task gets its own git worktree (a real working copy, not a copy-paste). Before any agent starts, the files it needs are locked at the pattern level. If two tasks claim overlapping files, the second one is rejected at creation time — not at merge time.

```
  agent 1 ──→ worktree A ──→ src/auth/**  locked
  agent 2 ──→ worktree B ──→ src/ui/**    locked
  agent 3 ──→ worktree C ──→ tests/**     locked
```

When tasks finish, they merge back in dependency order. If task C depends on A and B, it waits. A running agent can even spawn subtasks that branch from its own worktree — children merge into the parent first, then the parent merges into main.

**What it looks like in practice:**

```bash
ruah init
ruah task create auth --files "src/auth/**" --executor claude-code --prompt "Add JWT auth"
ruah task create ui   --files "src/ui/**"   --executor aider       --prompt "Build settings page"
ruah task start auth
ruah task start ui
# Both run in parallel. Isolated worktrees. No conflicts.
ruah task done auth && ruah task merge auth
```

Or define a full workflow as a markdown DAG:

```markdown
## Tasks
### backend
- files: src/api/**
- executor: claude-code
- depends: []
### frontend
- files: src/ui/**
- depends: []
### tests
- files: tests/**
- depends: [backend, frontend]
```

`ruah workflow run feature.md` validates the graph (cycles, missing refs, file overlaps), plans execution stages, and runs it.

**The boring details:** TypeScript, zero runtime deps, MIT licensed, 152 tests. Works with Claude Code, Aider, Codex, Cursor, Windsurf, or anything that runs as a CLI.

**3-second interactive demo** (creates a temp repo, shows isolation + locking + DAG scheduling, cleans up):

```bash
npx @levi-tc/ruah demo
```

GitHub: https://github.com/levi-tc/ruah

---

Genuinely curious: for those of you running multiple agents on real projects — what's your current approach? I've been assuming the hard part is file-level isolation, but maybe the actual pain point is something else entirely (context sharing between agents? knowing when an agent is "done"? something I haven't hit yet?).

## FIRST COMMENT

Happy to answer any questions about the architecture. A few things I learned building this:

- Git worktrees turned out to be the perfect primitive for this. Each one is a real working directory with its own branch, but they share the same .git — so they're lightweight and merges use normal git tooling.
- The file locks are advisory, not OS-level. They exist in a JSON state file that ruah checks at task creation. This was a deliberate tradeoff: agents that don't go through ruah can still technically touch locked files, but in practice the coordination boundary is at task creation, not runtime.
- The DAG planner analyzes file patterns for overlap. If two stages have disjoint files, they run in parallel. If there's partial overlap, it can negotiate "modification contracts" where agents agree to limit their scope. If there's full overlap, it serializes.

The thing I'm least confident about is the lock granularity — glob patterns work for most cases, but there are edge cases with generated files and transitive imports that are hard to express as globs.

---
---

# 8. r/ChatGPT

Post type: Comment in weekly self-promotional megathread ONLY

## MEGATHREAD COMMENT

Anyone else running Codex on a real codebase and watching it fight with itself?

I hit a wall where I wanted multiple AI agents working on different parts of the same repo at the same time — auth module, API routes, frontend components. Sounds great in theory. In practice, they step on each other's files, one agent's changes break another's assumptions, and you end up spending more time resolving merge conflicts than you saved.

So I built an open-source tool called **ruah** that prevents this. Each agent gets its own isolated copy of the repo (git worktree), files are locked so two agents can't edit the same thing, and when they finish, everything merges back in the right order automatically.

Works with Codex, Claude Code, Aider, or literally any CLI tool. Not locked to one provider.

**The 3-second demo** (creates a temp repo, shows the isolation in action, cleans up after itself):

    npx @levi-tc/ruah demo

GitHub: https://github.com/levi-tc/ruah

Free, open-source, MIT. Curious if anyone else has run into the "multiple agents, one repo" problem and how you've dealt with it.

---
---

# 9. r/coding

Post type: Text post (technical essay format)
Best time: Weekday, 2-3 days after r/webdev post

## TITLE

Why git worktrees are the right isolation primitive for parallel AI agents (and docker containers aren't)

## BODY

I've been working on a coordination problem that I think is going to become increasingly common: how do you let multiple AI coding agents work on the same repository simultaneously without them destroying each other's changes?

This post is about the design tradeoffs I explored, the decisions I landed on, and where I think the model breaks down. The implementation is open source if you want to look at it, but this post is about the architecture, not the tool.

---

### The problem space

When you run a single AI coding agent on a repo, life is simple. It reads files, makes changes, you review. But the moment you try to parallelize — say, one agent builds the API while another builds the UI — you hit coordination problems that are surprisingly deep:

1. **Write collisions.** Two agents edit the same file. Even if they touch different functions, the merge is non-trivial because each agent's diff is against the original, not against the other's changes.

2. **Stale reads.** Agent B reads a file that Agent A is about to modify. Agent B's output is based on state that no longer exists by the time it finishes.

3. **Merge ordering.** If Agent C depends on the output of Agents A and B, you need to merge A and B first, then let C work against the merged state. Do this manually a few times and you'll stop parallelizing.

4. **Subtask branching.** An agent working on authentication realizes it needs to split the work — one subtask for the API layer, one for the UI layer. Where do those subtasks branch from? Main? The parent's worktree? When do they merge, and into what?

---

### Why git worktrees, not containers

The obvious isolation strategy is containers. Give each agent its own filesystem. But containers solve the wrong problem here.

The issue isn't filesystem isolation — it's *version control isolation*. You need each agent to:

- Have its own branch
- Be able to commit freely without affecting other agents
- Merge back into a known state using standard git tooling
- Share the same repository history (so merges are actual three-way merges, not patch applications)

Git worktrees give you all of this natively. A worktree is a separate working directory that shares the same `.git` directory as the main repo. Each worktree checks out a different branch. They're lightweight (no copying the full repo), and merges use the same conflict resolution you'd use for human branches.

Containers, by contrast, require you to either:
- Mount the same `.git` directory (which creates lock contention on the git index)
- Clone the repo per container (which means merges are between separate repos — harder to reason about, slower to set up)
- Use some overlay filesystem trick (fragile, and you still need to reconcile changes)

Worktrees also have a property that matters for AI agents specifically: they're *cheap to create and destroy*. Creating a worktree for a 15-minute agent task adds maybe 200ms of overhead. Creating a container adds seconds and requires a runtime.

The downside: worktrees don't isolate dependencies. If two agents need different versions of `node_modules`, worktrees won't help. In practice I haven't hit this because AI coding tasks are usually short-lived and work against the same dependency tree. But it's a real limitation.

---

### Why advisory locks, not OS-level locks

The file-locking layer was the second big design decision. When Agent A claims `src/auth/**`, how do you prevent Agent B from touching those files?

I went with advisory locks — a JSON state file that records which file patterns are claimed by which tasks. Before a task starts, the system checks the state file. If there's an overlap, the task is rejected.

This is deliberately weaker than OS-level locks (like `flock` or POSIX advisory locks on the files themselves). Here's why:

**OS-level locks operate at runtime.** An agent would hit a locked file mid-execution, after it's already read surrounding context and formed a plan. What does an AI agent do when it gets `EACCES` on a file it expected to modify? In my testing, they either retry in a loop, hallucinate a workaround, or just crash. None of these are good failure modes.

**Advisory locks operate at planning time.** The conflict is detected before any agent starts. The failure mode is clean: "task creation rejected due to file overlap with task X." A human (or an orchestrator) can decide to adjust the file scope, wait for the other task, or proceed with a modification contract.

The tradeoff is enforcement. An agent running in a worktree *can* technically modify a file outside its declared scope. The lock is a coordination mechanism, not a security boundary. In practice this works because:

1. AI agents generally stay within the files they're told to work on
2. The real value is preventing overlap at the *task definition* level, not at the syscall level
3. If an agent does touch an out-of-scope file, it shows up in the merge diff and governance gates can catch it

---

### DAGs over queues

The third decision: how do you express task dependencies?

A simple queue (run tasks in order) is too conservative — it serializes everything. A simple thread pool (run everything in parallel) is too aggressive — it ignores dependencies.

I landed on DAGs (directed acyclic graphs) defined in markdown files. Each task lists its dependencies. The scheduler topologically sorts the graph, groups independent tasks into parallel stages, and executes stage by stage.

But there's a subtlety. Two tasks in the same stage might have *partially* overlapping file patterns. For example:

```
Task A: src/api/**
Task B: src/api/routes/**, src/ui/**
```

Task B's first pattern is a subset of Task A's pattern. The naive approach (reject overlap) would force these into separate stages. The smarter approach: analyze the overlap and, if the overlapping region is small, allow parallel execution with a "modification contract" — both agents are told which files are shared and that they should not modify the shared subset.

This doesn't always work. Some overlaps are genuine conflicts that need serialization. The planner uses a simple heuristic: if the overlapping files are more than ~30% of either task's scope, serialize. Otherwise, attempt parallel with contracts.

I'm not confident this heuristic is right. It's the area where I'd most appreciate feedback from anyone who's thought about this kind of scheduling problem.

---

### Where the model breaks down

Some known limitations I haven't solved:

**Generated files.** If Task A generates `src/api/types.ts` and Task B needs to import it, the dependency isn't expressible through file patterns alone. You need semantic dependency analysis, which is a much harder problem.

**Transitive imports.** Task A modifies `utils/config.ts`. Task B doesn't claim that file, but imports it three levels deep. The lock model treats this as non-overlapping, but the agent's output might break if the import changes.

**Long-running tasks.** The model assumes tasks are relatively short (minutes, not hours). For longer tasks, the lock contention window grows and the probability of needing to re-plan increases.

**Agent non-determinism.** Two runs of the same task on the same codebase can produce different file modifications. This means the file scope declared at task creation is a *prediction*, not a guarantee. Governance gates at merge time are the safety net, but they're reactive rather than preventive.

---

If you've worked on similar coordination problems — whether in CI/CD, distributed systems, or other multi-agent architectures — I'd be curious how you've approached isolation and scheduling. Specifically:

1. Is file-level locking the right granularity? Or should it be module-level, function-level, or something else?
2. How do you handle the generated-files problem in dependency graphs?
3. For the partial-overlap heuristic — is there prior art in build systems or task schedulers that I should look at?

Implementation (TypeScript, MIT): https://github.com/levi-tc/ruah

## FIRST COMMENT

For anyone who wants to see the worktree isolation in action without reading code, this runs a self-contained demo in a temp directory (creates a repo, spawns tasks, shows the locking and DAG scheduling, then cleans up):

```bash
npx @levi-tc/ruah demo
```

Takes about 3 seconds. But the post above is more about the design decisions than the tool itself — I'm genuinely trying to figure out if the isolation model I chose is the right one, or if there's a better primitive I'm not seeing.

---
---

# 10. r/MachineLearning

Post type: Text post with [P] flair
Best time: Weekday

## TITLE

[P] ruah: multi-agent code generation as a scheduling and isolation problem — worktree-per-task, file locking, DAG execution

## BODY

I've been working on an open-source tool for coordinating multiple AI coding agents on a shared codebase. The core thesis is that **multi-agent code generation is primarily a scheduling and resource isolation problem**, and the coordination layer should be decoupled from the generation layer.

### The problem space

When N agents operate on the same repository concurrently, you get a variant of the readers-writers problem complicated by:

- **Implicit shared state** — the working directory and git index are shared resources that agents don't know they're contending for
- **Coarse-grained conflict detection** — git only detects conflicts at merge time, after compute is already spent
- **No dependency ordering** — when tasks have sequential dependencies (e.g., "write API" before "write tests for API"), there's no mechanism to enforce ordering across independent agent processes
- **Hierarchical task decomposition** — an agent working on a large task may need to spawn subtasks, creating a tree structure that needs ordered merge-back

### Design decisions

**Worktree isolation over branch-only isolation.** Each task gets a dedicated git worktree, not just a branch. This provides filesystem-level isolation — agents cannot observe each other's uncommitted changes. The cost is disk space (one working copy per task), but for typical repos this is negligible.

**Pre-execution file locking over post-execution conflict resolution.** Tasks declare file patterns (globs) at creation time. Overlapping patterns are rejected before any agent starts. This is a conservative strategy — it may over-restrict parallelism (two tasks touching `src/utils.ts` can't run concurrently even if they'd modify different functions) but it eliminates a class of wasted computation.

**When file overlap is unavoidable, modification contracts.** The planner analyzes declared file patterns across tasks in a stage. When overlap exists but tasks still need to run, it generates contracts specifying per-file permissions: owned (exclusive write), shared-append (append only), or read-only. Contracts are written to each task's worktree as `.ruah-task.md` so agents can read them.

**Markdown DAG definition.** Workflows are defined as markdown files with task blocks and dependency declarations. The engine validates the DAG (cycle detection, missing references) before execution and schedules stages topologically. Within a stage, the planner decides per-stage: full parallel, parallel with modification contracts, or serial fallback.

**Black-box executor model.** The orchestrator doesn't understand agent internals — it spawns a process in an isolated worktree with environment variables (`RUAH_TASK`, `RUAH_WORKTREE`, `RUAH_FILES`, `RUAH_ROOT`) and waits for exit. This means ruah can't do prompt-level retry or streaming — only task-level retry. The tradeoff is provider independence: any CLI that can run in a directory works as an executor.

### Current limitations

- **File locking granularity is glob-based.** Two tasks can't share a file even if they'd modify non-overlapping regions. AST-aware locking would be more precise but dramatically more complex.
- **No runtime conflict detection during execution.** Conflicts are only caught at lock time (pre-execution) and merge time (post-execution). An agent that writes outside its declared file scope won't be caught until merge.
- **No cost modeling.** The scheduler doesn't consider token budgets, API rate limits, or model-specific constraints. It treats all executors as equivalent.
- **Modification contracts are advisory.** Agents can violate them. Enforcement would require filesystem-level sandboxing (e.g., FUSE, overlayfs), which adds significant complexity.

### Implementation

TypeScript, zero runtime dependencies, 152 tests. Built on git worktrees and advisory file locks.

Repo: https://github.com/levi-tc/ruah

Demo (3 seconds, self-cleaning):

    npx @levi-tc/ruah demo

### Specific feedback I'm looking for

1. **Is glob-based file locking the right granularity?** The alternative is function/symbol-level locking via tree-sitter or similar, but that couples the orchestrator to language-specific parsers. Is the tradeoff worth it?

2. **How would you benchmark this?** I'm thinking about measuring: (a) wasted compute from conflict-related failures with vs. without isolation, (b) parallelism loss from over-conservative locking, (c) total wall-clock time for multi-task workflows. Are there established benchmarks for multi-agent code generation that would make comparison meaningful?

3. **Modification contracts vs. stricter enforcement.** The current design trusts agents to respect file boundaries. An alternative would be copy-on-write filesystem isolation (overlayfs or similar) that physically prevents out-of-scope writes. Is the complexity justified, or is advisory locking sufficient in practice?

4. **Is the black-box executor model too limiting?** The orchestrator has no visibility into what the agent is doing during execution. A richer interface (progress callbacks, partial results, token usage reporting) would enable better scheduling decisions but would require executor-specific adapters for every agent.
