# Reddit Posts: AI Communities

Research date: April 6, 2026

---

## r/ClaudeAI

**Status:** PRIMARY target. Frame as workflow discovery, not product launch.

**Timing:** Weekday morning EST. This sub is active US hours.

**Flair:** Project / Tool (if available), otherwise Discussion.

**Title:**
`I built an orchestration layer for running multiple Claude Code sessions on the same repo without them destroying each other's work`

**Body:**

```md
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
```

**Why this works for r/ClaudeAI:**
- Opens with a specific Claude Code pain point the audience has lived
- The "wall" framing (single-session ceiling) validates their experience
- Shows a real workflow, not abstract feature lists
- Ends with a genuine discussion question that invites sharing
- Mentions other executors but clearly positions as Claude Code-first
- The demo command is frictionless (npx, 3 seconds, self-cleaning)

**Sources:**
- https://www.reddit.com/r/ClaudeAI/about/
- https://www.reddit.com/r/ClaudeAI/comments/1s1ipep/the_5_levels_of_claude_code_and_how_to_know_when/
- https://www.reddit.com/r/ClaudeAI/comments/1s6v41a/the_agentic_frame_work_i_built_with_claude_got/

---

## r/ChatGPT

**Status:** Weekly self-promotional megathread ONLY. No standalone post.

**Timing:** Post within first few hours of the new megathread going live for visibility.

**Format:** Megathread comment. Needs a strong hook in the first line since users are scrolling fast.

**Megathread comment:**

```md
Anyone else running Codex on a real codebase and watching it fight with itself?

I hit a wall where I wanted multiple AI agents working on different parts of the same repo at the same time — auth module, API routes, frontend components. Sounds great in theory. In practice, they step on each other's files, one agent's changes break another's assumptions, and you end up spending more time resolving merge conflicts than you saved.

So I built an open-source tool called **ruah** that prevents this. Each agent gets its own isolated copy of the repo (git worktree), files are locked so two agents can't edit the same thing, and when they finish, everything merges back in the right order automatically.

Works with Codex, Claude Code, Aider, or literally any CLI tool. Not locked to one provider.

**The 3-second demo** (creates a temp repo, shows the isolation in action, cleans up after itself):

    npx @levi-tc/ruah demo

GitHub: https://github.com/levi-tc/ruah

Free, open-source, MIT. Curious if anyone else has run into the "multiple agents, one repo" problem and how you've dealt with it.
```

**Why this works for r/ChatGPT:**
- Hook line is conversational and relatable, not technical jargon
- "fighting with itself" is visceral — people who've tried this know exactly the feeling
- Codex is the natural hook for this audience
- Avoids deep technical details (no DAG, no governance gates, no spawning)
- The demo is positioned as a quick "see it work" moment, not "install my tool"
- Ends with an open question to encourage engagement
- Short enough for a megathread scroll

**Sources:**
- https://www.reddit.com/r/ChatGPT/about/
- https://www.reddit.com/r/ChatGPT/comments/18bc35a/weekly_selfpromotional_mega_thread_11_04122023/

---

## r/LocalLLaMA

**Status:** Strong fit. Frame around executor-agnostic architecture and local model workflows.

**Timing:** Consider 3 AM EST for international audience overlap (the sub skews heavily non-US).

**Format:** Link post to GitHub repo (link posts average 482 upvotes/24h on this sub). Title is the pitch.

**Title:**
`ruah — open-source CLI for running multiple coding agents in parallel without merge conflicts. Executor-agnostic: works with any CLI, any model, any provider.`

**Body (if text post) / Top comment (if link post):**

```md
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
```

**Why this works for r/LocalLLaMA:**
- Leads with the provider-agnostic thesis — this audience is allergic to vendor lock-in
- Lists failure modes they've experienced (not hypothetical problems)
- Explicitly shows how any CLI/script can be an executor, including local model pipelines
- The "design decision" paragraph invites the "why did you choose that?" conversation this sub loves
- Questions are specific enough to generate real discussion, not generic "thoughts?"
- Technical depth matches the sub's expectations without being academic

**Sources:**
- https://www.reddit.com/r/LocalLLaMA/about/
- https://www.reddit.com/r/LocalLLaMA/comments/1lzw6yu/open_source_alternative_to_notebooklm/

---

## r/MachineLearning

**Status:** Viable as a `[P]` project post. Must frame as systems research, not product.

**Timing:** Weekday, avoid weekends (lower engagement for [P] posts).

**Flair:** [P] (mandatory for project posts)

**Title:**
`[P] ruah: multi-agent code generation as a scheduling and isolation problem — worktree-per-task, file locking, DAG execution`

**Body:**

```md
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
```

**Why this works for r/MachineLearning:**
- Frames as a systems/scheduling problem, not a product
- Explicitly states the thesis upfront
- Design decisions section shows deliberate tradeoffs, not marketing claims
- Limitations section is honest and specific — this sub will shred you if you hide weaknesses
- No benchmarks are presented (avoids cherry-picking), instead asks how to benchmark
- Feedback questions are precise and actionable, inviting the kind of technical discussion this sub values
- References known CS concepts (readers-writers, DAG scheduling, copy-on-write) without overreaching

**Sources:**
- https://www.reddit.com/r/MachineLearning/about/
- https://www.reddit.com/r/MachineLearning/comments/1sa4rlx/d_selfpromotion_thread/
- https://www.reddit.com/r/MachineLearning/comments/1s6uqns/p_built_an_open_source_tool_to_find_the_location/

---

## r/artificial

**Status:** SKIP.

Self-promotion is explicitly prohibited in the subreddit rules. The mod team enforces this actively. The risk/reward ratio does not justify posting — even a carefully disguised discussion post from an account associated with the project could result in a ban that prevents future organic participation.

If ruah gains traction organically and someone else posts about it, that's the right entry point for this sub.

**Sources:**
- https://www.reddit.com/r/artificial/about/
- https://www.reddit.com/r/artificial/wiki/guidelines/selfpromo/
