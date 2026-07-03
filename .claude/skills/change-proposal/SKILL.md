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
2. **Check what's already settled:** before authoring, reread the project's rules —
   CLAUDE.md, specs, lint/config conventions. Anything they already mandate is settled law:
   do NOT present it for approval, and don't spend blocks re-explaining it. Reference it in
   one line if a section depends on it ("schemas stay strict, per project rules").
   Presenting settled things as reviewable trains the human to skim.
3. **Write the proposal:** produce a `proposal.json` matching the schema — break the change
   into sections (each with content blocks), and add any questions you need answered.
   Set `version` to the value the guide gives, `status: "pending"`, `round: 1`, and leave
   `response` empty. If unsure of the shape, run `npm run --silent cli -- example proposal.json`
   to write a sample you can adapt, then `npm run --silent cli -- validate proposal.json` to check it.
4. **Self-edit before serving.** For each section ask: What am I asking the reviewer here?
   Could their answer change what I build? Does the summary survive without the body being
   read? Cut or merge any section that fails, and remove the one block you are least sure
   earns its place. Then re-validate.
5. **Open the review:** run `npm run --silent cli -- review proposal.json`. This serves the UI
   and blocks until the human finalizes. (Requires a built UI — run `npm run build` once first.)
6. **Read the result:** when `review` returns it prints an agent-readable digest — outcome,
   per-section verdicts, conflict picks, and question answers with every id already joined
   back to its label. Re-print it anytime with `npm run --silent cli -- result proposal.json`.
   Act on **OUTCOME first** — `approved` means the human agrees, so go ahead with whatever
   this proposal was gating (that may be implementing, or drafting the full plan, running a
   migration, etc. — decide from the proposal's content, don't assume "write code now");
   `discuss` means do NOT go ahead, reply and iterate. Only read the raw `proposal.json`
   for something the digest omits (e.g. prior-round `history`, or agent entries in `dialog`).
7. **Iterate when outcome is `discuss`** (or any section is `rejected`/`changes-requested`):
   run `npm run --silent cli -- iterate proposal.json` — it archives the round into
   `history`, keeps the `dialog`, and bumps `round`. Then revise the `proposal`, optionally
   reply in `dialog` with `author: "agent"` entries on sections you changed, and `review` again.
