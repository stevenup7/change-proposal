# Change Proposal — Design Spec

> Status: **v1 built** — the §7 first cut is implemented and passing (tests, typecheck,
> build, CLI, and full server round-trip verified). Captures decisions from the initial
> design discussion. Companion to the hifi design reference in `design_handoff/`. Where
> this spec and the mockup disagree, this spec wins: the mockup is a starting point.

## 1. Purpose

A tool for coding agents to present a **change proposal** as an interactive review
surface instead of a markdown plan. The agent breaks a proposed change into reviewable
sections; the human approves/rejects each one, comments, answers the agent's questions,
and (later) resolves conflicts. It is a **structured, section-by-section approval gate
between an agent's plan and its execution.** The Google-Tasks 3-way-merge payload in the
handoff is just an example — the review surface itself is the product.

## 2. Core principles

These are the load-bearing decisions; everything else follows from them.

1. **The file is the sole agent-facing contract.** The agent only ever reads and writes
   one JSON file. It never talks HTTP, never needs a port, never couples to the server.
   This is what makes the tool portable across agent harnesses (Claude Code, pi, …).
2. **The front end is deterministic.** Given an input document and a sequence of user
   interactions, the output document is a pure function. No server-side logic or
   rendering — the server is dumb I/O. This makes the whole system snapshot-testable
   without a browser.
3. **Single source of truth, single version.** Schema, TypeScript types, UI renderers,
   and skill guidance all derive from one place (Zod block modules) at one version.
   "The skill matches the UI" is structurally guaranteed, not a discipline to maintain.
4. **No fallbacks — force upgrade.** Everything ships as one versioned unit. An unknown
   block type or a version mismatch is a **hard error**, never a graceful degrade.
   Fallbacks hide mismatches; a loud failure is the honest behavior.
5. **The tool is round-agnostic.** One file = one review round. Iteration is an agent
   behavior (re-author + re-run), never a tool feature.

## 3. Architecture

```
  ┌─────────┐   thin skill    ┌──────────────────────────────┐
  │  Agent  │────────────────▶│ CLI: `author`                │
  │         │                 │  → emits versioned schema +   │
  │         │                 │    authoring guide            │
  │         │◀────────────────│                              │
  │         │  writes         └──────────────────────────────┘
  │         │  proposal.json
  │         │
  │         │   `review <file>`  ┌────────────────────────────┐
  │         │───────────────────▶│ CLI: `review`              │
  │         │                    │  → validates against schema │
  │         │                    │  → serves SPA + JSON         │
  │         │                    │  → dumb I/O, self-terminates │
  │         │                    └───────────┬────────────────┘
  │         │                                │ localhost
  │         │                          ┌─────▼──────┐
  │         │                          │ React+TS   │  human reviews,
  │         │                          │ SPA        │  autosaves drafts,
  │         │                          │ (deterministic)│ finalizes
  │         │                          └─────┬──────┘
  │         │  polls file for `status`       │ PUT updated JSON
  │         │◀───────────────────────────────┘  (server writes file,
  └─────────┘   (or user: "I'm done")            then self-terminates)
```

### Components

- **Thin skill** — a few lines registered in the agent harness. Contains *no* schema or
  block guidance (keeps agent context light when unused, and cannot drift). It instructs
  the agent to: run `author` to fetch the current contract, produce JSON to match, then
  run `review <file>`.
- **CLI** — `author` (emit versioned schema + guide), `review <file>` (validate, serve,
  self-terminate on finalize). Command names TBD.
- **Server** — lightweight Node (Hono or Express). Validates on load, serves the SPA and
  the JSON, accepts the finalized/draft document, writes it to disk. Self-terminating on
  finalize; stale servers replaced on next launch (single-flight on port). No business
  logic, no rendering.
- **Front end** — Vite + React + TypeScript SPA. Parses the document, renders it, collects
  responses, emits the updated document. Deterministic.

### Stack

- **Runtime:** Node (default). Bun on the table if already in the dev environment.
- **UI:** React + TypeScript, built with Vite. Chosen for *agent-operability* (agents
  extend and run this tool) and ecosystem depth, not framework merit — the handoff has no
  framework lock-in.
- **Server:** Hono or Express, same process serving the built SPA.
- **Schema:** Zod as single source of truth → derived JSON Schema (validation) + TS types
  (renderer) + skill guidance.

## 4. The document

One JSON file is **both input and output** — the agent authors it, the user fills it in,
the agent reads it back. It has distinct regions:

| Region       | Author | Mutability in UI | Contents |
|--------------|--------|------------------|----------|
| meta         | agent  | read-only        | `version`, `status`, `round`, title, description |
| proposal     | agent  | **read-only**    | sections (+ blocks), questions, (later) conflicts |
| response     | user   | writable         | verdicts, comments, answers, (later) resolutions, feedback |

- **`version`** — single monotonic tool version. On load, if it doesn't match the installed
  tool → hard error, refuse to render, instruct regeneration/upgrade.
- **`status`** — `pending → in-progress → finalized`. The agent polls this field. A new
  round resets it to `pending`.
- **`round`** — integer, optional display aid ("Round 2"). Not modeled as state by the tool.
- **Prose fields carry Markdown strings** (summaries, callouts, guidance); the UI renders
  them. Structured/relational data (verdicts, question options, diffs) stays typed.
- **On save**, the front end writes *only* the response region. The server may verify the
  proposal region came back byte-identical, so a UI bug can never corrupt the agent's plan.
- Schema is **strict/closed** (`additionalProperties: false`, exhaustive block union).

### Response region (the payoff)

Adopted from the handoff's state model:

- `review: {[sectionId]: 'approved' | 'rejected' | 'changes-requested'}`
- `comments: {[sectionId]: string[]}`
- `answers: {[questionId]: { choice?, other?, text? }}`
- `feedback: string` — global, agent-directed
- *(later)* conflict resolutions: `{[field]: chosenValue}`

## 5. Data model: envelope + blocks

The **review envelope is fixed and typed**; **section content is composable**.

- **Fixed:** a section has `id`, `title`, `kind` (picks accent color + badge label from a
  small palette), and its review state. Plus first-class `questions` and (later) `conflicts`.
  These are the review mechanics — identical on every proposal.
- **Composable:** a section's body is an ordered list of **content blocks** drawn from a
  bounded, extensible vocabulary. The handoff's bespoke section renderers (entity diagram,
  decision table, classified diff) become *block types*, not hardcoded section types.

Sections are **author-defined**, not a fixed enum. A proposal may have no DB change, or a
`docs`/`config`/`rollout` section the handoff never imagined. `kind` only drives styling.

### Block registry (the extensibility seam)

Every block type is a **self-contained module** exporting three things from one place:

1. **schema fragment** (Zod → validation + TS types)
2. **renderer** (React component)
3. **authoring guidance** (prose the skill needs: when/how to emit it)

A registry composes all registered blocks into: (a) the global JSON Schema the CLI
validates against, (b) the front end's `type → component` map, (c) the skill's generated
authoring guide. **Adding a feature = adding one folder** (`blocks/<name>/`) and
registering it. Schema, UI, and skill docs update automatically because they're *derived*,
never maintained in parallel. Discipline: every block ships all three together, always.

## 6. Round-trip & iteration

- **Round-trip:** agent writes `proposal.json` (`status: pending`) → launches `review` in
  the background → user reviews, UI autosaves drafts, finalize flips `status: finalized`
  and writes the response region → agent **polls the file** and reads it back. Degrades
  gracefully to the zero-infra baseline: the user just tells the agent "I'm done, read my
  responses." Polling latency/tuning lives entirely in the per-harness poller, not the tool.
- **Iteration:** the agent reads finalized responses, revises the proposal region **in the
  same file**, resets the response region to `pending` (bump `round`), and re-runs `review`.
  The server having self-terminated, "restart" is just invoking `review` again. The tool
  never models rounds, threads, or history — that continuity lives in the agent's context
  (and later, optionally, an "addressed-feedback" block).

## 7. v1 scope (first cut)

Build the **whole loop, thinnest content vocabulary.**

**In:**
- Thin skill + CLI `author`/`review`.
- Dumb, self-terminating Node server + deterministic React+TS SPA.
- One JSON doc: meta + proposal + response, version check, file round-trip, iteration.
- Author-defined sections with verdicts + comments.
- Questions panel (choice + text).
- **Exactly three block types: `markdown`, `diff`, `callout`.**

**Deferred (added later as registered blocks/features):**
- Conflict / 3-way-merge modal (sample-specific; wrong as a founding feature).
- `entityDiagram`, `decisionTable`, and other specialized blocks.
- In-section tabs, theme polish, "addressed-feedback" continuity block.

Rationale: the three blocks exercise every architectural seam (registry, derived schema,
deterministic render, round-trip, iteration) with the least surface area. The deferred
items teach nothing new about the architecture.

## 8. Open questions / not yet decided

- Exact Zod shapes for each v1 block and for sections/questions.
- CLI command names and flags; how the skill is installed/registered per harness.
- File location & naming conventions (cwd? a `.change-proposals/` dir? gitignore?),
  and whether multiple proposals coexist.
- Testing strategy — expected to lean on the deterministic front end: golden tests of
  `(input JSON + scripted interactions) → output JSON`.
- Repo/package layout and distribution (single npm package? `npx`? global bin?).
- Runtime final call: Node vs Bun.
- Autosave granularity and draft-vs-finalize UX details.
```
