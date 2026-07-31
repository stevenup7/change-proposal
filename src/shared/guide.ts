import { zodToJsonSchema } from "zod-to-json-schema";
import { documentSchema } from "./document";
import { blockCatalog, blockDefFor, blockGuide } from "./blocks/registry";
import { VERSION } from "./version";

/** The JSON Schema the agent should author against (and the CLI validates against). */
export function jsonSchema(): object {
  return zodToJsonSchema(documentSchema, { name: "ChangeProposalDocument" });
}

// Progressive disclosure: the guide is what the agent always needs, and the block
// catalog names what exists. The per-block spec — guide, JSON example, schema fragment —
// is fetched only for the blocks a given document actually uses (`author --block`).
// Authoring the whole nine-block contract up front cost ~13k tokens, most of it schema
// for blocks the document never contains.

/** The spec for named blocks: authoring guidance plus that block's schema fragment. */
export function blockSpec(types: string[]): string {
  return types
    .map((type) => {
      const def = blockDefFor(type);
      return [
        def.guide,
        "",
        `#### \`${type}\` schema`,
        "```json",
        JSON.stringify(zodToJsonSchema(def.schema), null, 2),
        "```",
      ].join("\n");
    })
    .join("\n\n");
}

/** The `## Blocks` section: a catalog plus how to fetch a block's spec. */
function blocksSection(tool: string, full: boolean): string[] {
  if (full) return ["## Blocks", blockGuide()];
  return [
    "## Blocks",
    "A section's `blocks` are its content, rendered in order. These exist:",
    "",
    blockCatalog(),
    "",
    "Before you author a block, fetch its spec — fields, rules, a JSON example and its",
    `schema fragment — with \`${tool} author --block <type>[,<type>]\`. Fetch only the`,
    "blocks this document will use, and never author one from memory.",
  ];
}

/** How the agent gets the rest of the contract when it wants it. */
function schemaSection(tool: string, full: boolean): string[] {
  if (full) return ["## JSON Schema", "```json", JSON.stringify(jsonSchema(), null, 2), "```"];
  return [
    "## The rest of the contract",
    `- \`${tool} author --block <type>\` — a block's spec (above).`,
    `- \`${tool} validate <file>\` — checks the whole document against the schema and`,
    "  names every problem by path. Run it before `review`; it is the check, so you do not",
    "  need the schema in front of you to author.",
    `- \`${tool} author --schema\` — the full JSON Schema, if you want it anyway.`,
    `- \`${tool} author --full\` — this guide with every block spec and the schema inline.`,
  ];
}

/**
 * The full authoring guide emitted by `change-proposal author`. This is the versioned
 * contract — the thin skill fetches it at runtime, so it can never drift from the tool.
 */
export function authoringGuide(full = false): string {
  return [
    `# Change Proposal — authoring guide (v${VERSION})`,
    "",
    '(For describing the CURRENT state of a system instead of proposing a change, use the sibling tool `describe-architecture` — same file format, `kind: "architecture-description"`.)',
    "",
    "You are producing a `proposal.json` for a human to review interactively instead of",
    "reading a markdown plan. Break the change into sections the human can approve one by one.",
    "",
    "## Writing it — level of detail and language",
    "The reviewer is the product owner, not the code's author. Every line either helps them",
    "decide something or wastes their attention.",
    "",
    "- **Every section must carry a decision.** Name that decision before you write the",
    "  section. If no answer the reviewer could give would change what you do, it is context",
    "  inside another section, not a section of its own. Sections that can only be approved",
    "  are documentation, not a proposal. Most changes fit in 3–7 sections.",
    "- **Don't ask about what the project has already decided.** What its rules mandate",
    "  (CLAUDE.md, AGENTS.md, specs, lint config) is not reviewable — cite it in one line where",
    "  a section depends on it. If reviewers see things they cannot change, they start skimming.",
    "- **Give the most detail where a mistake costs the most.** Migrations, API contracts, data",
    "  handling and security get the diffs, diagrams and tables. Internals that are easy to",
    "  change later get a summary line.",
    "- **Put decisions where the reviewer can answer them.** A decision buried in a paragraph",
    "  gets skimmed past; a `conflict` field or a choice question with trade-off notes gets",
    "  answered.",
    "- **Plain words, in the reviewer's terms** — \"Fix: importing from Google Tasks overwrites",
    "  your local edits\", not \"3-way merge refactor\". Write each `summary` for someone who never",
    "  expands the card; open each body with what it means for them, evidence after.",
    "- **Trim before sending.** Fifteen test names tell the reviewer nothing; \"placement core",
    "  is pure; golden tests cover contention, pins, DST\" tells them what matters. Cut the",
    "  block you are least sure about, then re-validate.",
    "",
    "## Rules",
    `- Set \`version\` to exactly \`"${VERSION}"\`. A mismatch is rejected (no fallbacks).`,
    "- Set `status` to `\"pending\"` and `round` to `1` for a first review.",
    "- Leave `response` empty (or omit it) — the human fills it in.",
    "- Author the `proposal` region only. It is read-only to the human.",
    "- The schema is strict: no extra keys, and every block `type` must be a known block.",
    "",
    "## Document shape",
    "```",
    "{",
    '  "version": "' + VERSION + '",',
    '  "status": "pending",',
    '  "round": 1,',
    '  "proposal": {',
    '    "title": "Fix: importing from Google Tasks overwrites your local edits",',
    '    "description": "One-paragraph summary (Markdown).",',
    '    "sections": [ /* see below */ ],',
    '    "questions": [ /* optional */ ]',
    "  }",
    "}",
    "```",
    "",
    "## Sections",
    "Each section is a card the human approves/rejects/comments on. Author-defined — use",
    "whatever sections fit the change (schema, logic, code, api, tests, docs, rollout, …).",
    "- `id`: stable unique string.",
    "- `title`: short heading.",
    "- `badge`: optional short label, e.g. `DB`, `API`.",
    "- `accent`: `blue | green | red | amber | violet | neutral` — styling only.",
    "- `summary`: optional one-line summary.",
    "- `blocks`: ordered content blocks (below).",
    "",
    ...blocksSection("change-proposal", full),
    "",
    "## Questions (optional)",
    "Ask the human for decisions. `kind: 'choice'` with `options: [{id,label}]` (set",
    "`allowOther: true` to offer a write-in), or `kind: 'text'` for free-form answers.",
    "",
    "## Dialog (the per-section conversation)",
    "`dialog` is a shared, cross-round thread keyed by section id. The human appends notes",
    "via the UI; you append replies by adding entries with `author: \"agent\"`. Entries carry",
    "the `round` they were written in and are never wiped — a section reads as one",
    "conversation across the whole review. Leave `dialog: {}` on a first-round proposal.",
    "",
    "## Iterating (round 2+)",
    "Don't hand-reset the response. Run `change-proposal iterate <file>` — it archives the",
    "current `response` into `history`, resets the live response, keeps the `dialog`, and",
    "bumps `round`. Then revise the `proposal`, optionally add `author: \"agent\"` dialog",
    "replies to sections you changed, and run `review` again.",
    "",
    "## Reading the result",
    "`review` prints a digest when it returns; `change-proposal result <file>` re-prints it.",
    "It joins every id back to its label — prefer it to the raw JSON.",
    "",
    "On finalize, `status` becomes `finalized`. Read `response.outcome` FIRST; per-section",
    "verdicts are detail beneath it.",
    "- `\"approved\"` → go ahead with whatever THIS proposal gated. Not automatically \"write",
    "  code now\" — it may mean draft the full plan, run the migration. Decide from the",
    "  proposal's content.",
    "- `\"discuss\"` → do NOT go ahead. Reply in `dialog`, run `iterate`, send another round.",
    "Then `response.review`, the `dialog` thread, and `response.answers`. If you authored",
    "`conflict` blocks, `response.resolutions` is keyed `\"<blockId>.<fieldId>\"` to",
    "`{ side, text? }` (`side` is a side id, or `\"__other__\"` with a `text` write-in).",
    "Unresolved fields were left for you to decide.",
    "",
    "## After authoring",
    "Write the JSON to a file, then run `change-proposal review <file>`.",
    "",
    ...schemaSection("change-proposal", full),
  ].join("\n");
}

/**
 * The authoring guide emitted by `describe-architecture author`. Same file format and
 * versioned contract as change-proposal; a different kind with a different loop: the
 * agent describes the CURRENT system, the human confirms or asks for clarification.
 */
export function describeGuide(full = false): string {
  return [
    `# Describe Architecture — authoring guide (v${VERSION})`,
    "",
    "You are producing an `architecture.json` — your understanding of a system's CURRENT",
    "state (architecture, data model, app state, APIs) as an interactive page instead of a",
    "markdown writeup. Nobody approves a change here. The human runs a **clarification",
    "loop**: each section is marked `clear` or `needs-clarification`, and you answer the",
    "requests in another round, until you both hold the same verified mental model.",
    "",
    "## Rules",
    `- Set \`version\` to exactly \`"${VERSION}"\`. A mismatch is rejected (no fallbacks).`,
    '- Set `kind` to `"architecture-description"`. (The change-proposal verdict/outcome',
    "  tokens are invalid for this kind, and vice versa — hard-checked.)",
    '- Set `status` to `"pending"` and `round` to `1` for a first description.',
    "- Leave `response` empty (or omit it) — the human fills it in.",
    "- Describe what IS, not what should be. Leave block `status` markers",
    "  (`added`/`modified`/`removed`) off unless you are flagging in-flight work.",
    "- Say where you are unsure. Uncertainty belongs in `questions` — asking the human to",
    "  confirm beats presenting a guess as fact.",
    "",
    "## Document shape",
    "```",
    "{",
    '  "version": "' + VERSION + '",',
    '  "kind": "architecture-description",',
    '  "status": "pending",',
    '  "round": 1,',
    '  "proposal": {',
    '    "title": "How task-app works today",',
    '    "description": "One-paragraph summary (Markdown).",',
    '    "sections": [ /* see below */ ],',
    '    "questions": [ /* things you need the human to confirm */ ]',
    "  }",
    "}",
    "```",
    "",
    "## Sections",
    "Each section is a card the human marks clear / asks to clarify. Author-defined — use",
    "whatever cuts fit the system (overview, architecture, data model, state & lifecycle,",
    "APIs, integrations, deployment, …).",
    "- `id`: stable unique string.",
    "- `title`: short heading.",
    "- `badge`: optional short label, e.g. `ARCH`, `DB`, `STATE`.",
    "- `accent`: `blue | green | red | amber | violet | neutral` — styling only.",
    "- `summary`: optional one-line summary.",
    "- `blocks`: ordered content blocks (below). For structure use `arch-flow` /",
    "  `arch-layers` / `arch-boundaries`; for the data model use `er`; for written explanation",
    "  use `markdown`; for known gaps or things that are easy to get wrong use `callout`.",
    "",
    ...blocksSection("describe-architecture", full),
    "",
    "## Questions (optional)",
    "Ask the human to confirm what you could not verify from the code. `kind: 'choice'`",
    "with `options: [{id,label}]` (set `allowOther: true` for a write-in), or",
    "`kind: 'text'` for free-form answers.",
    "",
    "## Dialog (the per-section conversation)",
    "`dialog` is a shared, cross-round thread keyed by section id. The human's",
    "clarification requests land here; you answer by adding entries with",
    '`author: "agent"` when authoring the next round. Leave `dialog: {}` on round 1.',
    "",
    "## Iterating (round 2+)",
    "Don't hand-reset the response. Run `describe-architecture iterate <file>` — it",
    "archives the current `response` into `history`, resets the live response, keeps the",
    "`dialog`, and bumps `round`. Then clarify/expand the sections that were flagged,",
    'reply in `dialog` with `author: "agent"` entries, and run `review` again.',
    "",
    "## Reading the result",
    "`review` prints a digest when it returns; `describe-architecture result <file>` re-prints",
    "it. It joins every id back to its label — prefer it to the raw JSON.",
    "",
    "On finalize, `status` becomes `finalized`. Read `response.outcome` FIRST:",
    '- `"understood"` → the description landed. Treat it as shared, human-verified context for',
    "  whatever comes next.",
    '- `"clarify"` → the sections marked `needs-clarification` (see `response.review`) need',
    "  expanding. Their `dialog` threads hold the actual questions; answer them, run `iterate`,",
    "  and present another round.",
    "Then `response.answers` (your questions) and `response.feedback` (global note).",
    "",
    "## After authoring",
    "Write the JSON to a file, then run `describe-architecture review <file>`.",
    "",
    ...schemaSection("describe-architecture", full),
  ].join("\n");
}
