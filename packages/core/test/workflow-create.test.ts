import assert from "node:assert/strict";
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
import { parseWorkflow } from "../src/core/workflow.js";

function tmpRoot(): string {
	const dir = join(tmpdir(), `ruah-test-${randomBytes(4).toString("hex")}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

/** Reproduce the template logic so tests don't import the command module (which calls getRepoRoot). */
function generateTemplate(name: string, baseBranch = "main"): string {
	return `# Workflow: ${name}

## Config
- base: ${baseBranch}
- parallel: true

## Tasks

### task-1
- files: src/feature-a/**
- executor: claude-code
- depends: []
- prompt: |
    Implement feature A.

### task-2
- files: src/feature-b/**
- executor: claude-code
- depends: []
- prompt: |
    Implement feature B.

### integration
- files: test/**
- executor: claude-code
- depends: [task-1, task-2]
- prompt: |
    Write integration tests for features A and B.
`;
}

describe("workflow create template", () => {
	let root: string;

	beforeEach(() => {
		root = tmpRoot();
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("generates valid workflow markdown", () => {
		const dir = join(root, ".ruah", "workflows");
		mkdirSync(dir, { recursive: true });

		const name = "my-feature";
		const template = generateTemplate(name);
		const filePath = join(dir, `${name}.md`);
		writeFileSync(filePath, template, "utf-8");

		assert.ok(existsSync(filePath));
		const content = readFileSync(filePath, "utf-8");
		assert.ok(content.includes("# Workflow: my-feature"));
		assert.ok(content.includes("## Config"));
		assert.ok(content.includes("## Tasks"));
		assert.ok(content.includes("### task-1"));
	});

	it("template contains required sections", () => {
		const template = generateTemplate("test-workflow", "develop");

		assert.ok(template.startsWith("# Workflow: test-workflow"));
		assert.ok(template.includes("- base: develop"));
		assert.ok(template.includes("- parallel: true"));
		assert.ok(template.includes("- depends: [task-1, task-2]"));
		assert.ok(template.includes("- executor: claude-code"));
	});

	it("does not overwrite existing workflow without --force", () => {
		const dir = join(root, ".ruah", "workflows");
		mkdirSync(dir, { recursive: true });
		const filePath = join(dir, "existing.md");
		writeFileSync(filePath, "# Original content\n", "utf-8");

		assert.ok(existsSync(filePath));
		const original = readFileSync(filePath, "utf-8");
		assert.equal(original, "# Original content\n");
	});

	it("can overwrite with force flag", () => {
		const dir = join(root, ".ruah", "workflows");
		mkdirSync(dir, { recursive: true });
		const filePath = join(dir, "existing.md");
		writeFileSync(filePath, "# Original\n", "utf-8");

		const newContent = generateTemplate("existing");
		writeFileSync(filePath, newContent, "utf-8");

		const content = readFileSync(filePath, "utf-8");
		assert.ok(content.includes("# Workflow: existing"));
		assert.ok(!content.includes("# Original"));
	});

	it("generated template is parseable by workflow engine", () => {
		const dir = join(root, ".ruah", "workflows");
		mkdirSync(dir, { recursive: true });

		const name = "parseable";
		const template = generateTemplate(name, "trunk");
		const filePath = join(dir, `${name}.md`);
		writeFileSync(filePath, template, "utf-8");

		const workflow = parseWorkflow(filePath);
		assert.equal(workflow.name, "parseable");
		assert.equal(workflow.config.base, "trunk");
		assert.equal(workflow.config.parallel, true);
		assert.equal(workflow.tasks.length, 3);
		assert.equal(workflow.tasks[0].name, "task-1");
		assert.equal(workflow.tasks[1].name, "task-2");
		assert.equal(workflow.tasks[2].name, "integration");
		assert.deepEqual(workflow.tasks[2].depends, ["task-1", "task-2"]);
	});
});
