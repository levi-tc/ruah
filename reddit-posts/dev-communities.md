# Reddit Posts: Dev Communities

Research date: April 6, 2026
Updated: April 6, 2026 (v2 rewrite with community-specific voice and strategy)

---

## r/coolgithubprojects

**Status:** Post FIRST — lowest risk, purpose-built for project showcases
**Risk level:** Very low
**When to post:** Any time (no day restrictions)
**Format:** Link post pointing to GitHub repo, with body text

### Title

`[CLI] ruah — give each AI coding agent its own worktree so they never touch the same files`

### Body

```md
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

Repo: https://github.com/levi-tc/ruah

Feedback welcome — especially on the lock model and whether the DAG workflow format makes sense.
```

### Strategy notes

- Post as a link post to https://github.com/levi-tc/ruah
- Body above goes as the first comment (link posts cannot have body text on Reddit — add this as a top-level comment immediately after posting)
- This community expects straightforward descriptions, not storytelling
- Keep the comment factual and scannable

### Sources

- https://www.reddit.com/r/coolgithubprojects/about/sidebar/
- https://www.reddit.com/r/coolgithubprojects/
- https://www.reddit.com/r/coolgithubprojects/comments/1sdjh7z/building_an_opensource_n8n_alternative_focused_on/
- https://www.reddit.com/r/coolgithubprojects/comments/1sdkcf5/crag_one_file_for_your_quality_rules_compiled_to/

---

## r/webdev

**Status:** Viable on Showoff Saturday ONLY
**Risk level:** Medium — the community sniffs out marketing copy instantly
**When to post:** Saturday, April 11, 2026 (must use [Showoff Saturday] tag)
**Format:** Text post
**Prerequisite:** Before posting, have at least 9 genuine non-promotional comments/posts in r/webdev over the prior 2 weeks. Answer questions, share opinions on other people's work. The 9:1 rule is enforced socially.

### Title

`[Showoff Saturday] I got tired of AI agents stomping on each other's files, so I made a CLI that gives each one its own worktree`

### Body

```md
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
```

### First comment (post immediately after submitting)

```md
Happy to answer any questions about the architecture. A few things I learned building this:

- Git worktrees turned out to be the perfect primitive for this. Each one is a real working directory with its own branch, but they share the same .git — so they're lightweight and merges use normal git tooling.
- The file locks are advisory, not OS-level. They exist in a JSON state file that ruah checks at task creation. This was a deliberate tradeoff: agents that don't go through ruah can still technically touch locked files, but in practice the coordination boundary is at task creation, not runtime.
- The DAG planner analyzes file patterns for overlap. If two stages have disjoint files, they run in parallel. If there's partial overlap, it can negotiate "modification contracts" where agents agree to limit their scope. If there's full overlap, it serializes.

The thing I'm least confident about is the lock granularity — glob patterns work for most cases, but there are edge cases with generated files and transitive imports that are hard to express as globs.
```

### Strategy notes

- The post is framed as a fellow developer sharing a workflow frustration, not announcing a product
- The ending question is genuine and discussion-oriented — it invites people to talk about their own experience rather than just react to the tool
- The "first comment" provides the technical depth that r/webdev respects while keeping the main post accessible
- Include the demo GIF (from the repo) as an embedded image if Reddit allows it for text posts, otherwise link it
- Do NOT cross-post from r/coolgithubprojects — write this fresh

### Sources

- https://www.reddit.com/r/webdev/about/sidebar/
- https://old.reddit.com/r/webdev/
- https://www.reddit.com/r/webdev/comments/1sc9x7s/i_built_a_library_that_lets_you_control_web_maps/
- https://www.reddit.com/r/webdev/comments/1sd6pl9/showoff_saturday_video_editor_running_parakeet/

---

## r/coding

**Status:** HIGH RISK — this must be a genuine technical deep-dive, not a showcase
**Risk level:** High
**When to post:** Any weekday (avoid weekends when moderation is lighter and community is pickier)
**Format:** Text post — long-form technical article format
**Prerequisite:** The title and first paragraph must make it clear this is about a systems design problem, not a product launch. The repo link should be buried in the middle or end, never at the top.

### Title

`Why git worktrees are the right isolation primitive for parallel AI agents (and docker containers aren't)`

### Body

```md
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
```

### First comment (post immediately after submitting)

```md
For anyone who wants to see the worktree isolation in action without reading code, this runs a self-contained demo in a temp directory (creates a repo, spawns tasks, shows the locking and DAG scheduling, then cleans up):

```bash
npx @levi-tc/ruah demo
```

Takes about 3 seconds. But the post above is more about the design decisions than the tool itself — I'm genuinely trying to figure out if the isolation model I chose is the right one, or if there's a better primitive I'm not seeing.
```

### Strategy notes

- The title frames this as a technical comparison, not a project announcement
- The repo link appears only once, at the very end, after 1000+ words of genuine technical analysis
- The discussion questions are specific and invite expert feedback — this is what r/coding values
- The "where the model breaks down" section is critical — it shows intellectual honesty and invites the kind of "well actually" responses that drive engagement on r/coding
- Do NOT mention that this is a new tool or that you're launching anything. The framing is "I explored a systems design problem and here's what I found"
- If the post gets traction, be ready to engage deeply in the comments. Generic "thanks for the feedback!" replies will get downvoted
- Consider posting this 2-3 days AFTER the r/webdev and r/coolgithubprojects posts, so there's some existing GitHub activity/stars that lend credibility

### Sources

- https://www.reddit.com/r/coding/
- https://www.reddit.com/r/coding/comments/1rpneev/agenvoy_agentic_ai_runner_in_go_no_langchain_no/
- https://www.reddit.com/r/coding/comments/1run7dr/rust_tui_that_dissolves_git_branches_away_in/

---

## Posting Order & Timeline

| Order | Subreddit | Date | Risk | Notes |
|-------|-----------|------|------|-------|
| 1 | r/coolgithubprojects | Any day (ASAP) | Very low | Gets the repo out there, builds initial star count |
| 2 | r/webdev | Saturday, April 11 | Medium | Must be Showoff Saturday. Spend the week before being active in the sub |
| 3 | r/coding | Tuesday, April 14-15 | High | Post after you have some GitHub activity. This one lives or dies on comment engagement |

## Cross-Posting Rules

- Do NOT cross-post between these subreddits. Each post is written differently for a reason.
- Do NOT link to one Reddit post from another.
- If someone in comments says "I saw this on r/X" — just be honest: "Yeah, I shared it there too, different angle."
