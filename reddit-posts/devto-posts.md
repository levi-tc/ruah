# ═══════════════════════════════════════════════════════════════
# POST 1 of 4 — Problem Listicle
# Tags: ai, productivity, programming, discuss
# Publish: Monday-Wednesday, 12-2 PM UTC
# ═══════════════════════════════════════════════════════════════

---
title: "5 Ways AI Coding Agents Destroy Each Other's Work (and What I Learned the Hard Way)"
published: false
description: "I ran 3 AI coding agents in parallel on the same repo. Here are the 5 failure modes that made me mass-revert everything."
tags: ai, productivity, programming, discuss
series: "Taming Multi-Agent Chaos"
cover_image: https://placeholder-for-cover-image.dev
---

Last month I had a brilliant idea: run Claude Code on the backend, Aider on the frontend, and Codex on the test suite. All at the same time. Same repo. Ship a feature in 20 minutes instead of 3 hours.

Forty-five minutes later, I was staring at a diff that looked like a git merge ate itself. Three agents, three branches, zero usable code. I `git reset --hard` and went for a walk.

Since then I've been running multi-agent setups almost daily, cataloging every way they blow each other up. Here are the 5 failure modes I keep hitting -- ranked from "annoying" to "soul-crushing."

---

## 1. The Write Collision

**The scenario:** Claude Code is refactoring `src/api/routes.ts` to add authentication middleware. Meanwhile, Aider is adding a new `/dashboard` endpoint to... `src/api/routes.ts`. Both agents finish. Both commit. You merge the first branch cleanly. The second branch? 47-line merge conflict right through the middleware chain.

**Why it happens:** AI agents have no concept of "someone else is editing this file right now." They each see the same snapshot, make independent changes, and assume they own the file. There's no lock, no mutex, no advisory warning. Two humans would at least yell across the room.

**The aha moment:** This isn't a rare edge case. It's the *default* outcome. If you have N agents and M files, the probability of collision scales fast -- and it's the most-edited files (the ones agents are most drawn to) that collide the most. Your `index.ts`, your `App.tsx`, your `routes.ts` -- those are magnets.

---

## 2. The Stale Read

**The scenario:** You ask Agent A to refactor the `User` interface in `src/types.ts` -- renaming `userName` to `displayName` and adding an `avatarUrl` field. Agent B is building a profile page that imports `User` from that same file. Agent B reads the *old* `User` interface, writes a beautiful component referencing `userName`, and commits. Agent A merges first. Agent B's entire component is now referencing a field that doesn't exist.

**Why it happens:** Each agent works against a point-in-time snapshot. Agent B doesn't know that the type it's importing is about to change out from under it. There's no file-system-level notification. There's no "hey, someone has pending changes to this module" warning. Agent B isn't negligent -- it's just blind.

**The aha moment:** Stale reads are worse than write collisions because they pass merge cleanly. Git doesn't flag them. The merge succeeds, CI turns green on the merge commit, and then your app crashes at runtime because `user.userName` is `undefined`. You don't catch it until someone actually runs the code -- or worse, your users catch it.

---

## 3. The Merge Ordering Disaster

**The scenario:** You have three tasks: `backend` (builds an API), `frontend` (builds the UI that calls the API), and `tests` (writes integration tests for both). The tasks finish in order: tests, frontend, backend. Your eager junior-dev brain says "merge them as they finish." So you merge `tests` first. But `tests` imports functions from `backend` that don't exist on `main` yet. Broken.

Okay, back up. Merge `backend` first, then `frontend`, then `tests`. But wait -- `frontend` references a component structure that `tests` depends on. You needed `frontend` before `tests` too. And now you've lost track of which branch was based on what.

**Why it happens:** Multi-agent work naturally creates dependency graphs, but nothing enforces them. Each task is technically independent -- separate branch, separate worktree -- but the *code* has dependencies. `tests` depends on `backend`. The API client in `frontend` depends on the response shape from `backend`. When you ignore these edges, merge order becomes a minefield.

**The aha moment:** The correct merge order is a topological sort of the task dependency DAG. If you don't have that DAG written down somewhere, you're doing it in your head. And you will get it wrong at 11 PM when three agents finish within seconds of each other.

---

## 4. The Subtask Branching Trap

**The scenario:** Agent A is working on `auth` on its own branch off `main`. Halfway through, it realizes it needs a helper module, so you spin up Agent B to write `src/auth/helpers.ts` as a subtask. Question: should Agent B branch from `main` or from Agent A's in-progress `auth` branch?

If it branches from `main`, it doesn't have Agent A's half-finished auth code, so it has no context for the helper functions it's supposed to write. If it branches from `auth`, it gets Agent A's work-in-progress -- including uncommitted experiments and dead code.

You branch from `auth`. Agent B writes the helpers. Agent B finishes first. Where does it merge? If it merges to `main`, Agent A's branch now has a diverged history. If it merges back to `auth`, great -- but now `auth` has two independent agents' commits interleaved, and good luck reviewing that pull request.

**Why it happens:** Git's branching model is designed for humans who communicate. "I'll branch from your feature branch, and I'll merge back into it when I'm done" is a social contract. AI agents don't have social contracts. They don't know who their parent is, where they branched from, or where they should merge back to. That context lives entirely in your head.

**The aha moment:** Every subtask needs a formal parent relationship: branch from parent, merge to parent, and block the parent's merge until all children are resolved. Without this, subtask graphs become unrecoverable spaghetti within about 15 minutes.

---

## 5. The "Works in Isolation, Breaks on Merge" Trap

**The scenario:** All three agents finish their work. Each branch passes its own tests. Each diff looks clean and well-structured. You're feeling great.

You merge `backend`. Green. You merge `frontend`. Conflict in `package.json` (both agents added dependencies). You fix it, merge. You merge `tests`. Now `tests/integration/api.test.ts` imports from `src/api/client.ts`, but `frontend` refactored that file and `tests` was branched before the refactor. TypeScript throws 14 errors. None of the tests run.

You spend 30 minutes manually reconciling three agents' work. The "time saved" is negative.

**Why it happens:** Each agent operates in a hermetically sealed environment. That's the *point* -- isolation prevents interference while they're working. But isolation also means no agent validates against the combined state of all other agents' changes. Every branch is correct in its own universe. The merge *creates* a new universe nobody tested.

**The aha moment:** Integration isn't a step you do at the end. It's a constraint you need to enforce throughout. The merge order matters. The dependency graph matters. And ideally, you'd run validation against the combined state before you commit to the final merge.

---

## So... Now What?

If you've run more than one AI agent at a time, you've probably hit at least three of these. They aren't bugs in the agents -- they're emergent properties of parallel work on a shared codebase, the same problems that made concurrent programming hard in the '90s, just wearing a trenchcoat and pretending to be a dev tooling problem.

After about the fifth time I mass-reverted a multi-agent session, I started building a small orchestrator to manage the coordination layer -- worktree isolation, file locking, dependency-aware merge ordering, parent-child task relationships. It's called [ruah](https://github.com/levi-tc/ruah), it's open source, and I'll dig into the architecture in the next post in this series.

**But I'm curious about your experience first:** Have you tried running multiple AI agents on the same repo? Which of these failure modes hit you the hardest? Or did you find one I missed? Drop it in the comments -- I'm collecting war stories.




# ═══════════════════════════════════════════════════════════════
# POST 2 of 4 — #showdev Showcase
# Tags: showdev, opensource, ai, cli
# Publish: 5-7 days after Post 1
# ═══════════════════════════════════════════════════════════════

---
title: "I Built a Traffic Controller for AI Coding Agents"
published: false
description: "After mass-reverting one too many multi-agent sessions, I built a CLI that gives each AI agent its own worktree, locks files, and merges in dependency order. Here's what it looks like."
tags: showdev, opensource, ai, cli
series: "Taming Multi-Agent Chaos"
cover_image: https://placeholder-for-cover-image.dev
---

In the [first post of this series](https://dev.to/levi/5-ways-ai-coding-agents-destroy-each-others-work-LINK), I cataloged the five ways AI agents trash each other's work when you run them in parallel. Write collisions, stale reads, merge ordering disasters, subtask spaghetti, and the classic "works in isolation, breaks on merge" trap.

I kept hitting those problems. Kept reverting. Kept losing time. So I did what any reasonable developer does -- I spent way more time building a tool than I would have lost to the original problem.

This is that tool. It's called **ruah**.

## The Core Insight

The moment things clicked was when I stopped thinking about this as a "git problem" and started thinking about it as a concurrency problem. Multiple agents writing to shared state. That's a textbook race condition.

And what's the textbook solution to race conditions? Isolation and synchronization.

Git already has a primitive for isolation: **worktrees**. A git worktree is a second (or third, or fourth) working copy of your repo, sharing the same `.git` directory but with its own branch and working tree. Agents working in separate worktrees literally cannot see each other's uncommitted changes. The filesystem enforces it.

So the architecture fell out naturally:

```
  agent 1 ──→ worktree A ──→ src/auth/**  🔒
  agent 2 ──→ worktree B ──→ src/ui/**    🔒  ← no conflicts, ever
  agent 3 ──→ worktree C ──→ tests/**     🔒
```

Each agent gets its own worktree. Each worktree has file locks declaring which paths that agent owns. Overlapping locks are rejected at task creation time -- before any agent writes a single line. And when tasks finish, they merge back in dependency order, not first-come-first-served.

That's the whole idea. The rest is plumbing.

## What It Looks Like in Practice

You initialize ruah in any git repo:

```bash
npx @levi-tc/ruah init
```

Then create tasks. Each task gets a name, a set of file patterns to lock, an executor (which agent to run), and a prompt:

```bash
ruah task create auth \
  --files "src/auth/**" \
  --executor claude-code \
  --prompt "Add JWT authentication with refresh tokens"

ruah task create dashboard \
  --files "src/ui/**" \
  --executor aider \
  --prompt "Build the admin dashboard"

ruah task create tests \
  --files "tests/**" \
  --executor codex \
  --prompt "Write integration tests for auth and dashboard"
```

If you tried to create a second task that also locks `src/auth/**`, ruah rejects it immediately:

```bash
ruah task create login --files "src/auth/**"
# ✗ conflict: src/auth/** is locked by task "auth"
```

No agent ever starts. No code is ever written. The conflict is caught before anything happens.

Start your tasks and each agent launches in its own isolated worktree:

```bash
ruah task start auth
ruah task start dashboard
# Both running in parallel, separate worktrees, zero interference
```

When they finish, mark them done and merge:

```bash
ruah task done auth && ruah task merge auth
ruah task done dashboard && ruah task merge dashboard
```

That's the basic loop. Create, lock, start, done, merge.

## The DAG: Workflows as Markdown

For anything beyond two or three tasks, you want to define the dependency graph up front. ruah uses plain markdown files for this:

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
- executor: aider
- depends: []
- prompt: |
    Build the frontend components.

### tests
- files: tests/**
- executor: codex
- depends: [backend, frontend]
- prompt: |
    Write integration tests for both layers.
```

The `depends` field creates a directed acyclic graph. `backend` and `frontend` have no dependencies, so they run in parallel. `tests` depends on both, so it waits until both are merged before it starts. ruah validates the DAG before execution -- cycle detection, missing references, file overlap analysis.

Run it with one command:

```bash
ruah workflow run .ruah/workflows/new-feature.md
```

The smart planner analyzes file patterns across tasks in each stage and decides the execution strategy automatically: full parallel when there's zero overlap, parallel with modification contracts when there's partial overlap (owned files vs. shared-append vs. read-only), or serial when the risk is too high. You don't configure this. It just figures it out.

## Subagent Spawning

This is the feature I didn't plan but couldn't live without. Sometimes an agent realizes mid-task that it needs to split off a piece of work. ruah supports parent-child task relationships:

```bash
# Inside a running agent's session:
ruah task create auth-api --parent auth --files "src/auth/api/**" --executor codex
ruah task create auth-ui  --parent auth --files "src/auth/ui/**"  --executor aider
```

Children branch from the parent's worktree -- not from main -- so they see the parent's in-progress work. Children merge back into the parent first. And the parent's own merge to main is blocked until all children are resolved. No orphan branches. No merge spaghetti.

## Try It Right Now

This takes 3 seconds:

```bash
npx @levi-tc/ruah demo
```

It creates a temporary repo, demonstrates worktree isolation, file locking, conflict detection, and DAG scheduling, then cleans up after itself. No install. No config. No leftover artifacts.

## What Surprised Me

I built ruah to solve merge conflicts. The surprise benefit was **context switching**.

When each agent has its own worktree with locked file boundaries, I stopped context-switching between agents mentally. I didn't have to remember "wait, is the auth agent done? Did it touch the types file? Do I need to check before starting the frontend agent?" The tool tracks all of that. `ruah status` tells me exactly what's running, what's done, what's locked, and what can merge.

That turns out to be a bigger productivity win than avoiding conflicts. The conflicts were costing me maybe 15 minutes per session. The mental overhead of coordinating agents in my head was costing me an hour.

## Current State

ruah is early but functional. Here's where it stands:

- **Version:** 0.3.5
- **Tests:** 152 passing
- **Runtime dependencies:** zero
- **License:** MIT
- **Language:** TypeScript
- **Executor adapters:** claude-code, aider, codex, open-code, codex-mcp, script, and any unknown CLI as fallback

It works with Claude Code, Aider, Codex, Cursor, Windsurf -- anything that has a CLI. The executor adapter system is dead simple: if ruah doesn't recognize the name, it runs it as a shell command. You're not locked in.

Seven built-in adapters handle the common agents. Each one knows how to pass prompts, handle flags, and ensure the agent commits its work before exiting (which is critical -- uncommitted changes vanish when the worktree is cleaned up).

## What I'm Not Claiming

This isn't a finished product. There's no GUI. The error messages could be better. The documentation is sparse. I'm still finding edge cases in merge ordering with deeply nested subtask trees.

But it works. I use it daily. And every time I run three agents in parallel without a single revert, it feels like a small miracle compared to where I started.

## Try It, Break It, Tell Me About It

```bash
# 3-second demo
npx @levi-tc/ruah demo

# Install globally
npm install -g @levi-tc/ruah

# GitHub
# https://github.com/levi-tc/ruah
```

If you run the demo and something breaks, open an issue. If you try it on a real project and hit an edge case, open an issue. If you have opinions about how DAG workflows should work, I want to hear them.

Stars are appreciated -- not because I'm chasing metrics, but because it helps me gauge whether this is solving a real problem for people beyond me.

Next post in the series: I'll break down the internals -- how the worktree lifecycle works, how the smart planner decides between parallel and serial execution, and why I ended up with zero runtime dependencies (spoiler: it wasn't on purpose).

{% github levi-tc/ruah %}




# ═══════════════════════════════════════════════════════════════
# POST 3 of 4 — Architecture Deep-Dive
# Tags: ai, programming, opensource, productivity
# Publish: 5-7 days after Post 2
# ═══════════════════════════════════════════════════════════════

---
title: "Why Git Worktrees Beat Docker for Isolating AI Agents"
published: false
description: "Docker solves the wrong isolation problem for AI coding agents. Git worktrees give you branch-level isolation with zero overhead and native merge tooling. Here's the architecture behind scheduling parallel agents without them destroying each other's work."
tags: ai, programming, opensource, productivity
series: "Taming Multi-Agent Chaos"
cover_image: https://placeholder-for-cover-image.dev
---

When you first try to run multiple AI coding agents in parallel, the isolation question hits you immediately: how do you keep Agent A from trampling Agent B's changes? The instinct -- especially if you've done any infrastructure work -- is to reach for containers. Give each agent its own Docker image, its own filesystem, problem solved.

I went down that road. It's the wrong road. Here's why, and what actually works.

*This is Part 3 of a series on multi-agent orchestration. [Part 1](https://dev.to/series/taming-multi-agent-chaos) covered the five failure modes that happen when agents collide. [Part 2](https://dev.to/series/taming-multi-agent-chaos) introduced the orchestrator. This post digs into the architecture decisions -- the primitives, the tradeoffs, the things that break. Everything here applies whether you use [ruah](https://github.com/levi-tc/ruah) or build your own orchestrator.*

---

## The Isolation Problem

When two AI agents work on the same codebase simultaneously, they need three things:

1. **Their own working directory** -- so `git status`, file writes, and builds don't interfere
2. **Their own branch** -- so commits don't collide
3. **A path back to integration** -- so their work can be merged when they're done

That's it. You don't need network isolation. You don't need process namespaces. You don't need a container runtime. You need *version control isolation*, not *filesystem isolation*.

This distinction matters because it determines your entire architecture.

---

## Option 1: Docker Containers (The Wrong Primitive)

The Docker approach looks like this: spin up a container per agent, mount or copy the repo in, let the agent work, extract the result.

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Container A     │  │  Container B     │  │  Container C     │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │ repo copy │  │  │  │ repo copy │  │  │  │ repo copy │  │
│  │ .git/     │  │  │  │ .git/     │  │  │  │ .git/     │  │
│  │ node_mods │  │  │  │ node_mods │  │  │  │ node_mods │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         ↓                    ↓                    ↓
    git format-patch → apply to host → pray for no conflicts
```

Three problems kill this approach:

**1. You're cloning the wrong thing.** Each container gets a full copy of the repository, including the `.git` directory (hundreds of megabytes for non-trivial repos), `node_modules`, build caches -- everything. For a mid-size project, that's 2-3 GB per agent, eating disk and adding 30-60 seconds of startup time. And you're paying this cost for *isolation you don't need*. The agents don't need separate copies of the git object store. They need separate working trees.

**2. Git index lock contention.** If you try to share a `.git` directory via a bind mount (to avoid the duplication), you'll hit `.git/index.lock` contention the moment two agents run any git command simultaneously. Git's index is process-exclusive. Two agents running `git add` against the same index will fail with `fatal: Unable to create '.git/index.lock': File exists`. Container networking and PID isolation don't help -- the lock is on the filesystem.

**3. The merge path is painful.** Getting changes out of a container and back into your host repo means `git format-patch` / `git am`, or committing inside the container and pushing to a remote, or bind-mounting and dealing with the index lock problem above. Each of these adds complexity that has nothing to do with the actual problem (coordinating parallel edits) and everything to do with working around the container abstraction.

Docker solves: "I need this process to run in an isolated environment with specific dependencies." That's great for CI, for reproducible builds, for deploying services. It's overkill for "I need two branches to be checked out at the same time."

---

## Option 2: Git Worktrees (The Right Primitive)

Git has a built-in answer to "I need multiple branches checked out simultaneously," and it's been stable since Git 2.5 (2015): **worktrees**.

```
your-repo/                        ← main worktree (main branch)
├── .git/                         ← shared object store
├── src/
└── .ruah/worktrees/
    ├── auth/                     ← worktree (ruah/auth branch)
    │   └── src/
    ├── dashboard/                ← worktree (ruah/dashboard branch)
    │   └── src/
    └── tests/                    ← worktree (ruah/tests branch)
        └── src/
```

`git worktree add` creates a new working directory linked to the same `.git` store. Each worktree has its own branch, its own index, its own `HEAD`. But they all share the same object database -- commits, blobs, trees, refs.

**Why this is the right primitive:**

- **Creation is near-instant.** `git worktree add -b ruah/auth .ruah/worktrees/auth main` takes roughly 100ms, regardless of repo size. No copying. No cloning. The worktree is a new checkout, not a new repository.

- **Each worktree has its own index.** No `.git/index.lock` contention. Agent A can `git add` and `git commit` in its worktree while Agent B does the same in its own. They're writing to different index files.

- **Native merge tooling.** When an agent finishes, its work is already on a proper git branch. Merging is `git merge ruah/auth` -- standard three-way merge with conflict detection, `--no-ff` for clean history, and all the tooling you already know. No patch extraction, no remote pushing, no container networking.

- **Cheap cleanup.** `git worktree remove` and `git branch -D` cleans everything up. No zombie containers, no dangling volumes.

- **Shared object store = efficient.** Five worktrees share one `.git` directory. The disk overhead per worktree is just the working tree files (your source code, without `node_modules` if you `.gitignore` it properly).

The key insight: **worktrees solve the actual problem** (parallel branch checkouts) without solving problems you don't have (process isolation, network namespacing, filesystem sandboxing).

---

## The Locking Layer: Why Advisory, Why at Planning Time

Worktrees give you isolation at the *git* level, but they don't prevent two agents from editing the same file on different branches -- which just delays the collision to merge time. You need a locking layer.

The obvious implementation: OS-level file locks. `flock()` on Linux, `fcntl` advisory locks, or Windows `LockFile`. The agent opens a file, acquires a lock, does its work.

**This is a terrible idea for AI agents.** Here's why:

AI agents are black boxes. They spawn subprocesses. They crash mid-operation. They hallucinate commands that don't exist. When a human's editor acquires a file lock and the human's laptop dies, someone can walk over and reboot the laptop. When an AI agent's subprocess acquires an OS lock and the agent crashes, you get orphaned locks that block every other agent until someone manually intervenes.

Worse: most AI coding agents are not designed to handle `EACCES` or `EAGAIN` errors gracefully. If Claude Code tries to write to a file and gets a permission error from an OS lock, it doesn't back off and try a different approach. It either retries the same operation (sometimes infinitely) or gives up on the entire task. The error message is opaque -- the agent doesn't understand *why* the file is locked or what it should do about it.

**The alternative: advisory locks at planning time, not runtime.**

Before any agent starts working, you declare the file scope of each task:

```
Task: auth
  Files: src/auth/**, src/middleware/auth.ts

Task: dashboard
  Files: src/pages/dashboard/**, src/components/Dashboard.tsx
```

The orchestrator checks these declarations for overlaps *before spawning any agent*. If `auth` and `dashboard` both claim `src/shared/types.ts`, you find out immediately -- not 10 minutes into execution when one agent tries to write and gets a cryptic error.

```
┌─────────────────────────────────────────────────┐
│              PLANNING TIME                       │
│                                                  │
│  Task A claims: src/auth/**                      │
│  Task B claims: src/pages/**                     │
│  Task C claims: src/auth/helpers.ts  ← CONFLICT  │
│                                                  │
│  Result: Reject Task C before any agent runs     │
└─────────────────────────────────────────────────┘
```

The locks are stored as JSON -- a map of task names to file glob patterns:

```json
{
  "locks": {
    "auth": ["src/auth/**", "src/middleware/auth.ts"],
    "dashboard": ["src/pages/dashboard/**", "src/components/Dashboard.tsx"]
  }
}
```

Pattern overlap detection uses prefix matching and glob expansion: `src/auth/**` overlaps with `src/auth/helpers.ts`, `src/**` overlaps with everything under `src/`. This is deterministic, instant, and doesn't require the agent to be running.

**The tradeoff:** advisory locks depend on accurate file declarations. If an agent edits a file it didn't declare, nothing stops it at runtime. You catch this at merge time (the merge will conflict with whatever task actually owns that file). This is acceptable because the alternative -- runtime locks that agents can't handle -- is worse.

---

## The Scheduling Layer: DAGs, Not Queues or Thread Pools

Once you have isolation (worktrees) and ownership (advisory locks), you need to decide *when* to run each agent. Three common approaches:

**Queues (too conservative).** Run one agent at a time. Correct, but you've eliminated all parallelism. If you have five independent tasks, you're paying 5x the wall-clock time for zero benefit. You might as well not have an orchestrator.

**Thread pools (too aggressive).** Run all agents simultaneously. Fast, but you've deferred all coordination to merge time. This works only when tasks are perfectly independent -- no shared files, no dependency ordering, no shared interfaces. In practice, this is rarely true.

**DAGs (the right tradeoff).** Model task dependencies as a directed acyclic graph. Tasks with no dependencies run in parallel. Tasks that depend on others wait. Within each parallel stage, check for file overlaps.

```
         ┌──────────┐
         │  models   │     Stage 1: Independent, run in parallel
         └────┬─────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│ auth  │ │ dash  │ │ api   │  Stage 2: All depend on models
└───┬───┘ └───┬───┘ └───┬───┘
    │         │         │
    └─────────┼─────────┘
              ▼
         ┌──────────┐
         │  tests   │     Stage 3: Depends on auth + dash + api
         └──────────┘
```

The DAG comes from a markdown workflow file. You declare `depends: [models]` on each stage-2 task, and `depends: [auth, dash, api]` on the test task. The orchestrator does a topological sort to extract execution stages, then validates: cycle detection (DFS with a recursion stack), missing dependency checks, and file overlap analysis per stage.

The interesting decision happens within a parallel stage. Three agents ready to run simultaneously, some with overlapping file patterns. What do you do?

**The planner analyzes pairwise overlap** for every task pair in a stage. For each pair, it computes two metrics:

- **Overlap ratio**: number of colliding patterns / total unique patterns across both tasks. This tells you how entangled the tasks are.
- **Risk score**: sum of per-file risk weights for each overlapping pattern, where larger existing files score higher (a 2,000-line file is harder to merge than a 50-line one). This tells you how expensive a conflict would be.

Then it picks a strategy:

- **No overlaps** → full parallel. Every task runs simultaneously, no coordination needed.
- **Low overlap + low risk** (ratio under 0.3, risk under 2.0) → parallel with modification contracts. Tasks run simultaneously, but each gets a contract specifying file access modes.
- **High overlap or high risk** → serial. Tasks run one at a time within the stage, ordered by connectivity (most-overlapping first, so later tasks work against a more integrated baseline).

### Modification Contracts: The Middle Ground

The modification contract is the nuanced middle ground that makes multi-agent work practical for real codebases. Two agents both need to touch `src/routes/index.ts`? The primary task (the one with more total file scope) gets ownership. The secondary task gets append-only access.

Each contract assigns every relevant file one of three access modes:

```
## Modification Contract for task: dashboard

### Owned Files (modify freely)
- src/pages/dashboard/**
- src/components/Dashboard.tsx

### Shared Files (append-only -- add new code, do NOT modify existing lines)
- src/routes/index.ts

### Read-Only Files (do not modify)
- src/auth/**
```

This works because most multi-agent file conflicts are additive: both agents want to add a route to a barrel file, add a type to a definitions file, add an export to an index. Append-only constraints let them do that without collision. Agent A restructures the existing routes. Agent B appends a new `app.get('/dashboard', ...)` at the bottom. Both changes merge cleanly.

The contract is written into a `.ruah-task.md` file in the agent's worktree -- part of the prompt context the agent sees when it starts. It's a prompt-level constraint, not a filesystem-level one. The agent *could* violate it. In practice, AI agents follow clear, immediate instructions reliably. The instruction "do NOT modify existing lines in this file, only append" is unambiguous enough that they comply.

---

## The State Machine and Atomic Writes

Every task moves through a state machine:

```
created → in-progress → done → merged
              │            │
              ├→ failed     ├→ (blocked by children)
              └→ cancelled  └→ cancelled
```

The entire orchestrator state -- tasks, locks, history -- lives in a single JSON file (`.ruah/state.json`). Updates use atomic writes: serialize to a temp file with a random suffix, then `rename()` over the original. On POSIX systems, `rename()` is atomic -- readers either see the old state or the new state, never a partial write. This matters because agents crash. If an agent dies mid-execution and the orchestrator process restarts, it reads a consistent state file and can figure out what happened.

```typescript
const tmp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf-8");
renameSync(tmp, file);
```

The executor itself is deliberately simple: spawn a child process with the agent command, set `cwd` to the worktree, inject environment variables (`RUAH_TASK`, `RUAH_WORKTREE`, `RUAH_FILES`), and wait for exit. Exit code 0 means success. Anything else means failure. The orchestrator doesn't parse the agent's output. It doesn't try to understand what the agent did. It just checks: did you commit something, and did you exit cleanly? This black-box model means any CLI tool works as an executor -- purpose-built AI agents, shell scripts, `make`, whatever.

A safety net catches the common failure mode where agents forget to commit: after the child process exits, the orchestrator checks for uncommitted changes in the worktree and auto-commits them. Without this, work vanishes when the worktree is cleaned up.

---

## Where This Breaks Down

No architecture is without failure modes. Here are the honest ones:

**Generated files.** If Task A generates a `package-lock.json` or runs a code generator that writes to `prisma/migrations/`, and Task B triggers the same generator, the merge will conflict even if the source code doesn't overlap. Generated files don't respect lock boundaries because the generation tool doesn't know about them. The pragmatic fix: exclude generated files from lock scopes and regenerate after merge.

**Transitive imports.** Task A refactors a shared utility function's signature. Task B imports that utility. The lock system sees no overlap -- Task A owns `src/utils/format.ts`, Task B owns `src/pages/billing.ts`. But Task B's code won't compile after Task A's merge because the import contract has changed. Advisory file locks are *syntactic*, not *semantic*. They model file ownership, not the dependency graph of your import tree. You catch this when the post-merge build fails, not at planning time.

**Agent non-determinism.** An agent told to "add authentication to the API routes" might touch 3 files or 30. The file scope declared at planning time is a prediction, not a guarantee. If the agent wanders outside its declared scope, the lock system won't stop it -- the contract is in the prompt, not the filesystem. The merge might still succeed (if nobody else touched those files), or it might conflict. You mitigate this with tight prompts and pre-merge diff review, but you can't eliminate it entirely.

**Scale limits.** Git worktrees share the object store, but each worktree is a full checkout of the source tree. Ten worktrees on a monorepo with 50,000 files means 10 full working copies on disk. For most projects (source code is small; `node_modules` is gitignored) this is fine. For monorepos at serious scale, measure disk and inode usage before committing to this approach.

---

## The Full Picture

These three layers -- worktree isolation, advisory file locks, DAG scheduling with modification contracts -- compose into a system where the orchestrator's job is straightforward:

```
 Workflow.md                          State Machine
 ┌──────────┐     parse      ┌──────────────────────┐
 │ tasks     │──────────────→ │ validate DAG         │
 │ deps      │                │ topo-sort → stages   │
 │ files     │                │ analyze overlaps     │
 │ prompts   │                │ pick strategy/stage  │
 └──────────┘                └──────────┬───────────┘
                                        │
                              ┌─────────▼──────────┐
                              │ Per stage:          │
                              │  create worktrees   │
                              │  acquire locks      │
                              │  spawn agents       │
                              │  wait for exit      │
                              │  merge in dep order │
                              │  cleanup + release  │
                              └─────────────────────┘
```

The whole thing is about 2K lines of TypeScript with zero runtime dependencies. I built it as an open-source CLI called [ruah](https://github.com/levi-tc/ruah) (`npm install -g @levi-tc/ruah`). But the patterns here -- worktrees over containers, advisory locks over OS locks, DAGs with per-stage strategy selection over flat scheduling, prompt-level contracts over filesystem-level enforcement -- are general. They apply to any multi-agent orchestration system you build.

The primitives are already in git. The scheduling is a topological sort. The contracts are structured prompts. None of this requires a novel algorithm or a new infrastructure dependency. It requires choosing the right abstraction for the problem: *version control isolation*, not *process isolation*.

---

**In the next post,** I'll walk through a real workflow from markdown definition to merged result -- the practical "here's exactly how to use this on a real project" piece.

If you want to poke at the internals: `npx @levi-tc/ruah demo` runs a self-contained demo in about 3 seconds. The [source is on GitHub](https://github.com/levi-tc/ruah) -- read `src/core/planner.ts` for the overlap analysis and contract generation, `src/core/workflow.ts` for the DAG parser and topological sort, and `src/core/state.ts` for the lock system.

What isolation strategy have you tried for parallel agents? Containers, worktrees, separate clones, or just merge-and-pray? I'd love to hear what worked -- and what didn't.




# ═══════════════════════════════════════════════════════════════
# POST 4 of 4 — Step-by-Step Tutorial
# Tags: tutorial, ai, cli, productivity
# Publish: 5-7 days after Post 3
# ═══════════════════════════════════════════════════════════════

---
title: "Run 3 AI Agents in Parallel Without a Single Merge Conflict"
published: false
description: "A step-by-step tutorial: split a real feature across three AI coding agents, run them simultaneously in isolated worktrees, and merge everything back cleanly."
tags: tutorial, ai, cli, productivity
series: "Taming Multi-Agent Chaos"
cover_image: [placeholder]
---

You have three AI coding agents. You want them to work on the same codebase at the same time. You do not want to spend your evening resolving merge conflicts.

This tutorial walks you through exactly that. By the end, you will have split a feature across three agents -- auth backend, dashboard UI, and integration tests -- run them in parallel, and merged everything back to main without a single conflict.

Total time: about 10 minutes. Total git knowledge required: `git init`.

## What you'll build

We are going to implement a user authentication feature for a Node.js project. The work breaks down into three pieces:

1. **auth** -- Backend authentication logic (routes, middleware, JWT handling)
2. **ui** -- Dashboard frontend (login page, session display, protected routes)
3. **tests** -- Integration tests that verify auth and UI work together

The auth and UI tasks have zero file overlap, so they run simultaneously. The tests task depends on both finishing first. This is a DAG (directed acyclic graph), and ruah handles it for you.

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **Git** (any recent version)
- A git repository to work in (even an empty one)

That is it. No Docker, no cloud accounts, no YAML files.

## Step 1: Install and initialize

Install ruah globally:

```bash
npm install -g @levi-tc/ruah
```

Navigate to your git repo and initialize ruah:

```bash
cd my-project
ruah init
```

Expected output:

```
✓ Initialized ruah in /home/you/my-project
  State: .ruah/state.json
  Base branch: main
```

**What just happened?** ruah created a `.ruah/` directory with a `state.json` file. This tracks your tasks, file locks, and history. It sits alongside your code and you can `.gitignore` it or commit it -- your choice.

## Step 2: Create the tasks

Now we define the three tasks. Each gets a name, a file pattern (which files it owns), an executor (which AI agent runs it), and a prompt.

```bash
ruah task create auth \
  --files "src/auth/**" \
  --executor claude-code \
  --prompt "Implement JWT authentication: login route, auth middleware, and token refresh endpoint. Use Express.js patterns."
```

```
✓ Task "auth" created
  Branch: ruah/auth
  Worktree: .ruah/worktrees/auth
  Locked: src/auth/**
  Executor: claude-code
```

```bash
ruah task create ui \
  --files "src/dashboard/**" \
  --executor claude-code \
  --prompt "Build a dashboard login page and protected dashboard view. Use React components. Call /api/auth/login for authentication."
```

```
✓ Task "ui" created
  Branch: ruah/ui
  Worktree: .ruah/worktrees/ui
  Locked: src/dashboard/**
  Executor: claude-code
```

```bash
ruah task create tests \
  --files "test/**" \
  --executor claude-code \
  --prompt "Write integration tests for the auth backend and dashboard UI. Test login flow end-to-end, token refresh, and protected route access."
```

```
✓ Task "tests" created
  Branch: ruah/tests
  Worktree: .ruah/worktrees/tests
  Locked: test/**
  Executor: claude-code
```

**What just happened?** Each `task create` did three things:

1. Created a **git worktree** -- a separate working copy of your repo on its own branch. The agents will not step on each other's files.
2. Acquired **file locks** -- `src/auth/**` is locked to the auth task. If another task tried to claim those files, ruah would block it.
3. Registered the task in `state.json` with status `created`.

## Step 3: Start the parallel tasks

Start auth and UI at the same time. Open two terminal tabs (or use `&`):

```bash
ruah task start auth &
ruah task start ui &
```

Each command launches the executor (in this case, Claude Code) inside the task's isolated worktree. The auth agent sees only `src/auth/**`. The UI agent sees only `src/dashboard/**`. They cannot interfere with each other.

Do **not** start the tests task yet -- it depends on auth and UI being done first.

**What just happened?** ruah changed each task's status from `created` to `in-progress`, recorded the start time, and handed the prompt to the executor. The executor runs in the worktree directory, so all file operations are scoped to that branch.

## Step 4: Check status

While the agents are working, check on them:

```bash
ruah task list
```

```
Tasks:
  ◐ auth        in-progress  [src/auth/**]        claude-code
  ◐ ui          in-progress  [src/dashboard/**]    claude-code
  ○ tests       created      [test/**]             claude-code

File locks:
  src/auth/**       → auth
  src/dashboard/**  → ui
  test/**           → tests
```

For a higher-level view:

```bash
ruah status
```

```
ruah — my-project
  Base: main
  Tasks: 3 (2 in-progress, 1 created)
  Locks: 3 patterns across 3 tasks
```

**What just happened?** `task list` shows every task with its status icon (`○` created, `◐` in-progress, `●` done, `✓` merged). The file locks section confirms no overlaps. `status` gives you the bird's-eye view.

## Step 5: Complete and merge

Once auth finishes, mark it done and merge:

```bash
ruah task done auth
```

```
Changes:
  src/auth/login.ts      | 47 ++++
  src/auth/middleware.ts  | 32 ++++
  src/auth/refresh.ts    | 28 ++++
✓ Task "auth" marked as done
```

```bash
ruah task merge auth
```

```
✓ Task "auth" merged into main
```

Repeat for UI:

```bash
ruah task done ui && ruah task merge ui
```

```
✓ Task "ui" marked as done
✓ Task "ui" merged into main
```

Now main has both auth and UI changes. Start the tests task:

```bash
ruah task start tests
```

The tests agent runs against the fully merged codebase -- it can see both the auth routes and the dashboard components. When it finishes:

```bash
ruah task done tests && ruah task merge tests
```

```
✓ Task "tests" marked as done
✓ Task "tests" merged into main
```

**What just happened?** Each `merge` did a git merge from the task's branch into main, then cleaned up the worktree and released the file locks. Because auth and UI touched completely different files, there were zero conflicts. The tests task was created after both merged, so it built on top of the complete codebase.

## Bonus: Do it all with a workflow file

Typing three `task create` commands is fine for a one-off. For repeatable work, define a workflow in markdown:

Create a file called `feature-auth.md`:

```markdown
# Workflow: feature-auth

## Config
- base: main
- parallel: true

## Tasks

### auth
- files: src/auth/**
- executor: claude-code
- depends: []
- prompt: |
    Implement JWT authentication: login route,
    auth middleware, and token refresh endpoint.

### ui
- files: src/dashboard/**
- executor: claude-code
- depends: []
- prompt: |
    Build a dashboard login page and protected
    dashboard view using React components.

### tests
- files: test/**
- executor: claude-code
- depends: [auth, ui]
- prompt: |
    Write integration tests for the auth backend
    and dashboard UI. Test the full login flow.
```

Preview the execution plan:

```bash
ruah workflow plan feature-auth.md
```

```
Workflow: feature-auth
  Base: main
  Parallel: true
  Tasks: 3

Execution plan:
  Stage 1: auth, ui    (parallel)
  Stage 2: tests       (after auth, ui)
```

Run the whole thing:

```bash
ruah workflow run feature-auth.md
```

ruah will create the worktrees, start auth and UI in parallel, wait for both to finish, merge them, then start and merge tests. One command, three agents, zero babysitting.

**What just happened?** The workflow engine parsed your markdown into a DAG. It saw that `tests` depends on `auth` and `ui`, so it computed two stages. Stage 1 runs auth and UI in parallel. Stage 2 runs tests after both merge. The smart planner also checks for file overlaps -- if two tasks in the same stage share files, it automatically downgrades to serial execution or injects modification contracts between agents.

## Bonus: The 3-second demo

Want to see ruah work without setting up a project? Run this:

```bash
npx @levi-tc/ruah demo
```

It spins up a temporary repo, creates parallel tasks, executes them, and merges everything -- in about 3 seconds. No installation required.

## What's next

You just orchestrated three AI agents working in parallel on the same codebase. The key ideas:

- **Worktree isolation** means agents literally cannot write to the same files
- **File locks** enforce this at the task level, catching conflicts before they happen
- **DAG scheduling** lets you express dependencies (`tests` runs after `auth` and `ui`)
- **Workflow files** make the whole thing reproducible and version-controllable

If you want to go deeper:

- **Subagent spawning**: a running agent can create child tasks with `ruah task create --parent <name>`, splitting its work further
- **Executor flexibility**: swap `claude-code` for `aider`, `codex`, `open-code`, or any shell command
- **Smart planner**: when file patterns overlap, ruah automatically negotiates modification contracts between agents
- **`--json` everywhere**: every command supports `--json` for scripting and CI integration

Check out the architecture deep-dive (Post 2 in this series) for how worktrees, file locks, and the DAG planner fit together under the hood.

**GitHub**: [github.com/levi-tc/ruah](https://github.com/levi-tc/ruah)
**npm**: `npm install -g @levi-tc/ruah`

---

*This is Post 4 of the "Taming Multi-Agent Chaos" series. Start from Post 1 if you want the full picture -- from the problem statement through the architecture to this hands-on walkthrough.*
