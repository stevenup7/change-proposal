#!/usr/bin/env node
// Dev launcher: runs the TypeScript CLI via tsx (no build step for the CLI itself).
// For a published package this would point at a compiled dist/cli/index.js instead.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, "..", "src", "cli", "index.ts");
const res = spawnSync("npx", ["tsx", entry, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(res.status ?? 1);
