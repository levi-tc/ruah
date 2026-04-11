import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PACKAGE_NAME = "@ruah-dev/orch";

function resolveCliEntrypoint() {
	try {
		const packageJsonPath = require.resolve("@ruah-dev/cli/package.json");
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
		const bin = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.ruah;
		return resolve(dirname(packageJsonPath), bin ?? "dist/cli.js");
	} catch {
		return null;
	}
}

export function getGlobalBinDir(env = process.env, platform = process.platform) {
	const prefix = env.npm_config_prefix;
	if (!prefix) {
		return null;
	}
	return platform === "win32" ? prefix : join(prefix, "bin");
}

export function buildUnixLauncher(cliPath) {
	const escapedPath = cliPath.replace(/'/g, `'\"'\"'`);
	return `#!/usr/bin/env sh\nexec node '${escapedPath}' \"$@\"\n`;
}

function installGlobalLauncher() {
	if (
		process.env.npm_config_global !== "true" &&
		process.env.npm_config_location !== "global"
	) {
		return;
	}

	const cliPath = resolveCliEntrypoint();
	if (!cliPath) {
		console.warn(
			`[${PACKAGE_NAME}] Installed without @ruah-dev/cli. Install @ruah-dev/cli directly for the top-level \`ruah\` command.`,
		);
		return;
	}

	const binDir = getGlobalBinDir();
	if (!binDir) {
		console.warn(
			`[${PACKAGE_NAME}] Installed @ruah-dev/cli but could not determine the global bin directory. Reinstall @ruah-dev/cli directly if \`ruah\` is missing.`,
		);
		return;
	}

	const launcherPath = join(binDir, process.platform === "win32" ? "ruah.cmd" : "ruah");
	if (existsSync(launcherPath)) {
		return;
	}

	mkdirSync(binDir, { recursive: true });

	if (process.platform === "win32") {
		writeFileSync(launcherPath, `@ECHO OFF\r\nnode "${cliPath}" %*\r\n`, "utf8");
		return;
	}

	writeFileSync(launcherPath, buildUnixLauncher(cliPath), "utf8");
	chmodSync(launcherPath, 0o755);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
	installGlobalLauncher();
}
