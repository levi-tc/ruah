# Workflow: reddit-posts

## Config
- base: main
- parallel: true

## Tasks

### maker-subs
- files: reddit-posts/maker-communities.md
- executor: claude-code
- depends: []
- prompt: |
    Research r/IMadeThis and r/SideProject subreddits. For each subreddit, understand the community rules, posting culture, tone, and what gets engagement.

    Then write a ready-to-post Reddit post for EACH subreddit about ruah — a multi-agent orchestration CLI (npm: @levi-tc/ruah, GitHub: github.com/levi-tc/ruah). It prevents AI coding agents (Claude Code, Aider, Codex, Cursor, Windsurf) from stepping on each other when working in the same repo. Key features: Git worktree isolation per task, file-level locking, DAG workflows in Markdown, smart planner, zero runtime deps, governance gates, subagent spawning. Install: npm install -g @levi-tc/ruah. Demo: npx @levi-tc/ruah demo (3 seconds).

    Requirements: match the subreddit tone, be authentic not salesy, "I built this because I had this problem" angle, mention open source MIT licensed, include GitHub link naturally.

    Write the complete posts (title + body for each subreddit) to reddit-posts/maker-communities.md

### dev-subs
- files: reddit-posts/dev-communities.md
- executor: claude-code
- depends: []
- prompt: |
    Research r/webdev, r/coding, and r/coolgithubprojects subreddits. For each subreddit, understand the community rules, posting culture, tone, and what gets engagement.

    Then write a ready-to-post Reddit post for EACH subreddit about ruah — a multi-agent orchestration CLI (npm: @levi-tc/ruah, GitHub: github.com/levi-tc/ruah). It prevents AI coding agents (Claude Code, Aider, Codex, Cursor, Windsurf) from stepping on each other when working in the same repo. Key features: Git worktree isolation per task, file-level locking, DAG workflows in Markdown, smart planner, zero runtime deps, governance gates, subagent spawning. Install: npm install -g @levi-tc/ruah. Demo: npx @levi-tc/ruah demo.

    Requirements: r/webdev focus on practical dev workflow, r/coding focus on technical architecture (git worktrees, DAGs, file locking), r/coolgithubprojects keep brief and link-focused. Developer-to-developer tone. MIT licensed. Include GitHub link.

    Write the complete posts (title + body for each subreddit) to reddit-posts/dev-communities.md

### cli-node-subs
- files: reddit-posts/cli-node.md
- executor: claude-code
- depends: []
- prompt: |
    Research r/commandline and r/node subreddits. For each subreddit, understand the community rules, posting culture, tone, and what gets engagement.

    Then write a ready-to-post Reddit post for EACH subreddit about ruah — a multi-agent orchestration CLI (npm: @levi-tc/ruah, GitHub: github.com/levi-tc/ruah). It prevents AI coding agents (Claude Code, Aider, Codex, Cursor, Windsurf) from stepping on each other when working in the same repo. Key features: Git worktree isolation, file locking, DAG workflows in Markdown, zero runtime deps (pure Node.js), TypeScript strict mode, 80+ tests, every command supports --json, ESM.

    Requirements: r/commandline focus on CLI design, --json output, zero deps, Unix philosophy vibes. r/node focus on Node.js ecosystem quality, zero runtime deps, TypeScript, ESM, npm package standards. Be technical and understated, these communities hate hype. Show command examples. MIT licensed.

    Write the complete posts (title + body for each subreddit) to reddit-posts/cli-node.md

### ai-subs
- files: reddit-posts/ai-communities.md
- executor: claude-code
- depends: []
- prompt: |
    Research r/ClaudeAI, r/ChatGPT, r/artificial, r/LocalLLaMA, and r/MachineLearning subreddits. For each subreddit, understand the community rules, posting culture, what gets engagement, and self-promotion policies.

    Then write a ready-to-post Reddit post for EACH subreddit (skip any where self-promo is banned) about ruah — a multi-agent orchestration CLI (npm: @levi-tc/ruah, GitHub: github.com/levi-tc/ruah). It prevents AI coding agents (Claude Code, Aider, Codex, Cursor, Windsurf) from stepping on each other when working in the same repo. Key features: Git worktree isolation, file locking, DAG workflows in Markdown, smart planner with overlap analysis, executor adapters for Claude Code/Aider/Codex/any CLI, subagent spawning, modification contracts, governance gates. Demo: npx @levi-tc/ruah demo (3 seconds).

    Requirements: r/ClaudeAI frame around Claude Code multi-agent workflows. r/ChatGPT broader appeal about orchestrating AI agents. r/artificial frame as multi-agent infrastructure. r/LocalLLaMA emphasize works with ANY executor/CLI, not locked to proprietary. r/MachineLearning only if self-promo allowed. Authentic tone. MIT licensed.

    Write the complete posts (title + body for each subreddit) to reddit-posts/ai-communities.md
