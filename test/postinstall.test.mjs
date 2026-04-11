import assert from "node:assert/strict";
import { test } from "node:test";
import { buildUnixLauncher, getGlobalBinDir } from "../postinstall.mjs";

test("getGlobalBinDir resolves unix global bins", () => {
	assert.equal(
		getGlobalBinDir(
			{ npm_config_prefix: "/tmp/ruah", npm_config_global: "true" },
			"darwin",
		),
		"/tmp/ruah/bin",
	);
});

test("buildUnixLauncher delegates to node", () => {
	const launcher = buildUnixLauncher("/tmp/ruah cli/dist/cli.js");
	assert.match(launcher, /exec node '/);
	assert.match(launcher, /dist\/cli\.js/);
});
