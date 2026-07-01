import { zodToJsonSchema } from "zod-to-json-schema";
import { documentSchema } from "./document";
import { blockGuide } from "./blocks/registry";
import { VERSION } from "./version";

/** The JSON Schema the agent should author against (and the CLI validates against). */
export function jsonSchema(): object {
  return zodToJsonSchema(documentSchema, { name: "ChangeProposalDocument" });
}

/**
 * The full authoring guide emitted by `change-proposal author`. This is the versioned
 * contract — the thin skill fetches it at runtime, so it can never drift from the tool.
 */
export function authoringGuide(): string {
  return [
    `# Change Proposal — authoring guide (v${VERSION})`,
    "",
    "You are producing a `proposal.json` for a human to review interactively instead of",
    "reading a markdown plan. Break the change into sections the human can approve one by one.",
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
    "- `badge`: optional short mono label (`DB`, `API`).",
    "- `accent`: `blue | green | red | amber | violet | neutral` — styling only.",
    "- `summary`: optional one-line summary.",
    "- `blocks`: ordered content blocks (below).",
    "",
    "## Blocks",
    blockGuide(),
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
    "## After authoring",
    "Write the JSON to a file, then run `change-proposal review <file>`. When the human",
    "finalizes, the file's `status` becomes `finalized` and `response` is filled in; read",
    "it back to see verdicts, the `dialog` thread, and answers.",
    "",
    "## JSON Schema",
    "```json",
    JSON.stringify(jsonSchema(), null, 2),
    "```",
  ].join("\n");
}
