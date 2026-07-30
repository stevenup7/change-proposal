---
name: describe-architecture
description: Present the current architecture, data model and state of a system as an interactive page, for the human to confirm or ask to clarify.
disable-model-invocation: true
---

Fetch the contract from the CLI (step 1); never author from memory.
Run from the project root, and keep `--silent` — npm's banner would corrupt the JSON.

1. **Contract:** run `npm run --silent describe -- author` — the authoring guide + JSON
   schema for the installed version. Author against exactly that; it carries the rules and
   every block's spec. (`--schema` for the schema alone.)
2. **Write** `architecture.json` (`kind: "architecture-description"`) — what the system IS
   today, in sections of blocks. Anything you could not verify from the code goes in
   `questions`; do not assert it.
   Then `npm run --silent describe -- validate architecture.json`.
   (`npm run --silent describe -- example architecture.json` writes a sample to adapt.)
3. **Present:** run `npm run --silent describe -- review architecture.json` — serves the UI,
   blocks until the human finalizes, then prints the digest. Needs `npm run build` once.
4. **Act on the OUTCOME first.** `understood` — the description is confirmed; treat it as
   shared, human-verified context for what comes next. `clarify` — the sections marked
   `needs-clarification` need work, and their `dialog` threads hold the human's actual
   questions. Trust the digest over the raw JSON — re-print it with
   `npm run --silent describe -- result architecture.json`.
5. **Iterate:** run `npm run --silent describe -- iterate architecture.json` — archives the
   round, keeps `dialog`, bumps `round`. Never hand-edit the response yourself. Then expand
   the flagged sections, answer their threads with `author: "agent"` entries, and review
   again.
