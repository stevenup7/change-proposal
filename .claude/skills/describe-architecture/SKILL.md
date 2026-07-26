---
name: describe-architecture
description: Present your understanding of a system's CURRENT architecture / data model / app state as an interactive page the human confirms or asks to clarify. Use when you need a shared, human-verified mental model of an existing app before planning work against it (for proposing a change, use change-proposal instead).
---

Do not embed the schema here — fetch the current, versioned contract from the CLI so this
skill can never drift from the installed tool. Run all commands from the project root, and
keep `--silent` so npm's banner never pollutes the CLI's stdout (it would corrupt the JSON).

1. **Get the contract:** run `npm run --silent describe -- author`. It prints the authoring
   guide + JSON schema for the installed version. Author against exactly that. (Add
   `--schema` for just the JSON schema.)
2. **Write the description:** produce an `architecture.json` matching the schema — describe
   what the system IS today (architecture, data model, state, APIs), broken into sections
   with content blocks (`arch-flow`/`arch-layers`/`arch-boundaries` for structure, `er` for
   the data model). Set `kind: "architecture-description"`, `version` to the value the
   guide gives, `status: "pending"`, `round: 1`, and leave `response` empty. Put anything
   you could not verify into `questions` instead of asserting it. If unsure of the shape,
   run `npm run --silent describe -- example architecture.json` for a sample, then
   `npm run --silent describe -- validate architecture.json` to check yours.
3. **Present it:** run `npm run --silent describe -- review architecture.json`. This serves
   the UI and blocks until the human finalizes. (Requires a built UI — run `npm run build`
   once first.)
4. **Read the result:** when `review` returns it prints an agent-readable digest — outcome,
   per-section verdicts, and question answers with every id already joined back to its
   label. Re-print it anytime with `npm run --silent describe -- result architecture.json`.
   Act on **OUTCOME first** — `understood` means the description is confirmed; treat it as
   shared, human-verified context for whatever comes next. `clarify` means sections need
   expanding: `response.review` marks them `needs-clarification`, and `dialog[sectionId]`
   holds the human's actual questions. Only read the raw JSON for something the digest
   omits.
5. **Iterate when outcome is `clarify`:** run `npm run --silent describe -- iterate
   architecture.json` — it archives the round into `history`, keeps the `dialog`, and bumps
   `round`. Then expand/clarify the flagged sections, answer their dialog threads with
   `author: "agent"` entries, and `review` again.
