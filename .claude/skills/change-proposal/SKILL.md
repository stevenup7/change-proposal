---
name: change-proposal
description: Present a proposed change as an interactive review page instead of a markdown plan: per-section approval, comments, and answers routed back to the agent.
disable-model-invocation: true
---

Fetch the contract from the CLI (step 1); never author from memory.
Run from the project root, and keep `--silent` — npm's banner would corrupt the JSON.

1. **Contract:** run `npm run --silent cli -- author` — the authoring guide + JSON schema
   for the installed version. Author against exactly that; it carries the rules, the
   writing guidance, and every block's spec. (`--schema` for the schema alone.)
2. **Write** `proposal.json`, then `npm run --silent cli -- validate proposal.json`.
   (`npm run --silent cli -- example proposal.json` writes a sample to adapt.)
3. **Review:** run `npm run --silent cli -- review proposal.json` — serves the UI, blocks
   until the human finalizes, then prints the result digest. Needs `npm run build` once.
4. **Act on the OUTCOME first.** `approved` — the human agrees; go ahead with whatever this
   proposal gated (implement, draft the full plan, run the migration — decide from its
   content). `discuss` — do NOT go ahead; reply in `dialog` and send another round.
   Per-section verdicts are detail beneath the outcome. Trust the digest over the raw JSON
   (re-print it with `npm run --silent cli -- result proposal.json`); read the file only for
   what the digest omits — `history`, or agent entries in `dialog`.
5. **Iterate:** run `npm run --silent cli -- iterate proposal.json` — archives the round,
   keeps `dialog`, bumps `round`. Never hand-edit the response yourself. Then revise, reply
   with `author: "agent"` entries on sections you changed, and review again.
