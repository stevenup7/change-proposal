---
name: change-proposal
description: Present a change/plan to the human as an interactive review page instead of a markdown plan. Use when you have a multi-part change to propose and want per-section approval, comments, and answers back before implementing.
---

Do not embed the schema here — fetch the current, versioned contract from the CLI so this
skill can never drift from the installed tool.

1. **Get the contract:** run `change-proposal author`. It prints the authoring guide +
   JSON schema for the installed version. Author against exactly that.
2. **Write the proposal:** produce a `proposal.json` matching the schema — break the change
   into sections (each with content blocks), and add any questions you need answered.
   Set `version` to the value the guide gives, `status: "pending"`, `round: 1`, and leave
   `response` empty.
3. **Open the review:** run `change-proposal review proposal.json`. This serves the UI and
   blocks until the human finalizes.
4. **Read the result:** when `review` returns (or the human says they're done), read
   `proposal.json` back. `response.review` has per-section verdicts, `response.comments`
   has notes, `response.answers` has question responses, `response.feedback` is global.
5. **Iterate if needed:** if sections are `rejected`/`changes-requested`, revise the
   `proposal` in place, reset `response` to empty, bump `round`, and run `review` again.
