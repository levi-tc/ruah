import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { ParsedArgs } from "../cli.js";
import { getRepoRoot, isGitRepo } from "../core/git.js";
import { log, logError, logInfo, logSuccess } from "../utils/format.js";

// --- Enforcement Hook (installed for all harnesses that support hooks) ---

const ENFORCE_HOOK = `#!/bin/bash
# ruah-enforce.sh — Enforce ruah usage for file modifications
# Installed by: ruah setup
# Change exit 0 to exit 2 at the bottom to hard-block edits outside tasks.

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

# Skip if not a ruah-initialized project
[ -d "$ROOT/.ruah" ] || exit 0

# Skip if already inside a ruah task worktree
[ -n "$RUAH_TASK" ] && exit 0

echo "⚠️  ruah is active. Editing files outside a task worktree risks merge conflicts."
echo "   Create a task: ruah task create <name> --files \\"src/**\\" --executor claude-code --prompt \\"...\\""
echo "   Or check status: ruah status"

# Advisory warning (exit 0). Change to exit 2 to block edits entirely.
exit 0
`;

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

# Adopt a stranded task in the same worktree
ruah task takeover <name> --executor codex

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
- An agent stopped mid-task but the worktree still exists → inspect \`ruah status --json\` and use \`ruah task takeover <name>\`

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

> **⚠️ ENFORCEMENT**: This project uses ruah for multi-agent orchestration.
> You MUST create a ruah task before modifying source files.
> Editing files directly on the main branch risks merge conflicts with other agents.
>
> Before editing any source file:
> 1. \`ruah task create <name> --files "src/**" --executor cursor --prompt "describe the task"\`
> 2. \`ruah task start <name>\`
> 3. Work inside the task worktree
> 4. \`ruah task done <name> && ruah task merge <name>\`

## Available Commands
- \`ruah status --json\` — project status with task counts
- \`ruah task create <name> --files "..." --executor claude-code --prompt "..."\` — create isolated task
- \`ruah task start <name>\` — start task execution in worktree
- \`ruah task done <name>\` — mark complete
- \`ruah task merge <name>\` — merge back (runs governance gates)
- \`ruah task takeover <name> --executor codex\` — adopt a stranded task/worktree with another agent
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

// biome-ignore lint/suspicious/noExplicitAny: JSON structure varies
type JsonObject = Record<string, any>;

function installClaudeHooks(root: string, force: boolean): boolean {
	const hooksDir = join(root, ".claude", "hooks");
	const hookPath = join(hooksDir, "ruah-enforce.sh");
	const settingsPath = join(root, ".claude", "settings.local.json");

	// Write hook script
	mkdirSync(hooksDir, { recursive: true });

	if (existsSync(hookPath) && !force) {
		const existing = readFileSync(hookPath, "utf-8");
		if (existing.includes("ruah-enforce")) {
			return false;
		}
	}

	writeFileSync(hookPath, ENFORCE_HOOK, "utf-8");
	chmodSync(hookPath, 0o755);

	// Update settings.local.json — merge, don't overwrite
	let settings: JsonObject = {};
	if (existsSync(settingsPath)) {
		try {
			settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
		} catch {
			settings = {};
		}
	}

	if (!settings.hooks) settings.hooks = {};
	if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];

	const preToolUse = settings.hooks.PreToolUse as JsonObject[];
	const hookCmd = "bash .claude/hooks/ruah-enforce.sh";

	// Check if already installed
	const alreadyInstalled = preToolUse.some((entry) =>
		(entry.hooks as JsonObject[])?.some((h) =>
			(h.command as string)?.includes("ruah-enforce"),
		),
	);

	if (!alreadyInstalled) {
		for (const matcher of ["Edit", "Write"]) {
			const existing = preToolUse.find((e) => e.matcher === matcher);
			if (existing) {
				(existing.hooks as JsonObject[]).push({
					type: "command",
					command: hookCmd,
				});
			} else {
				preToolUse.push({
					matcher,
					hooks: [{ type: "command", command: hookCmd }],
				});
			}
		}
		writeFileSync(
			settingsPath,
			`${JSON.stringify(settings, null, 2)}\n`,
			"utf-8",
		);
	}

	return true;
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

	// Install enforcement hooks (Claude Code gets a PreToolUse hook,
	// other harnesses rely on the enforcement language in their rules)
	const hookInstalled = installClaudeHooks(root, !!force);
	if (hookInstalled) {
		logSuccess("Claude Code: installed enforcement hook (PreToolUse)");
		installed++;
	} else {
		logInfo("Claude Code: enforcement hook exists (skipped)");
	}

	console.log("");
	log(`Done: ${installed} installed, ${skipped} skipped`);

	if (installed > 0) {
		console.log("");
		logInfo("AI agents will now auto-detect ruah in this project.");
		logInfo("Enforcement: agents are warned when editing outside a ruah task.");
		logInfo("Run 'ruah setup --force' to overwrite existing files.");
	}
}
