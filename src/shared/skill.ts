import type { DocumentKind } from "./document";

// The skill text is generated, not hand-maintained. Both faces' `SKILL.md` files — the ones
// checked into this repo's `.claude/skills/` and the ones `install-skill` writes into a user
// or project skills directory — come from here, so an installed skill can never drift from
// the repo's. The only thing that varies is how the skill invokes the tool: in-repo it goes
// through the npm scripts, installed it calls the CLI by name (or absolute path).

/** Per-kind command/skill/file names. The CLI's two faces reuse these. */
export const TOOL_NAMES: Record<DocumentKind, string> = {
  "change-proposal": "change-proposal",
  "architecture-description": "describe-architecture",
};

export const DEFAULT_FILES: Record<DocumentKind, string> = {
  "change-proposal": "proposal.json",
  "architecture-description": "architecture.json",
};

/** The npm script that fronts each face when working inside this repo. */
const NPM_SCRIPTS: Record<DocumentKind, string> = {
  "change-proposal": "npm run --silent cli --",
  "architecture-description": "npm run --silent describe --",
};

// One line each, for a human scanning the command list. There is no "use when…" clause:
// that text existed to help a model decide whether to invoke the skill, and these are
// invoked only by the human (see `disable-model-invocation` below).
const DESCRIPTIONS: Record<DocumentKind, string> = {
  "change-proposal":
    "Present a proposed change as an interactive review page instead of a markdown plan: per-section approval, comments, and answers routed back to the agent.",
  "architecture-description":
    "Present the current architecture, data model and state of a system as an interactive page, for the human to confirm or ask to clarify.",
};

/**
 * How an installed skill reaches the tool. `local` is the in-repo form (npm scripts, run
 * from the project root); `installed` calls `command` — a bin name on PATH or an absolute
 * path — from whatever directory the agent is working in.
 */
export type SkillTarget =
  | { mode: "local" }
  | { mode: "installed"; command: string; packageDir: string };

/** The `name:` slug of the skill for a kind — also its directory name. */
export function skillName(kind: DocumentKind): string {
  return TOOL_NAMES[kind];
}

/** The full `SKILL.md` text for a kind, wired to invoke the tool per `target`. */
export function skillDoc(kind: DocumentKind, target: SkillTarget): string {
  const run = (args: string) =>
    target.mode === "local" ? `${NPM_SCRIPTS[kind]} ${args}` : `${target.command} ${args}`;
  // In-repo the UI has to be built from the same checkout, so the review step says so.
  // Installed, the preamble already names the package directory to build in.
  const buildNote =
    target.mode === "local" ? " Needs `npm run build` once." : "";
  const body =
    kind === "change-proposal" ? proposalBody(run, buildNote) : describeBody(run, buildNote);
  return [
    "---",
    `name: ${skillName(kind)}`,
    `description: ${DESCRIPTIONS[kind]}`,
    // Explicit invocation only: the human types `/change-proposal`, the agent never decides
    // to open a review on its own. Both faces start a blocking server and take over the
    // human's browser, which is exactly the side-effecting case this field is for. Claude
    // Code and Cursor spell it the same way.
    "disable-model-invocation: true",
    "---",
    "",
    ...preamble(kind, target),
    "",
    ...body,
    "",
  ].join("\n");
}

function preamble(_kind: DocumentKind, target: SkillTarget): string[] {
  // The skill is a runbook: commands, order, and what the outcome means for what you do
  // next. It never restates the contract — step 1 fetches that, versioned, from the CLI.
  const shared = "Fetch the contract from the CLI (steps 1–2); never author from memory.";
  if (target.mode === "local") {
    return [
      shared,
      "Run from the project root, and keep `--silent` — npm's banner would corrupt the JSON.",
    ];
  }
  return [
    shared,
    `\`${target.command}\` runs from any directory; file arguments resolve against your cwd.`,
    `If it reports the UI is not built, run \`npm run build\` once in \`${target.packageDir}\`.`,
  ];
}

function proposalBody(run: (args: string) => string, buildNote: string): string[] {
  return [
    `1. **Contract:** run \`${run("author")}\` — the authoring guide for the installed`,
    "   version: the rules, the writing guidance, and a catalog of the blocks you can use.",
    "   Author against exactly that.",
    `2. **Block specs:** pick the blocks this proposal needs, then run`,
    `   \`${run("author --block <type>,<type>")}\` for their fields, examples and schema.`,
    "   Fetch only the ones you will use; never author a block from memory.",
    `3. **Write** \`proposal.json\`, then \`${run("validate proposal.json")}\` — it names`,
    "   every problem by path, so it is the check; you do not need the schema in front of you.",
    `   (\`${run("example proposal.json")}\` writes a sample to adapt.)`,
    `4. **Review:** run \`${run("review proposal.json")}\` — serves the UI, blocks`,
    `   until the human finalizes, then prints the result digest.${buildNote}`,
    "5. **Act on the OUTCOME first.** `approved` — the human agrees; go ahead with whatever this",
    "   proposal gated (implement, draft the full plan, run the migration — decide from its",
    "   content). `discuss` — do NOT go ahead; reply in `dialog` and send another round.",
    "   Per-section verdicts are detail beneath the outcome. Trust the digest over the raw JSON",
    `   (re-print it with \`${run("result proposal.json")}\`); read the file only for`,
    "   what the digest omits — `history`, or agent entries in `dialog`.",
    `6. **Iterate:** run \`${run("iterate proposal.json")}\` — archives the round,`,
    "   keeps `dialog`, bumps `round`. Never hand-edit the response yourself. Then revise, reply",
    '   with `author: "agent"` entries on sections you changed, and review again.',
  ];
}

function describeBody(run: (args: string) => string, buildNote: string): string[] {
  return [
    `1. **Contract:** run \`${run("author")}\` — the authoring guide for the installed`,
    "   version: the rules and a catalog of the blocks you can use. Author against exactly that.",
    "2. **Block specs:** pick the blocks this description needs, then run",
    `   \`${run("author --block <type>,<type>")}\` for their fields, examples and schema.`,
    "   Fetch only the ones you will use; never author a block from memory.",
    '3. **Write** `architecture.json` (`kind: "architecture-description"`) — what the system IS',
    "   today, in sections of blocks. Anything you could not verify from the code goes in",
    "   `questions`; do not assert it.",
    `   Then \`${run("validate architecture.json")}\` — it names every problem by path.`,
    `   (\`${run("example architecture.json")}\` writes a sample to adapt.)`,
    `4. **Present:** run \`${run("review architecture.json")}\` — serves the UI,`,
    `   blocks until the human finalizes, then prints the digest.${buildNote}`,
    "5. **Act on the OUTCOME first.** `understood` — the description is confirmed; treat it as",
    "   shared, human-verified context for what comes next. `clarify` — the sections marked",
    "   `needs-clarification` need work, and their `dialog` threads hold the human's actual",
    "   questions. Trust the digest over the raw JSON — re-print it with",
    `   \`${run("result architecture.json")}\`.`,
    `6. **Iterate:** run \`${run("iterate architecture.json")}\` — archives the`,
    "   round, keeps `dialog`, bumps `round`. Never hand-edit the response yourself. Then expand",
    '   the flagged sections, answer their threads with `author: "agent"` entries, and review',
    "   again.",
  ];
}
