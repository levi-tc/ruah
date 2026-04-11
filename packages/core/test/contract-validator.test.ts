import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { validateContractChanges } from "../src/core/contract-validator.js";
import type { FileContract } from "../src/core/planner.js";

function tmpRepo(): string {
	const dir = join(tmpdir(), `ruah-contract-${randomBytes(4).toString("hex")}`);
	mkdirSync(dir, { recursive: true });
	execSync("git init -b main", { cwd: dir, stdio: "pipe" });
	execSync('git config user.email "test@test.com"', {
		cwd: dir,
		stdio: "pipe",
	});
	execSync('git config user.name "Test"', { cwd: dir, stdio: "pipe" });
	return dir;
}

function commitAll(repo: string, message: string): void {
	execSync("git add -A", { cwd: repo, stdio: "pipe" });
	execSync(`git commit -m "${message}"`, { cwd: repo, stdio: "pipe" });
}

describe("contract validation", () => {
	let repo: string;
	let contract: FileContract;

	beforeEach(() => {
		repo = tmpRepo();
		mkdirSync(join(repo, "src"), { recursive: true });
		writeFileSync(join(repo, "src", "owned.ts"), "export const owned = 1;\n");
		writeFileSync(
			join(repo, "src", "shared.ts"),
			"export const items = [];\n",
			"utf-8",
		);
		writeFileSync(
			join(repo, "src", "readonly.ts"),
			"export const locked = true;\n",
			"utf-8",
		);
		commitAll(repo, "init");
		execSync("git checkout -b ruah/test", { cwd: repo, stdio: "pipe" });

		contract = {
			taskName: "test",
			owned: ["src/owned.ts"],
			sharedAppend: ["src/shared.ts"],
			readOnly: ["src/readonly.ts"],
		};
	});

	afterEach(() => {
		rmSync(repo, { recursive: true, force: true });
	});

	it("allows append-only changes to shared files", () => {
		writeFileSync(
			join(repo, "src", "shared.ts"),
			"export const items = [];\nitems.push('x');\n",
			"utf-8",
		);

		const result = validateContractChanges(contract, repo, repo, "main");
		assert.ok(result.valid);
	});

	it("rejects edits to read-only files", () => {
		writeFileSync(
			join(repo, "src", "readonly.ts"),
			"export const locked = false;\n",
			"utf-8",
		);

		const result = validateContractChanges(contract, repo, repo, "main");
		assert.equal(result.valid, false);
		assert.equal(result.violations[0].type, "read-only");
	});

	it("rejects shared file insertions into existing content", () => {
		writeFileSync(
			join(repo, "src", "shared.ts"),
			"const prefix = true;\nexport const items = [];\n",
			"utf-8",
		);

		const result = validateContractChanges(contract, repo, repo, "main");
		assert.equal(result.valid, false);
		assert.equal(result.violations[0].type, "shared-append");
	});

	it("rejects files outside the contract", () => {
		writeFileSync(
			join(repo, "src", "unexpected.ts"),
			"export const surprise = true;\n",
			"utf-8",
		);

		const result = validateContractChanges(contract, repo, repo, "main");
		assert.equal(result.valid, false);
		assert.equal(result.violations[0].type, "outside-contract");
	});
});
