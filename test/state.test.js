import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	acquireLocks,
	addHistoryEntry,
	ensureStateDir,
	loadState,
	patternsOverlap,
	releaseLocks,
	saveState,
} from "../src/core/state.js";

function tmpRoot() {
	const dir = join(tmpdir(), `ruah-test-${randomBytes(4).toString("hex")}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

describe("state", () => {
	let root;

	beforeEach(() => {
		root = tmpRoot();
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("loadState returns default when no file exists", () => {
		const state = loadState(root);
		assert.equal(state.version, 1);
		assert.equal(state.baseBranch, "main");
		assert.deepEqual(state.tasks, {});
		assert.deepEqual(state.locks, {});
		assert.deepEqual(state.history, []);
	});

	it("saveState writes valid JSON and loadState reads it back", () => {
		const state = loadState(root);
		state.baseBranch = "develop";
		state.tasks.foo = { name: "foo", status: "created" };
		saveState(root, state);

		const loaded = loadState(root);
		assert.equal(loaded.baseBranch, "develop");
		assert.equal(loaded.tasks.foo.name, "foo");
	});

	it("ensureStateDir creates .ruah directory structure", () => {
		ensureStateDir(root);
		assert.ok(existsSync(join(root, ".ruah")));
		assert.ok(existsSync(join(root, ".ruah", "worktrees")));
		assert.ok(existsSync(join(root, ".ruah", "workflows")));
	});

	it("addHistoryEntry appends entries", () => {
		const state = loadState(root);
		addHistoryEntry(state, "task.created", { task: "auth" });
		assert.equal(state.history.length, 1);
		assert.equal(state.history[0].action, "task.created");
		assert.equal(state.history[0].task, "auth");
		assert.ok(state.history[0].timestamp);
	});

	it("addHistoryEntry caps at 200 entries", () => {
		const state = loadState(root);
		for (let i = 0; i < 250; i++) {
			addHistoryEntry(state, `action.${i}`, { i });
		}
		assert.equal(state.history.length, 200);
		// Should keep the most recent
		assert.equal(state.history[199].action, "action.249");
	});
});

describe("file locks", () => {
	it("acquireLocks succeeds with no conflicts", () => {
		const state = { locks: {} };
		const result = acquireLocks(state, "auth", ["src/auth/**"]);
		assert.ok(result.success);
		assert.deepEqual(state.locks.auth, ["src/auth/**"]);
	});

	it("acquireLocks detects overlapping patterns", () => {
		const state = { locks: { auth: ["src/auth/**"] } };
		const result = acquireLocks(state, "api", ["src/auth/**"]);
		assert.ok(!result.success);
		assert.equal(result.conflicts.length, 1);
		assert.equal(result.conflicts[0].task, "auth");
	});

	it("acquireLocks allows non-overlapping patterns", () => {
		const state = { locks: { auth: ["src/auth/**"] } };
		const result = acquireLocks(state, "api", ["src/api/**"]);
		assert.ok(result.success);
	});

	it("acquireLocks succeeds with empty patterns", () => {
		const state = { locks: { auth: ["src/auth/**"] } };
		const result = acquireLocks(state, "api", []);
		assert.ok(result.success);
	});

	it("releaseLocks removes lock entry", () => {
		const state = { locks: { auth: ["src/auth/**"], api: ["src/api/**"] } };
		releaseLocks(state, "auth");
		assert.ok(!state.locks.auth);
		assert.ok(state.locks.api);
	});
});

describe("patternsOverlap", () => {
	it("exact match", () => {
		assert.ok(patternsOverlap("src/auth/**", "src/auth/**"));
	});

	it("one is prefix of another with **", () => {
		assert.ok(patternsOverlap("src/**", "src/auth/**"));
		assert.ok(patternsOverlap("src/auth/**", "src/**"));
	});

	it("non-overlapping directories", () => {
		assert.ok(!patternsOverlap("src/auth/**", "src/api/**"));
	});

	it("specific file vs directory glob", () => {
		assert.ok(patternsOverlap("src/auth/**", "src/auth/login.js"));
	});

	it("completely different paths", () => {
		assert.ok(!patternsOverlap("src/auth/**", "tests/api/**"));
	});

	it("same string", () => {
		assert.ok(patternsOverlap("src/file.js", "src/file.js"));
	});
});
