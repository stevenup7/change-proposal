#!/usr/bin/env node
// Dev launcher for the describe-architecture face of the CLI — same mechanics as
// bin/change-proposal.js (resolve tsx from THIS package so a globally-linked bin
// works from any directory), pointed at the describe entry.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, "..", "src", "cli", "describe.ts");
const tsxBin = resolve(here, "..", "node_modules", ".bin", "tsx");

if (!existsSync(tsxBin)) {
  console.error(`✗ tsx not found at ${tsxBin}. Run \`npm install\` in the change-proposal package.`);
  process.exit(1);
}

const res = spawnSync(tsxBin, [entry, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(res.status ?? 1);
