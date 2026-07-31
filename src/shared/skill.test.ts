import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DocumentKind } from "./document";
import { skillDoc, skillName, TOOL_NAMES } from "./skill";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KINDS = Object.keys(TOOL_NAMES) as DocumentKind[];

describe("generated skill documents", () => {
  // The checked-in skills are generated output, not hand-maintained copies. If this fails,
  // regenerate them: `npm run cli -- install-skill --local --all --dir .claude/skills --force`.
  it.each(KINDS)("this repo's checked-in %s SKILL.md matches the generator", (kind) => {
    const path = resolve(REPO, ".claude", "skills", skillName(kind), "SKILL.md");
    expect(readFileSync(path, "utf8")).toBe(skillDoc(kind, { mode: "local" }));
  });

  // One generated file has to satisfy every host that reads SKILL.md — Claude Code, Cursor
  // (~/.cursor/skills, .cursor/skills) and the vendor-neutral .agents/skills. Cursor is the
  // strictest: `name` must be lowercase letters/numbers/hyphens AND match the parent folder,
  // and `description` is required. Keep the frontmatter inside that intersection.
  it.each(KINDS)("%s frontmatter satisfies every host's requirements", (kind) => {
    const doc = skillDoc(kind, { mode: "local" });
    const frontmatter = doc.split("---\n")[1];
    expect(doc.startsWith("---\n")).toBe(true);
    expect(frontmatter).toContain(`name: ${skillName(kind)}\n`);
    expect(skillName(kind)).toMatch(/^[a-z0-9-]+$/);
    expect(frontmatter).toMatch(/\ndescription: \S.*\n/);
    // Explicit invocation only — the human opens a review, the agent never decides to.
    // Same field name and meaning in Claude Code and Cursor.
    expect(frontmatter).toContain("disable-model-invocation: true\n");
  });

  it.each(KINDS)("an installed %s skill invokes the CLI, never the npm scripts", (kind) => {
    const doc = skillDoc(kind, {
      mode: "installed",
      command: "/opt/change-proposal/bin/tool.js",
      packageDir: "/opt/change-proposal",
    });
    expect(doc).not.toContain("npm run --silent");
    expect(doc).toContain("/opt/change-proposal/bin/tool.js author");
    expect(doc).toContain("/opt/change-proposal/bin/tool.js review");
    // Installed skills run from the agent's cwd, so the build hint must name the package dir.
    expect(doc).toContain("run `npm run build` once in `/opt/change-proposal`");
  });
});
