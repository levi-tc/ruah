import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ParsedArgs } from "../cli.js";

const NO_COLOR = process.env.NO_COLOR !== undefined;

function c(color: string, text: string): string {
	if (NO_COLOR) return text;
	const codes: Record<string, string> = {
		reset: "\x1b[0m",
		bold: "\x1b[1m",
		dim: "\x1b[2m",
		cyan: "\x1b[36m",
		green: "\x1b[32m",
		red: "\x1b[31m",
		yellow: "\x1b[33m",
		blue: "\x1b[34m",
		magenta: "\x1b[35m",
		white: "\x1b[37m",
		bgRed: "\x1b[41m",
		bgGreen: "\x1b[42m",
	};
	return `${codes[color] ?? ""}${text}${codes.reset}`;
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function line(text = ""): void {
	console.log(text);
}

function step(text: string): void {
	console.log(`  ${c("cyan", "→")} ${text}`);
}

function ok(text: string): void {
	console.log(`  ${c("green", "✓")} ${text}`);
}

function dim(text: string): string {
	return c("dim", text);
}

function box(lines: string[], { width = 58 } = {}): void {
	const top = `  ┌${"─".repeat(width - 2)}┐`;
	const bot = `  └${"─".repeat(width - 2)}┘`;
	console.log(top);
	for (const l of lines) {
		console.log(`  │ ${l}`);
	}
	console.log(bot);
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping requires matching ESC control char
const ANSI_RE = /\x1b\[[0-9;]*m/g;

// Pad visible text to fixed width inside box (accounts for ANSI codes)
function pad(text: string, w: number): string {
	// Strip ANSI to measure visible length
	const visible = text.replace(ANSI_RE, "");
	const diff = w - visible.length;
	return diff > 0 ? `${text}${" ".repeat(diff)}` : text;
}

const W = 56; // inner width of box (58 - 2 for borders)

export async function run(_args: ParsedArgs): Promise<void> {
	const fast = _args.flags.fast === true;
	const delay = fast ? 0 : 120;

	line();
	line(
		`  ${c("bold", c("cyan", "ruah"))} ${dim("— multi-agent orchestration")}`,
	);
	line();

	// ── The Problem ────────────────────────────────────────
	line(`  ${c("bold", "The problem:")} two AI agents edit the same file`);
	line(`  ${dim("→ merge conflict, lost work, broken code")}`);
	line();
	line(
		`  ${c("bold", "The fix:")} each agent gets its own worktree + file lock`,
	);
	line(`  ${dim("→ zero interference, clean merges, parallel speed")}`);
	line();

	await sleep(delay * 3);

	// ── Setup ──────────────────────────────────────────────
	step("Setting up demo repo...");
	const dir = join(tmpdir(), `ruah-demo-${randomBytes(4).toString("hex")}`);
	mkdirSync(dir, { recursive: true });

	try {
		execSync("git init", { cwd: dir, stdio: "pipe" });
		execSync('git config user.email "demo@ruah.dev"', {
			cwd: dir,
			stdio: "pipe",
		});
		execSync('git config user.name "ruah demo"', {
			cwd: dir,
			stdio: "pipe",
		});

		// Create realistic file structure
		for (const f of [
			"src/auth/login.ts",
			"src/auth/session.ts",
			"src/ui/dashboard.tsx",
			"src/ui/sidebar.tsx",
			"tests/auth.test.ts",
			"tests/ui.test.ts",
		]) {
			mkdirSync(join(dir, f, ".."), { recursive: true });
			writeFileSync(join(dir, f), `// ${f}\n`, "utf-8");
		}
		execSync('git add . && git commit -m "init"', {
			cwd: dir,
			stdio: "pipe",
		});

		ok("Demo repo ready");
		line();
		await sleep(delay * 2);

		// ── Create Tasks ─────────────────────────────────────
		step("Creating 3 parallel tasks with file locks...");
		line();
		await sleep(delay);

		const tasks = [
			{
				name: "auth-api",
				files: "src/auth/**",
				executor: "claude-code",
				color: "cyan",
			},
			{
				name: "dashboard-ui",
				files: "src/ui/**",
				executor: "aider",
				color: "green",
			},
			{
				name: "test-suite",
				files: "tests/**",
				executor: "codex",
				color: "magenta",
			},
		];

		const boxLines: string[] = [];
		for (const t of tasks) {
			const taskStr = c("bold", t.name.padEnd(14));
			const filesStr = dim(t.files.padEnd(14));
			const lockStr = c("yellow", "🔒 locked");
			const exStr = dim(`(${t.executor})`);
			boxLines.push(
				pad(`${c("green", "✓")} ${taskStr} ${filesStr} ${lockStr} ${exStr}`, W),
			);
		}
		boxLines.push(pad("", W));
		boxLines.push(
			pad(`${dim("Each task → own git worktree → zero interference")}`, W),
		);

		box(boxLines);
		line();
		await sleep(delay * 3);

		// ── Conflict Detection ───────────────────────────────
		step("What if a 4th agent tries to touch locked files?");
		line();
		await sleep(delay * 2);

		const conflictLines: string[] = [];
		conflictLines.push(
			pad(
				`${c("red", "✗")} ${c("bold", "api-v2")}         src/auth/**  ${c("red", "BLOCKED")}`,
				W,
			),
		);
		conflictLines.push(
			pad(
				`  ${dim("↳ conflicts with")} ${c("cyan", "auth-api")}${dim("'s lock")}`,
				W,
			),
		);
		conflictLines.push(pad("", W));
		conflictLines.push(
			pad(dim("File locks catch conflicts before agents start."), W),
		);

		box(conflictLines);
		line();
		await sleep(delay * 3);

		// ── Workflow DAG ─────────────────────────────────────
		step("Defining a workflow DAG...");
		line();
		await sleep(delay * 2);

		const dagLines: string[] = [];
		dagLines.push(pad(c("bold", "Workflow: new-feature"), W));
		dagLines.push(pad("", W));
		dagLines.push(pad(`  ${c("cyan", "auth-api")}    ──┐`, W));
		dagLines.push(
			pad(`                   ├──→  ${c("magenta", "test-suite")}`, W),
		);
		dagLines.push(pad(`  ${c("green", "dashboard-ui")} ──┘`, W));
		dagLines.push(pad("", W));
		dagLines.push(
			pad(
				`  ${c("bold", "Stage 1")} ${dim("(parallel)")}  auth-api, dashboard-ui`,
				W,
			),
		);
		dagLines.push(
			pad(
				`  ${c("bold", "Stage 2")} ${dim("(sequential)")} test-suite ${dim("→ after both")}`,
				W,
			),
		);
		dagLines.push(pad("", W));
		dagLines.push(pad(dim("Define in markdown. ruah handles the rest."), W));

		box(dagLines);
		line();
		await sleep(delay * 2);

		// ── Real Commands ────────────────────────────────────
		line(`  ${c("bold", "Try it yourself:")}`);
		line();
		line(`    ${c("cyan", "$")} npx @levi-tc/ruah init`);
		line(`    ${c("cyan", "$")} npx @levi-tc/ruah task create auth \\`);
		line(`        --files "src/auth/**" --executor claude-code`);
		line(`    ${c("cyan", "$")} npx @levi-tc/ruah workflow run feature.md`);
		line();

		// ── Cleanup ──────────────────────────────────────────
		rmSync(dir, { recursive: true, force: true });
		ok(`Demo repo cleaned up ${dim(`(was ${dir})`)}`);
		line();
	} catch (err) {
		// Always clean up
		if (existsSync(dir)) {
			rmSync(dir, { recursive: true, force: true });
		}
		throw err;
	}
}
