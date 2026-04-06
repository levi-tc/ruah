# Reddit Posts: Maker Communities

Research date: April 6, 2026

---

## r/IMadeThis

**Status:** Viable (low-risk, welcoming community)

### Strategy Notes

- **Tone:** Workshop conversation. You're showing something to a friend at a makerspace, not pitching investors.
- **Timing:** Weekday evenings or weekends. Low-traffic sub, so timing matters less than authenticity.
- **Media:** Include a terminal screenshot or short GIF of the demo running. This sub rewards showing your work visually.
- **First comment:** Post a self-reply immediately with the GitHub link, npm install command, and the 3-second demo command. Keep the main post story-only.
- **Length:** Medium. Don't over-explain. Let curiosity do the work.

### Title

`I kept losing hours to AI agents fighting over the same files, so I built a CLI to give each one its own workspace`

### Body

```md
For the last few months I've been using multiple AI coding agents at the same time -- Claude Code on one feature, Codex on another, sometimes Aider for a quick refactor. The promise is obvious: parallelize your work, ship faster.

The reality was me staring at a terminal at 11pm trying to untangle what happened when two agents both decided to rewrite the same utility file. One would finish, the other would finish on stale code, and git merge would hand me a pile of conflicts that neither agent understood. I'd spend more time cleaning up than I saved.

After the third time I lost an evening to this, I started building ruah.

The idea is dead simple: each task gets its own git worktree (so agents literally can't see each other's changes), and you declare which files each task owns up front. If two tasks claim the same file, ruah rejects it before anything runs. No more "I'll just be careful" -- the tool enforces the boundaries.

It also handles the merge sequencing. If task B depends on task A, ruah merges A first, then rebases B, then merges B. You describe the dependency graph in a markdown file and ruah executes it.

[terminal screenshot / GIF here]

It works with any CLI agent -- Claude Code, Codex, Aider, Cursor, Windsurf, whatever. Zero runtime dependencies, MIT licensed, written in TypeScript.

I'm still actively working on it (v0.3.2 right now), so it's rough around some edges. But the core loop -- worktree isolation, file locking, DAG-based merge order -- has been solid for me.

What's the dumbest amount of time you've lost to a problem that should have been trivial? I need to feel less alone about my 11pm merge sessions.
```

### First Comment (post immediately after)

```md
Links for anyone who wants to try it:

- GitHub: https://github.com/levi-tc/ruah
- npm: `npm install -g @levi-tc/ruah`
- 3-second demo: `npx @levi-tc/ruah demo`

Happy to answer any questions about the implementation. The whole thing is ~2K lines of TypeScript with 152 tests and zero runtime deps.
```

### Sources

- https://www.reddit.com/r/IMadeThis/
- https://www.reddit.com/r/IMadeThis/about/rules
- https://www.reddit.com/r/IMadeThis/comments/1s321s9/ive_built_an_alternative_to_devdocsio_but_added/
- https://www.reddit.com/r/IMadeThis/comments/1s2ysub/im_15_and_made_a_tool_that_finds_research/

---

## r/SideProject

**Status:** Best maker-community fit (647K members, self-promotion friendly)

### Strategy Notes

- **Tone:** Contributor, not founder. You're sharing a war story that led to a tool, not launching a product.
- **Timing:** Saturday or Sunday, 9am-12pm EST. Weekend mornings consistently get the highest engagement on this sub.
- **Media:** A short video or GIF of the demo running is ideal. "A quick video showing off your product performs the best, with product details and links written in the replies."
- **Structure:** Spend the first 60% of the post on the PROBLEM. Make readers nod along before you ever mention what you built. Bury the lede.
- **First comment:** All links, technical specs, and the demo command go here. The post itself should read like a story, not a README.
- **Engagement:** End with a specific, opinionated question -- not "what do you think?" but something that invites people to share their own experience or disagree with a choice you made.

### Title

`I mass-produce merge conflicts for a living (or: what happens when you run 3 AI coding agents on the same repo)`

### Body

```md
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
```

### First Comment (post immediately after)

```md
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
```

### Sources

- https://www.reddit.com/r/SideProject/
- https://www.reddit.com/r/SideProject/about/rules
- https://old.reddit.com/r/SideProject/
- https://www.reddit.com/r/SideProject/comments/1oaq2kx/share_your_notai_projects/
- https://www.reddit.com/r/SideProject/comments/1sbr7sm/i_built_a_wifi_bell_system_in_my_garage_because_a/
