import { randomBytes } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const MAX_HISTORY = 200;

function defaultState() {
	return {
		version: 1,
		baseBranch: "main",
		tasks: {},
		locks: {},
		history: [],
	};
}

export function ensureStateDir(root) {
	const ruahDir = join(root, ".ruah");
	mkdirSync(ruahDir, { recursive: true });
	mkdirSync(join(ruahDir, "worktrees"), { recursive: true });
	mkdirSync(join(ruahDir, "workflows"), { recursive: true });
	return ruahDir;
}

export function statePath(root) {
	return join(root, ".ruah", "state.json");
}

export function loadState(root) {
	const file = statePath(root);
	if (!existsSync(file)) {
		return defaultState();
	}
	const raw = readFileSync(file, "utf-8");
	return JSON.parse(raw);
}

export function saveState(root, state) {
	const file = statePath(root);
	mkdirSync(dirname(file), { recursive: true });
	const tmp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
	writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
	renameSync(tmp, file);
}

export function addHistoryEntry(state, action, details = {}) {
	state.history.push({
		timestamp: new Date().toISOString(),
		action,
		...details,
	});
	if (state.history.length > MAX_HISTORY) {
		state.history = state.history.slice(-MAX_HISTORY);
	}
}

export function acquireLocks(state, taskName, filePatterns, parentName) {
	if (!filePatterns || filePatterns.length === 0) {
		return { success: true, conflicts: [] };
	}

	// If this is a subtask, validate locks are within parent's scope
	if (parentName) {
		const parentLocks = state.locks[parentName];
		if (parentLocks && parentLocks.length > 0) {
			const outOfScope = [];
			for (const requested of filePatterns) {
				const withinParent = parentLocks.some((pl) =>
					patternsOverlap(pl, requested),
				);
				if (!withinParent) {
					outOfScope.push(requested);
				}
			}
			if (outOfScope.length > 0) {
				return {
					success: false,
					conflicts: outOfScope.map((p) => ({
						task: parentName,
						pattern: `parent scope: ${parentLocks.join(", ")}`,
						requested: p,
					})),
					outOfScope: true,
				};
			}
		}
	}

	const conflicts = [];
	for (const [owner, owned] of Object.entries(state.locks)) {
		if (owner === taskName) continue;
		// Subtasks of the same parent don't conflict with the parent itself
		if (parentName && owner === parentName) continue;
		// Sibling subtasks can conflict with each other
		for (const existing of owned) {
			for (const requested of filePatterns) {
				if (patternsOverlap(existing, requested)) {
					conflicts.push({ task: owner, pattern: existing, requested });
				}
			}
		}
	}

	if (conflicts.length > 0) {
		return { success: false, conflicts };
	}

	state.locks[taskName] = filePatterns;
	return { success: true, conflicts: [] };
}

export function getChildren(state, parentName) {
	return Object.values(state.tasks).filter((t) => t.parent === parentName);
}

export function getUnmergedChildren(state, parentName) {
	return getChildren(state, parentName).filter(
		(t) => t.status !== "merged" && t.status !== "cancelled",
	);
}

export function getTaskLineage(state, taskName) {
	const lineage = [];
	let current = taskName;
	while (current) {
		const task = state.tasks[current];
		if (!task) break;
		lineage.unshift(current);
		current = task.parent || null;
	}
	return lineage;
}

export function releaseLocks(state, taskName) {
	delete state.locks[taskName];
}

export function patternsOverlap(a, b) {
	if (a === b) return true;

	const normA = a.replace(/\/+$/, "");
	const normB = b.replace(/\/+$/, "");

	if (normA === normB) return true;

	// Remove trailing ** for prefix comparison
	const prefixA = normA.replace(/\/?\*\*$/, "");
	const prefixB = normB.replace(/\/?\*\*$/, "");

	const aIsGlob = normA.includes("*");
	const bIsGlob = normB.includes("*");

	// If both are glob patterns, check prefix overlap
	if (aIsGlob && bIsGlob) {
		return prefixA.startsWith(prefixB) || prefixB.startsWith(prefixA);
	}

	// One is a glob, the other is a specific path
	if (aIsGlob) {
		return matchGlob(normA, normB);
	}
	if (bIsGlob) {
		return matchGlob(normB, normA);
	}

	// Both are specific paths — check if one is a prefix of the other (directory containment)
	return normA.startsWith(`${normB}/`) || normB.startsWith(`${normA}/`);
}

function matchGlob(pattern, path) {
	// Handle ** (match any number of directories)
	if (pattern.endsWith("/**")) {
		const prefix = pattern.slice(0, -3);
		return path.startsWith(`${prefix}/`) || path === prefix;
	}

	// Handle * (single segment wildcard)
	const parts = pattern.split("*");
	if (parts.length === 2) {
		return path.startsWith(parts[0]) && path.endsWith(parts[1]);
	}

	// Prefix-based: if pattern prefix matches path prefix, consider overlap
	const prefix = pattern.replace(/\/?\*.*$/, "");
	return (
		path.startsWith(`${prefix}/`) ||
		path === prefix ||
		prefix.startsWith(`${path}/`)
	);
}
