import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ParsedArgs } from "../cli.js";
import { getRepoRoot, isGitRepo } from "../core/git.js";
import { log, logError, logInfo, logSuccess } from "../utils/format.js";

// --- Claude Code Integration ---

const CLAUDE_SKILL = `---
name: ruah-orchestrator
description: Multi-agent orchestration with ruah — task management, workflow execution, file locking
activation: auto
---

# ruah — Multi-Agent Orchestration

ruah is installed and available in this project. Use it to orchestrate parallel AI agent work.

## Quick Reference

\`\`\`bash
# Status
ruah status --json

# Create isolated tasks
ruah task create <name> --files "src/**" --executor claude-code --prompt "..."

# Start task (creates worktree, runs executor)
ruah task start <name>

# Lifecycle
ruah task done <name>
ruah task merge <name>

# Workflows (DAG-based)
ruah workflow run <file.md>
ruah workflow plan <file.md>

# Subagent spawning
ruah task create <child> --parent <parent> --files "src/sub/**" --executor claude-code --prompt "..."
\`\`\`

## When to Use ruah

- Multiple files/modules need parallel independent work → create separate tasks
- A task can be split into subtasks → use \`--parent\` for hierarchical branching
- Quality gates needed before merge → ruah auto-detects governance.md
- Need isolated worktrees for conflict-free parallel edits

## Environment Variables (available in task worktrees)

- \`RUAH_TASK\` — current task name
- \`RUAH_WORKTREE\` — worktree path
- \`RUAH_PARENT_TASK\` — parent task (if subtask)
- \`RUAH_FILES\` — locked file patterns
- \`RUAH_ROOT\` — repo root

## JSON Output

Every command supports \`--json\` for structured output.
`;

// --- Cursor Integration ---

const CURSOR_RULE = `# ruah — Multi-Agent Orchestration

This project uses \`ruah\` for multi-agent orchestration.

## Available Commands
- \`ruah status --json\` — project status with task counts
- \`ruah task create <name> --files "..." --executor claude-code --prompt "..."\` — create isolated task
- \`ruah task start <name>\` — start task execution in worktree
- \`ruah task done <name>\` — mark complete
- \`ruah task merge <name>\` — merge back (runs governance gates)
- \`ruah workflow run <file.md>\` — execute DAG workflow
- \`ruah task create <child> --parent <parent> --files "..." --prompt "..."\` — spawn subtask

## Key Concepts
- Each task runs in an isolated git worktree
- File locks prevent edit conflicts between tasks
- Workflows define task DAGs in markdown
- Subtasks branch from parent (not base), merge into parent
`;

// --- Windsurf Integration ---

const WINDSURF_RULE = CURSOR_RULE;

interface SetupTarget {
	name: string;
	path: string;
	content: string;
	description: string;
}

function getTargets(root: string): SetupTarget[] {
	return [
		{
			name: "Claude Code",
			path: join(root, ".claude", "skills", "ruah-orchestrator", "SKILL.md"),
			content: CLAUDE_SKILL,
			description: "skill for auto-detection",
		},
		{
			name: "Cursor",
			path: join(root, ".cursor", "rules", "ruah.mdc"),
			content: CURSOR_RULE,
			description: "rule file",
		},
		{
			name: "Windsurf",
			path: join(root, ".windsurfrules"),
			content: WINDSURF_RULE,
			description: "rule file",
		},
		{
			name: "Cody",
			path: join(root, ".sourcegraph", "ruah-instructions.md"),
			content: CURSOR_RULE,
			description: "instructions file",
		},
		{
			name: "Continue",
			path: join(root, ".continue", "rules", "ruah.md"),
			content: CURSOR_RULE,
			description: "rule file",
		},
	];
}

export async function run(args: ParsedArgs): Promise<void> {
	if (!isGitRepo()) {
		logError("Not a git repository. Run git init first.");
		process.exit(1);
	}

	const root = getRepoRoot();
	const force = args.flags.force;
	const targets = getTargets(root);

	log("Setting up ruah integrations...");
	console.log("");

	let installed = 0;
	let skipped = 0;

	for (const target of targets) {
		if (existsSync(target.path) && !force) {
			// For files that aggregate content (like .windsurfrules), check if ruah is already mentioned
			if (target.name === "Windsurf") {
				const existing = await import("node:fs").then((fs) =>
					fs.readFileSync(target.path, "utf-8"),
				);
				if (existing.includes("ruah")) {
					logInfo(`${target.name}: already configured (skipped)`);
					skipped++;
					continue;
				}
				// Append to existing file
				writeFileSync(target.path, `${existing}\n\n${target.content}`, "utf-8");
				logSuccess(`${target.name}: appended ${target.description}`);
				installed++;
				continue;
			}

			logInfo(
				`${target.name}: ${target.description} exists (use --force to overwrite)`,
			);
			skipped++;
			continue;
		}

		// Create directories
		const dir = join(target.path, "..");
		mkdirSync(dir, { recursive: true });

		writeFileSync(target.path, target.content, "utf-8");
		logSuccess(`${target.name}: installed ${target.description}`);
		installed++;
	}

	console.log("");
	log(`Done: ${installed} installed, ${skipped} skipped`);

	if (installed > 0) {
		console.log("");
		logInfo("AI agents will now auto-detect ruah in this project.");
		logInfo("Run 'ruah setup --force' to overwrite existing files.");
	}
}
