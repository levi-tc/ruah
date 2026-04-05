import { executeTask } from "../core/executor.js";
import {
	createWorktree,
	getRepoRoot,
	getWorktreeDiff,
	mergeWorktree,
	removeWorktree,
} from "../core/git.js";
import {
	detectCrag,
	readCragGovernance,
	runGates,
} from "../core/integrations.js";
import {
	acquireLocks,
	addHistoryEntry,
	loadState,
	releaseLocks,
	saveState,
} from "../core/state.js";
import {
	formatLocks,
	formatTaskList,
	log,
	logError,
	logInfo,
	logSuccess,
	logWarn,
} from "../utils/format.js";

export async function run(args) {
	const sub = args._[1];
	if (!sub) {
		logError(
			"Missing subcommand. Usage: ruah task <create|start|done|merge|list|cancel>",
		);
		process.exit(1);
	}

	const root = getRepoRoot();

	switch (sub) {
		case "create":
			return taskCreate(args, root);
		case "start":
			return taskStart(args, root);
		case "done":
			return taskDone(args, root);
		case "merge":
			return taskMerge(args, root);
		case "list":
			return taskList(args, root);
		case "cancel":
			return taskCancel(args, root);
		default:
			logError(`Unknown task subcommand: ${sub}`);
			process.exit(1);
	}
}

function taskCreate(args, root) {
	const name = args._[2];
	if (!name) {
		logError("Missing task name. Usage: ruah task create <name>");
		process.exit(1);
	}

	const files = args.flags.files
		? args.flags.files.split(",").map((f) => f.trim())
		: [];
	const baseBranch = args.flags.base;
	const executor = args.flags.executor || null;
	const prompt = args.flags.prompt || null;

	const state = loadState(root);
	const base = baseBranch || state.baseBranch;

	if (state.tasks[name]) {
		logError(`Task "${name}" already exists`);
		process.exit(1);
	}

	// Check file locks
	if (files.length > 0) {
		const lockResult = acquireLocks(state, name, files);
		if (!lockResult.success) {
			logError("File lock conflict:");
			for (const c of lockResult.conflicts) {
				logWarn(
					`  "${c.requested}" overlaps with "${c.pattern}" (locked by: ${c.task})`,
				);
			}
			process.exit(1);
		}
	}

	// Create worktree
	const { worktreePath, branchName } = createWorktree(name, base, root);

	// Save task
	state.tasks[name] = {
		name,
		status: "created",
		baseBranch: base,
		branch: branchName,
		worktree: worktreePath,
		files,
		executor,
		prompt,
		createdAt: new Date().toISOString(),
		startedAt: null,
		completedAt: null,
		mergedAt: null,
	};

	addHistoryEntry(state, "task.created", { task: name });
	saveState(root, state);

	logSuccess(`Task "${name}" created`);
	log(`Branch: ${branchName}`);
	log(`Worktree: ${worktreePath}`);
	if (files.length > 0) {
		log(`Locked: ${files.join(", ")}`);
	}
	if (executor) logInfo(`Executor: ${executor}`);
}

async function taskStart(args, root) {
	const name = args._[2];
	if (!name) {
		logError("Missing task name. Usage: ruah task start <name>");
		process.exit(1);
	}

	const state = loadState(root);
	const task = state.tasks[name];
	if (!task) {
		logError(`Task "${name}" not found`);
		process.exit(1);
	}
	if (task.status !== "created") {
		logError(`Task "${name}" is ${task.status}, can only start from "created"`);
		process.exit(1);
	}

	task.status = "in-progress";
	task.startedAt = new Date().toISOString();
	addHistoryEntry(state, "task.started", { task: name });
	saveState(root, state);

	logSuccess(`Task "${name}" started`);

	const noExec = args.flags["no-exec"];
	const dryRun = args.flags["dry-run"];

	if (task.prompt && !noExec) {
		log(`Executing with ${task.executor || "default"}...`);

		const result = await executeTask(task, task.worktree, { dryRun });

		if (dryRun) {
			logInfo(`Would run: ${result.command}`);
			return;
		}

		if (result.success) {
			task.status = "done";
			task.completedAt = new Date().toISOString();
			addHistoryEntry(state, "task.done", { task: name });
			saveState(root, state);
			logSuccess(`Task "${name}" completed successfully`);
		} else {
			task.status = "failed";
			addHistoryEntry(state, "task.failed", {
				task: name,
				error: result.error,
			});
			saveState(root, state);
			logError(
				`Task "${name}" failed: ${result.error || `exit code ${result.exitCode}`}`,
			);
			process.exit(1);
		}
	} else if (!task.prompt) {
		logInfo("No prompt set — task is ready for manual work");
		log(`Worktree: ${task.worktree}`);
	}
}

function taskDone(args, root) {
	const name = args._[2];
	if (!name) {
		logError("Missing task name. Usage: ruah task done <name>");
		process.exit(1);
	}

	const state = loadState(root);
	const task = state.tasks[name];
	if (!task) {
		logError(`Task "${name}" not found`);
		process.exit(1);
	}
	if (task.status !== "in-progress") {
		logError(
			`Task "${name}" is ${task.status}, can only mark done from "in-progress"`,
		);
		process.exit(1);
	}

	// Show diff summary
	const diff = getWorktreeDiff(name, task.baseBranch, root);
	if (diff) {
		log("Changes:");
		console.log(diff);
	}

	task.status = "done";
	task.completedAt = new Date().toISOString();
	addHistoryEntry(state, "task.done", { task: name });
	saveState(root, state);

	logSuccess(`Task "${name}" marked as done`);
}

function taskMerge(args, root) {
	const name = args._[2];
	if (!name) {
		logError("Missing task name. Usage: ruah task merge <name>");
		process.exit(1);
	}

	const state = loadState(root);
	const task = state.tasks[name];
	if (!task) {
		logError(`Task "${name}" not found`);
		process.exit(1);
	}
	if (task.status !== "done") {
		logError(`Task "${name}" is ${task.status}, can only merge from "done"`);
		process.exit(1);
	}

	const dryRun = args.flags["dry-run"];
	const skipGates = args.flags["skip-gates"];

	if (dryRun) {
		const diff = getWorktreeDiff(name, task.baseBranch, root);
		log("Dry run — changes that would be merged:");
		console.log(diff || "  (no changes)");
		return;
	}

	// crag gate enforcement
	if (!skipGates) {
		const crag = detectCrag(root);
		if (crag.detected) {
			log("Running crag gates...");
			const governance = readCragGovernance(root);
			if (governance) {
				const gateResult = runGates(governance, task.worktree);
				for (const r of gateResult.results) {
					if (r.success) {
						logSuccess(
							`[${r.classification}] ${r.section || r.command}: passed`,
						);
					} else if (r.classification === "MANDATORY") {
						logError(`[MANDATORY] ${r.section || r.command}: FAILED`);
						logError(`Merge blocked. Fix the issue or use --skip-gates`);
						process.exit(1);
					} else if (r.classification === "OPTIONAL") {
						logWarn(
							`[OPTIONAL] ${r.section || r.command}: failed (continuing)`,
						);
					} else {
						logInfo(
							`[ADVISORY] ${r.section || r.command}: ${r.success ? "passed" : "failed"}`,
						);
					}
				}
				if (!gateResult.passed) {
					logError("Mandatory gate(s) failed. Merge blocked.");
					process.exit(1);
				}
				logSuccess("All mandatory gates passed");
			}
		}
	} else {
		logWarn("Skipping crag gates (--skip-gates)");
	}

	// Merge
	const result = mergeWorktree(name, task.baseBranch, root);

	if (result.success) {
		task.status = "merged";
		task.mergedAt = new Date().toISOString();
		releaseLocks(state, name);
		addHistoryEntry(state, "task.merged", { task: name });
		saveState(root, state);

		removeWorktree(name, root);
		logSuccess(`Task "${name}" merged into ${task.baseBranch}`);
	} else {
		logError("Merge conflicts detected:");
		for (const f of result.conflicts) {
			logWarn(`  ${f}`);
		}
		logInfo("Resolve conflicts manually, then run: ruah task merge <name>");
	}
}

function taskList(args, root) {
	const state = loadState(root);
	const json = args.flags.json;

	if (json) {
		console.log(JSON.stringify(state.tasks, null, 2));
		return;
	}

	log("Tasks:");
	console.log(formatTaskList(state.tasks));

	if (Object.keys(state.locks).length > 0) {
		console.log("");
		log("File locks:");
		console.log(formatLocks(state.locks));
	}
}

function taskCancel(args, root) {
	const name = args._[2];
	if (!name) {
		logError("Missing task name. Usage: ruah task cancel <name>");
		process.exit(1);
	}

	const state = loadState(root);
	const task = state.tasks[name];
	if (!task) {
		logError(`Task "${name}" not found`);
		process.exit(1);
	}
	if (task.status === "merged") {
		logError(`Task "${name}" is already merged, cannot cancel`);
		process.exit(1);
	}

	removeWorktree(name, root);
	releaseLocks(state, name);
	task.status = "cancelled";
	addHistoryEntry(state, "task.cancelled", { task: name });
	saveState(root, state);

	logSuccess(`Task "${name}" cancelled`);
}
