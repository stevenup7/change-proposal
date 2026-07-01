---
name: change-proposal
description: Present a change/plan to the human as an interactive review page instead of a markdown plan. Use when you have a multi-part change to propose and want per-section approval, comments, and answers back before implementing.
---

Do not embed the schema here — fetch the current, versioned contract from the CLI so this
skill can never drift from the installed tool. Run all commands from the project root, and
keep `--silent` so npm's banner never pollutes the CLI's stdout (it would corrupt the JSON).

1. **Get the contract:** run `npm run --silent cli -- author`. It prints the authoring guide
   + JSON schema for the installed version. Author against exactly that. (Add `--schema` for
   just the JSON schema.)
2. **Write the proposal:** produce a `proposal.json` matching the schema — break the change
   into sections (each with content blocks), and add any questions you need answered.
   Set `version` to the value the guide gives, `status: "pending"`, `round: 1`, and leave
   `response` empty. If unsure of the shape, run `npm run --silent cli -- example proposal.json`
   to write a sample you can adapt, then `npm run --silent cli -- validate proposal.json` to check it.
3. **Open the review:** run `npm run --silent cli -- review proposal.json`. This serves the UI
   and blocks until the human finalizes. (Requires a built UI — run `npm run build` once first.)
4. **Read the result:** when `review` returns, read `proposal.json` back. Check
   **`response.outcome` first** — `"approved"` means the human agrees, so go ahead with
   whatever this proposal was gating (that may be implementing, or drafting the full plan,
   running a migration, etc. — decide from the proposal's content, don't assume "write code
   now"); `"discuss"` means do NOT go ahead, reply and iterate. Then `response.review` has per-section verdicts
   (optional detail), `response.answers` has question responses, `response.feedback` is
   global, and `dialog[sectionId]` is the per-section conversation (`{round, author, text}`).
5. **Iterate when outcome is `discuss`** (or any section is `rejected`/`changes-requested`):
   run `npm run --silent cli -- iterate proposal.json` — it archives the round into
   `history`, keeps the `dialog`, and bumps `round`. Then revise the `proposal`, optionally
   reply in `dialog` with `author: "agent"` entries on sections you changed, and `review` again.
