import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ADAPTERS = {
	"claude-code": (prompt) => ({
		command: "claude",
		args: ["-p", prompt, "--dangerously-skip-permissions"],
	}),
	aider: (prompt) => ({
		command: "aider",
		args: ["--message", prompt, "--yes-always", "--no-git"],
	}),
	codex: (prompt) => ({
		command: "codex",
		args: [prompt],
	}),
	script: (prompt) => {
		const parts = prompt.split(/\s+/);
		return {
			command: parts[0],
			args: parts.slice(1),
		};
	},
};

export function getAvailableExecutors() {
	return Object.keys(ADAPTERS);
}

export function executeTask(taskDef, worktreePath, opts = {}) {
	const { dryRun, silent } = opts;
	const prompt = taskDef.prompt || "";
	const executorName = taskDef.executor || "script";

	// Resolve adapter
	const adapter = ADAPTERS[executorName];
	let cmd, args;

	if (adapter) {
		const resolved = adapter(prompt);
		cmd = resolved.command;
		args = resolved.args;
	} else {
		// Unknown executor: treat as raw command
		const parts = executorName.split(/\s+/);
		cmd = parts[0];
		args = [...parts.slice(1), prompt].filter(Boolean);
	}

	// Write task file for reference
	const taskFile = join(worktreePath, ".ruah-task.md");
	writeFileSync(taskFile, `# Task: ${taskDef.name}\n\n${prompt}\n`, "utf-8");

	if (dryRun) {
		return Promise.resolve({
			success: true,
			command: `${cmd} ${args.join(" ")}`,
			dryRun: true,
		});
	}

	return new Promise((resolve) => {
		const child = spawn(cmd, args, {
			cwd: worktreePath,
			env: {
				...process.env,
				RUAH_TASK: taskDef.name,
				RUAH_WORKTREE: worktreePath,
			},
			stdio: silent ? "pipe" : "inherit",
			shell: process.platform === "win32",
		});

		let stdout = "";
		let stderr = "";

		if (silent && child.stdout) {
			child.stdout.on("data", (data) => {
				stdout += data;
			});
		}
		if (silent && child.stderr) {
			child.stderr.on("data", (data) => {
				stderr += data;
			});
		}

		child.on("error", (err) => {
			resolve({
				success: false,
				exitCode: null,
				stdout,
				stderr,
				error: err.message,
			});
		});

		child.on("close", (code) => {
			resolve({
				success: code === 0,
				exitCode: code,
				stdout,
				stderr,
				error: code !== 0 ? `Process exited with code ${code}` : null,
			});
		});
	});
}
