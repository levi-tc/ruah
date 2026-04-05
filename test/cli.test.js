import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const CLI = join(import.meta.dirname, "..", "src", "cli.js");

function ruah(args, cwd) {
	try {
		return execSync(`node "${CLI}" ${args}`, {
			cwd,
			encoding: "utf-8",
			stdio: "pipe",
			env: { ...process.env, NO_COLOR: "1" },
		});
	} catch (err) {
		return err.stdout + err.stderr;
	}
}

function tmpGitRepo() {
	const dir = join(tmpdir(), `ruah-cli-${randomBytes(4).toString("hex")}`);
	mkdirSync(dir, { recursive: true });
	execSync("git init", { cwd: dir, stdio: "pipe" });
	execSync('git config user.email "test@test.com"', {
		cwd: dir,
		stdio: "pipe",
	});
	execSync('git config user.name "Test"', { cwd: dir, stdio: "pipe" });
	writeFileSync(join(dir, "README.md"), "hello", "utf-8");
	execSync('git add . && git commit -m "init"', { cwd: dir, stdio: "pipe" });
	return dir;
}

describe("CLI integration", () => {
	let repo;

	beforeEach(() => {
		repo = tmpGitRepo();
	});

	afterEach(() => {
		try {
			execSync("git worktree prune", { cwd: repo, stdio: "pipe" });
		} catch {}
		rmSync(repo, { recursive: true, force: true });
	});

	it("--help prints usage", () => {
		const out = ruah("--help", repo);
		assert.ok(out.includes("multi-agent orchestration"));
		assert.ok(out.includes("ruah init"));
	});

	it("--version prints version", () => {
		const out = ruah("--version", repo);
		assert.ok(out.includes("ruah 0.1.0"));
	});

	it("init creates .ruah directory structure", () => {
		const out = ruah("init", repo);
		assert.ok(out.includes("initialized"));
		assert.ok(existsSync(join(repo, ".ruah", "state.json")));
		assert.ok(existsSync(join(repo, ".ruah", "worktrees")));
		assert.ok(
			existsSync(join(repo, ".ruah", "workflows", "example-feature.md")),
		);
	});

	it("init detects crag when governance.md present", () => {
		mkdirSync(join(repo, ".claude"), { recursive: true });
		writeFileSync(
			join(repo, ".claude", "governance.md"),
			"# Gov\n## Gates\n### Test\n- echo pass  # [MANDATORY]",
			"utf-8",
		);
		const out = ruah("init", repo);
		assert.ok(out.includes("crag detected"));
	});

	it("task create creates worktree and sets locks", () => {
		ruah("init", repo);
		const out = ruah(
			'task create auth --files "src/auth/**" --executor claude-code',
			repo,
		);
		assert.ok(out.includes('Task "auth" created'));
		assert.ok(out.includes("ruah/auth"));

		const state = JSON.parse(
			readFileSync(join(repo, ".ruah", "state.json"), "utf-8"),
		);
		assert.ok(state.tasks.auth);
		assert.deepEqual(state.locks.auth, ["src/auth/**"]);
	});

	it("task create rejects conflicting file locks", () => {
		ruah("init", repo);
		ruah('task create a --files "src/auth/**"', repo);
		const out = ruah('task create b --files "src/auth/**"', repo);
		assert.ok(out.includes("lock conflict") || out.includes("overlaps"));
	});

	it("task list --json outputs valid JSON", () => {
		ruah("init", repo);
		ruah('task create test --files "src/**"', repo);
		const out = ruah("task list --json", repo);
		const parsed = JSON.parse(out);
		assert.ok(parsed.test);
		assert.equal(parsed.test.name, "test");
	});

	it("status --json outputs valid JSON with cragDetected", () => {
		ruah("init", repo);
		const out = ruah("status --json", repo);
		const parsed = JSON.parse(out);
		assert.equal(typeof parsed.cragDetected, "boolean");
		assert.ok(parsed.baseBranch);
		assert.ok(parsed.taskCounts);
	});

	it("task cancel cleans up worktree and locks", () => {
		ruah("init", repo);
		ruah('task create cancel-me --files "src/x/**"', repo);
		const out = ruah("task cancel cancel-me", repo);
		assert.ok(out.includes("cancelled"));

		const state = JSON.parse(
			readFileSync(join(repo, ".ruah", "state.json"), "utf-8"),
		);
		assert.equal(state.tasks["cancel-me"].status, "cancelled");
		assert.ok(!state.locks["cancel-me"]);
	});

	it("full lifecycle: create → start → done → merge", () => {
		ruah("init", repo);
		ruah('task create lifecycle --files "src/**"', repo);
		ruah("task start lifecycle --no-exec", repo);
		ruah("task done lifecycle", repo);
		const out = ruah("task merge lifecycle", repo);
		assert.ok(out.includes("merged"));

		const state = JSON.parse(
			readFileSync(join(repo, ".ruah", "state.json"), "utf-8"),
		);
		assert.equal(state.tasks.lifecycle.status, "merged");
	});
});
