import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

interface PackageJson {
	version?: string;
}

export interface TopLevelCliDetection {
	installed: boolean;
	version: string | null;
}

let cachedDetection: TopLevelCliDetection | null = null;

export function detectTopLevelCli(): TopLevelCliDetection {
	if (cachedDetection) {
		return cachedDetection;
	}

	try {
		const packageJsonPath = require.resolve("@ruah-dev/cli/package.json");
		const packageJson = JSON.parse(
			readFileSync(packageJsonPath, "utf8"),
		) as PackageJson;
		cachedDetection = {
			installed: true,
			version: packageJson.version ?? null,
		};
		return cachedDetection;
	} catch {
		cachedDetection = {
			installed: false,
			version: null,
		};
		return cachedDetection;
	}
}

export function getPreferredOrchCommand(): string {
	return detectTopLevelCli().installed ? "ruah" : "ruah-orch";
}

export function formatTopLevelCliNotice(): string {
	const detection = detectTopLevelCli();

	if (detection.installed) {
		const versionSuffix = detection.version ? ` v${detection.version}` : "";
		return `Top-level CLI detected${versionSuffix}. Preferred command: ruah`;
	}

	return "Top-level CLI not detected. Install @ruah-dev/cli for the top-level `ruah` command: npm install -g @ruah-dev/cli";
}

export function getUpdateInstallCommand(): string {
	return detectTopLevelCli().installed
		? "npm install -g @ruah-dev/cli"
		: "npm install -g @ruah-dev/orch";
}
