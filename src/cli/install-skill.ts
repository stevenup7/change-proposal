import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DocumentKind } from "../shared/document";
import { skillDoc, skillName, TOOL_NAMES, type SkillTarget } from "../shared/skill";

// `install-skill` copies the generated SKILL.md for one (or both) of the CLI's faces into an
// agent's skills directory, wired to invoke this package from anywhere. The skill text itself
// comes from src/shared/skill.ts — this file only decides *where* it goes and *how* the
// installed copy should call the tool.
//
// SKILL.md is a shared convention: Claude Code, Cursor and Codex all read a
// `<name>/SKILL.md` with `name` + `description` frontmatter, they just look in different
// directories. So one generated file serves every host; only the destination changes.

/** This package's root — the checkout that owns the bins and the built UI. */
export const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** A host agent's skills-directory convention. */
interface Host {
  /** Directory under the home dir (or the host's config-dir override) for user-level skills. */
  userDir: () => string;
  /** Path relative to a project root for project-level skills. */
  projectDir: string;
  /** What to tell the user to do so the host picks the skill up. */
  reload: string;
}

const HOSTS: Record<string, Host> = {
  claude: {
    // Claude Code relocates its whole config dir via CLAUDE_CONFIG_DIR; honour that.
    userDir: () => {
      const configDir = process.env.CLAUDE_CONFIG_DIR?.trim();
      const base = configDir ? resolve(process.cwd(), configDir) : join(homedir(), ".claude");
      return join(base, "skills");
    },
    projectDir: join(".claude", "skills"),
    reload: "Start a new Claude Code session (or /reload) to pick up the skill.",
  },
  cursor: {
    userDir: () => join(homedir(), ".cursor", "skills"),
    projectDir: join(".cursor", "skills"),
    reload: "Start a new Cursor agent session to pick up the skill.",
  },
  // Vendor-neutral path: Cursor and Codex both read `.agents/skills`. Claude Code does not.
  agents: {
    userDir: () => join(homedir(), ".agents", "skills"),
    projectDir: join(".agents", "skills"),
    reload: "Start a new agent session to pick up the skill.",
  },
};

const HOST_NAMES = Object.keys(HOSTS);

export interface InstallOptions {
  /** Comma-separated host agents whose convention to install for (default `claude`). */
  agent?: string;
  /** Install to the user-level skills dir. Default when no scope given. */
  user?: boolean;
  /** Install to the current project's skills dir. */
  project?: boolean;
  /** Install to an explicit skills directory (host conventions don't apply). */
  dir?: string;
  /** Install both faces' skills, not just this one. */
  all?: boolean;
  /** Command the installed skill should invoke (default: the bin name, or its absolute path). */
  command?: string;
  /** Emit the in-repo npm-script form (used to regenerate this repo's checked-in skills). */
  local?: boolean;
  /** Overwrite an existing SKILL.md whose content differs. */
  force?: boolean;
  /** Print what would be written instead of writing it. */
  print?: boolean;
}

type Outcome = "written" | "updated" | "unchanged" | "conflict";

interface Result {
  kind: DocumentKind;
  path: string;
  outcome: Outcome;
  reload: string;
}

export async function installSkill(kind: DocumentKind, opts: InstallOptions): Promise<void> {
  const kinds: DocumentKind[] = opts.all ? (Object.keys(TOOL_NAMES) as DocumentKind[]) : [kind];

  if (opts.print) {
    for (const k of kinds) {
      if (kinds.length > 1) console.log(`# ${skillName(k)}/SKILL.md\n`);
      process.stdout.write(skillDoc(k, targetFor(k, opts)));
      if (kinds.length > 1) console.log();
    }
    return;
  }

  const destinations = resolveDestinations(opts);
  const results: Result[] = [];
  for (const dest of destinations)
    for (const k of kinds)
      results.push(await write(k, dest, targetFor(k, opts), opts.force));

  for (const r of results) {
    const label = {
      written: "installed",
      updated: "updated",
      unchanged: "already current",
      conflict: "skipped",
    }[r.outcome];
    console.log(
      `${r.outcome === "conflict" ? "✗" : "✓"} ${skillName(r.kind)} — ${label}: ${r.path}`,
    );
  }

  const conflicts = results.filter((r) => r.outcome === "conflict");
  if (conflicts.length) {
    console.error(
      `\n✗ ${conflicts.length} skill file(s) already exist with different content. Re-run with --force to overwrite.`,
    );
    process.exit(1);
  }

  // The skill's `review` step needs the built SPA. Say so now rather than mid-review.
  if (!opts.local && !existsSync(resolve(PACKAGE_DIR, "dist", "web", "index.html"))) {
    console.log(
      `\n! UI not built — run \`npm run build\` in ${PACKAGE_DIR} before the first review.`,
    );
  }
  const fresh = results.filter((r) => r.outcome === "written" || r.outcome === "updated");
  if (fresh.length) {
    console.log();
    for (const reload of new Set(fresh.map((r) => r.reload))) console.log(reload);
  }
}

// --- helpers ----------------------------------------------------------------

interface Destination {
  dir: string;
  reload: string;
}

function resolveDestinations(opts: InstallOptions): Destination[] {
  const scopes = [opts.user && "--user", opts.project && "--project", opts.dir && "--dir"].filter(
    Boolean,
  );
  if (scopes.length > 1) {
    console.error(`✗ pick one target: ${scopes.join(", ")} are mutually exclusive.`);
    process.exit(1);
  }
  if (opts.dir) {
    if (opts.agent) {
      console.error("✗ --dir is an explicit path; drop --agent (it only picks a convention).");
      process.exit(1);
    }
    return [{ dir: resolve(process.cwd(), opts.dir), reload: "Reload your agent to pick up the skill." }];
  }
  return hostsFor(opts.agent).map((host) => ({
    dir: opts.project ? resolve(process.cwd(), host.projectDir) : host.userDir(),
    reload: host.reload,
  }));
}

function hostsFor(agent?: string): Host[] {
  const names = (agent ?? "claude")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const unknown = names.filter((n) => !HOSTS[n]);
  if (unknown.length) {
    console.error(
      `✗ unknown --agent value(s): ${unknown.join(", ")}. Known: ${HOST_NAMES.join(", ")}.`,
    );
    process.exit(1);
  }
  // Dedupe while keeping the order the user asked for.
  return [...new Set(names)].map((n) => HOSTS[n]);
}

function targetFor(kind: DocumentKind, opts: InstallOptions): SkillTarget {
  if (opts.local) return { mode: "local" };
  return {
    mode: "installed",
    command: opts.command?.trim() || defaultCommand(kind),
    packageDir: PACKAGE_DIR,
  };
}

/**
 * How the installed skill should call the tool: the bare bin name when it's on PATH (the
 * `npm link` / global-install case), otherwise the absolute path to this checkout's bin,
 * which always works. Quoted if the path contains spaces.
 */
function defaultCommand(kind: DocumentKind): string {
  const name = TOOL_NAMES[kind];
  if (onPath(name)) return name;
  const bin = resolve(PACKAGE_DIR, "bin", `${name}.js`);
  return bin.includes(" ") ? `"${bin}"` : bin;
}

function onPath(name: string): boolean {
  const entries = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  return entries.some((dir) => {
    const candidate = isAbsolute(dir) ? join(dir, name) : resolve(process.cwd(), dir, name);
    return existsSync(candidate);
  });
}

async function write(
  kind: DocumentKind,
  dest: Destination,
  target: SkillTarget,
  force?: boolean,
): Promise<Result> {
  const path = join(dest.dir, skillName(kind), "SKILL.md");
  const content = skillDoc(kind, target);
  if (existsSync(path)) {
    const existing = await readFile(path, "utf8");
    if (existing === content) return { kind, path, outcome: "unchanged", reload: dest.reload };
    if (!force) return { kind, path, outcome: "conflict", reload: dest.reload };
    await writeFile(path, content, "utf8");
    return { kind, path, outcome: "updated", reload: dest.reload };
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  return { kind, path, outcome: "written", reload: dest.reload };
}
