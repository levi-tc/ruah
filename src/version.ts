import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface PackageMetadata {
	version?: string;
}

function findPackageVersion(): string {
	let current = dirname(fileURLToPath(import.meta.url));

	while (true) {
		const candidate = join(current, "package.json");
		if (existsSync(candidate)) {
			const metadata = JSON.parse(
				readFileSync(candidate, "utf-8"),
			) as PackageMetadata;
			if (metadata.version) {
				return metadata.version;
			}
		}

		const parent = dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}

	throw new Error("Unable to locate package.json for ruah version lookup");
}

export const VERSION = findPackageVersion();
