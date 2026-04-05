import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// --- crag Integration ---

const GOVERNANCE_PATHS = [".claude/governance.md", "governance.md"];

export function detectCrag(root) {
	for (const rel of GOVERNANCE_PATHS) {
		const abs = join(root, rel);
		if (existsSync(abs)) {
			return { detected: true, path: rel, absolute: abs };
		}
	}
	return { detected: false, path: null, absolute: null };
}

export function readCragGovernance(root) {
	const crag = detectCrag(root);
	if (!crag.detected) return null;

	const content = readFileSync(crag.absolute, "utf-8");
	return parseGovernance(content);
}

export function parseGovernance(content) {
	const gates = [];
	let inGates = false;
	let currentSection = null;
	let currentPath = null;

	for (const line of content.split("\n")) {
		// Detect ## Gates section
		if (/^##\s+Gates/i.test(line)) {
			inGates = true;
			continue;
		}

		// Exit gates section on next ## heading
		if (inGates && /^##\s+/.test(line) && !/^##\s+Gates/i.test(line)) {
			inGates = false;
			continue;
		}

		if (!inGates) continue;

		// Parse ### subsection with optional path
		const sectionMatch = line.match(/^###\s+(.+?)(?:\s*\(path:\s*(.+?)\))?$/);
		if (sectionMatch) {
			currentSection = sectionMatch[1].trim();
			currentPath = sectionMatch[2]?.trim() || null;
			continue;
		}

		// Parse gate command: - <command>  # [CLASSIFICATION]
		const gateMatch = line.match(/^-\s+(.+?)(?:\s+#\s*\[(\w+)\])?\s*$/);
		if (gateMatch) {
			const command = gateMatch[1].trim();
			const classification = (gateMatch[2] || "MANDATORY").toUpperCase();

			if (!["MANDATORY", "OPTIONAL", "ADVISORY"].includes(classification))
				continue;

			gates.push({
				command,
				classification,
				section: currentSection,
				path: currentPath,
			});
		}
	}

	return { gates };
}

export function buildGateCommands(governance, worktreePath) {
	if (!governance?.gates) return [];

	return governance.gates.map((gate) => ({
		command: gate.command,
		classification: gate.classification,
		section: gate.section,
		cwd: gate.path ? join(worktreePath, gate.path) : worktreePath,
	}));
}

export function runGates(governance, worktreePath) {
	const commands = buildGateCommands(governance, worktreePath);
	const results = [];
	let passed = true;

	for (const gate of commands) {
		try {
			execSync(gate.command, {
				cwd: gate.cwd,
				encoding: "utf-8",
				stdio: "pipe",
			});
			results.push({ ...gate, success: true });
		} catch (err) {
			const result = {
				...gate,
				success: false,
				error: err.stderr?.trim() || err.message,
			};
			results.push(result);

			if (gate.classification === "MANDATORY") {
				passed = false;
				return { passed, results, failedGate: result };
			}
			// OPTIONAL and ADVISORY: continue
		}
	}

	return { passed, results };
}

// --- arhy Integration ---

export function detectArhy(root) {
	try {
		const files = readdirSync(root).filter((f) => f.endsWith(".arhy"));
		if (files.length > 0) {
			return { detected: true, files: files.map((f) => join(root, f)) };
		}
	} catch {
		// ignore
	}
	return { detected: false, files: [] };
}

export function readArhyContract(filePath) {
	if (!existsSync(filePath)) return null;

	const content = readFileSync(filePath, "utf-8");
	return parseArhyContract(content);
}

export function parseArhyContract(content) {
	const entities = [];
	let current = null;

	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		// Entity definition
		const entityMatch = trimmed.match(/^entity\s+(\w+)\s*\{?\s*$/);
		if (entityMatch) {
			if (current) entities.push(current);
			current = { name: entityMatch[1], fields: [], actions: [], events: [] };
			continue;
		}

		// Closing brace
		if (trimmed === "}") {
			if (current) entities.push(current);
			current = null;
			continue;
		}

		if (!current) continue;

		// Action
		const actionMatch = trimmed.match(/^action\s+(\w+)/);
		if (actionMatch) {
			current.actions.push(actionMatch[1]);
			continue;
		}

		// Event
		const eventMatch = trimmed.match(/^event\s+(\w+)/);
		if (eventMatch) {
			current.events.push(eventMatch[1]);
			continue;
		}

		// Field (simple: name: type)
		const fieldMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
		if (fieldMatch) {
			current.fields.push({ name: fieldMatch[1], type: fieldMatch[2].trim() });
		}
	}

	if (current) entities.push(current);
	return { entities };
}

export function inferFileBoundaries(contract) {
	if (!contract?.entities) return {};

	const boundaries = {};
	for (const entity of contract.entities) {
		const lower = entity.name.toLowerCase();
		const plural = lower.endsWith("s") ? lower : `${lower}s`;
		boundaries[entity.name] = [
			`src/${lower}/**`,
			`src/${plural}/**`,
			`src/models/${lower}.*`,
			`src/controllers/${lower}.*`,
			`src/routes/${lower}.*`,
		];
	}
	return boundaries;
}
