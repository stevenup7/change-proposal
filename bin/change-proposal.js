#!/usr/bin/env node
// Dev launcher: runs the TypeScript CLI via this package's own tsx (no build step for
// the CLI itself). Resolving tsx from THIS package's node_modules — not `npx` in the
// caller's cwd — is what lets a globally-linked `change-proposal` work from any project
// directory. The caller's cwd is preserved so `review`/`validate <file>` resolve the
// proposal relative to where the user ran the command.
// For a published package this would point at a compiled dist/cli/index.js instead.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, "..", "src", "cli", "index.ts");
const tsxBin = resolve(here, "..", "node_modules", ".bin", "tsx");

if (!existsSync(tsxBin)) {
  console.error(`✗ tsx not found at ${tsxBin}. Run \`npm install\` in the change-proposal package.`);
  process.exit(1);
}

const res = spawnSync(tsxBin, [entry, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(res.status ?? 1);
