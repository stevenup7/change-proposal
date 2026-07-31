---
name: show-architecture
description: Present the current architecture, data model and state of a system as an interactive page, for the human to confirm or ask to clarify.
disable-model-invocation: true
---

Fetch the contract from the CLI (steps 1–2); never author from memory.
Run from the project root, and keep `--silent` — npm's banner would corrupt the JSON.

1. **Contract:** run `npm run --silent show-architecture -- author` — the authoring guide for the installed
   version: the rules and a catalog of the blocks you can use. Author against exactly that.
2. **Block specs:** pick the blocks this description needs, then run
   `npm run --silent show-architecture -- author --block <type>,<type>` for their fields, examples and schema.
   Fetch only the ones you will use; never author a block from memory.
3. **Write** `architecture.json` (`kind: "architecture-description"`) — what the system IS
   today, in sections of blocks. Anything you could not verify from the code goes in
   `questions`; do not assert it.
   Then `npm run --silent show-architecture -- validate architecture.json` — it names every problem by path.
   (`npm run --silent show-architecture -- example architecture.json` writes a sample to adapt.)
4. **Present:** run `npm run --silent show-architecture -- review architecture.json` — serves the UI,
   blocks until the human finalizes, then prints the digest. Needs `npm run build` once.
5. **Act on the OUTCOME first.** `understood` — the description is confirmed; treat it as
   shared, human-verified context for what comes next. `clarify` — the sections marked
   `needs-clarification` need work, and their `dialog` threads hold the human's actual
   questions. Trust the digest over the raw JSON — re-print it with
   `npm run --silent show-architecture -- result architecture.json`.
6. **Iterate:** run `npm run --silent show-architecture -- iterate architecture.json` — archives the
   round, keeps `dialog`, bumps `round`. Never hand-edit the response yourself. Then expand
   the flagged sections, answer their threads with `author: "agent"` entries, and review
   again.
