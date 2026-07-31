---
name: show-proposal
description: Present a proposed change as an interactive review page instead of a markdown plan: per-section approval, comments, and answers routed back to the agent.
disable-model-invocation: true
---

Fetch the contract from the CLI (steps 1–2); never author from memory.
Run from the project root, and keep `--silent` — npm's banner would corrupt the JSON.

1. **Contract:** run `npm run --silent show-proposal -- author` — the authoring guide for the installed
   version: the rules, the writing guidance, and a catalog of the blocks you can use.
   Author against exactly that.
2. **Block specs:** pick the blocks this proposal needs, then run
   `npm run --silent show-proposal -- author --block <type>,<type>` for their fields, examples and schema.
   Fetch only the ones you will use; never author a block from memory.
3. **Write** `proposal.json`, then `npm run --silent show-proposal -- validate proposal.json` — it names
   every problem by path, so it is the check; you do not need the schema in front of you.
   (`npm run --silent show-proposal -- example proposal.json` writes a sample to adapt.)
4. **Review:** run `npm run --silent show-proposal -- review proposal.json` — serves the UI, blocks
   until the human finalizes, then prints the result digest. Needs `npm run build` once.
5. **Act on the OUTCOME first.** `approved` — the human agrees; go ahead with whatever this
   proposal gated (implement, draft the full plan, run the migration — decide from its
   content). `discuss` — do NOT go ahead; reply in `dialog` and send another round.
   Per-section verdicts are detail beneath the outcome. Trust the digest over the raw JSON
   (re-print it with `npm run --silent show-proposal -- result proposal.json`); read the file only for
   what the digest omits — `history`, or agent entries in `dialog`.
6. **Iterate:** run `npm run --silent show-proposal -- iterate proposal.json` — archives the round,
   keeps `dialog`, bumps `round`. Never hand-edit the response yourself. Then revise, reply
   with `author: "agent"` entries on sections you changed, and review again.
