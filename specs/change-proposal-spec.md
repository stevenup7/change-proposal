# Change Proposal — Design Spec

> Status: **v0.4.0** — past the §7 first cut. The first cut is implemented and passing
> (tests, typecheck, build, CLI, and full server round-trip verified); since then the tool
> gained cross-round continuity (`dialog`, `history`, `iterate`) in v0.2, a two-outcome
> finalize in v0.3, and the first input-collecting block (`conflict` → `resolutions`) in
> v0.4. This is a living doc: it reflects current decisions, and notes where a founding
> decision was later revised. Companion to the hifi design reference in `design_handoff/`.
> Where this spec and the mockup disagree, this spec wins: the mockup is a starting point.

## 1. Purpose

A tool for coding agents to present a **change proposal** as an interactive review
surface instead of a markdown plan. The agent breaks a proposed change into reviewable
sections; the human approves/rejects each one, converses per-section, answers the agent's
questions, and resolves conflicts. It is a **structured, section-by-section approval gate
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
5. **Iteration is first-class, but continuity lives in the file.** *(Revised in v0.2 —
   originally "the tool is round-agnostic; iteration is an agent behavior, never a tool
   feature.")* One file still round-trips, but it now carries the whole review across
   rounds: `iterate` archives the finished `response` into `history`, keeps the per-section
   `dialog` thread, and bumps `round`. The agent no longer has to reconstruct prior rounds
   from its own context. The file remains the sole contract — this continuity is data in
   the file, not server state.

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
- **CLI** — `author` (emit versioned schema + guide), `example`/`validate` (scaffold + check
  a proposal), `review <file>` (validate, serve, self-terminate on finalize), and `iterate
  <file>` (archive the round, keep the dialog, bump `round`).
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

| Region       | Author      | Mutability in UI | Contents |
|--------------|-------------|------------------|----------|
| meta         | agent       | read-only        | `version`, `status`, `round`, title, description |
| proposal     | agent       | **read-only**    | sections (+ blocks, incl. `conflict`), questions |
| dialog       | both        | append-only      | per-section conversation, keyed by section id, cross-round |
| response     | user        | writable         | verdicts, answers, resolutions, feedback, outcome |
| history      | agent (CLI) | —                | prior rounds' response regions, archived by `iterate` |

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

Grown from the handoff's state model:

- `review: {[sectionId]: 'approved' | 'rejected' | 'changes-requested'}`
- `answers: {[questionId]: { choice?, other?, text? }}`
- `resolutions: {["<blockId>.<fieldId>"]: { side, text? }}` — `conflict`-block picks; `side`
  is a chosen side id or `"__other__"` (with a `text` write-in). *Soft-gated: an unresolved
  field never blocks finalize; the human may leave it for the agent to decide.*
- `feedback: string` — global, agent-directed
- `outcome: 'approved' | 'discuss'` — the document-level intent, set on finalize *(v0.3)*.
  `approved` = agree & proceed; `discuss` = save & send back another round. This is what the
  agent reads **first**; per-section verdicts are optional detail beneath it.

Per-section conversation moved out of `response` into its own **`dialog`** region *(v0.2)*:
`{[sectionId]: [{ round, author: 'human'|'agent', text }]}`. Unlike `response` it is shared
(both sides append) and cross-round (never wiped by `iterate`), so a section reads as one
thread across the whole review rather than a fresh comment box each round. This supersedes
the original flat `comments: {[sectionId]: string[]}`.

## 5. Data model: envelope + blocks

The **review envelope is fixed and typed**; **section content is composable**.

- **Fixed:** a section has `id`, `title`, `kind` (picks accent color + badge label from a
  small palette), and its review state. Plus first-class `questions`. Conflict resolution is
  *not* a fixed section type — it arrived as a `conflict` block *(v0.4)*, proving the seam:
  the first block that collects input (into `response.resolutions`) rather than just
  rendering. These are the review mechanics — identical on every proposal.
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
- **Iteration:** the agent runs `iterate <file>` — the tool archives the finished `response`
  into `history`, resets the live response to `pending`, keeps the `dialog`, and bumps
  `round`. The agent then revises the proposal region **in the same file** (optionally adding
  `author: "agent"` dialog replies to sections it changed) and re-runs `review`. The server
  having self-terminated, "restart" is just invoking `review` again. *(Revised from v1: the
  tool now models rounds, threads, and history as file data — see principle 5 — rather than
  leaving all continuity to the agent's context. The "addressed-feedback" continuity block
  it anticipated became the `dialog` thread.)*

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

### Since v1 (delivered beyond the first cut)

The first cut above shipped as described; subsequent versions added, in order:

- **v0.2 — cross-round continuity.** Per-section `dialog` thread (shared, cross-round),
  archived `history`, and the `iterate` CLI command. Revised principle 5 (see §5–§6): the
  "addressed-feedback" continuity block became the `dialog` thread.
- **v0.3 — two-outcome finalize.** `response.outcome` (`approved` = agree & proceed,
  `discuss` = save & iterate) as the document-level intent the agent reads first.
- **v0.4 — the `conflict` block.** The first *input-collecting* block: side-by-side
  per-field decisions whose picks land in `response.resolutions`, with per-field write-ins.
  Soft-gated (never blocks finalize). This is the deferred "conflict" item, delivered as a
  registered block rather than the sample-specific modal — validating the block-registry seam.

**Still deferred:** the handoff's *modal* conflict treatment, `entityDiagram`/`decisionTable`
and other specialized blocks (decision tables are already covered by GFM markdown), in-section
tabs, and theme polish beyond the dark/light token swap.

## 8. Open questions

**Resolved since the first cut:**
- *Zod shapes* — settled in `src/shared/` (block modules, `document.ts`).
- *CLI commands* — `author` / `example` / `validate` / `review` / `iterate`; the skill lives
  at `.claude/skills/change-proposal/` and fetches the guide from `author` at runtime.
- *Testing* — golden tests of `(input JSON + scripted interactions) → output JSON` over the
  pure reducer (`src/web/state.test.ts`).
- *Repo/distribution* — a single npm package; the dev launcher (`bin/`) runs the TS CLI via
  the package's own `tsx`, so a globally-linked bin works from any cwd.
- *Runtime* — Node (`engines.node >= 20`).
- *Autosave* — debounced (~600ms) draft PUTs; finalize flips `status` and the server
  self-terminates.

**Still open:**
- File location & naming (cwd `proposal.json` today, gitignored); whether multiple proposals
  should coexist, and where.
- How the skill is installed/registered for non-Claude-Code harnesses.
```
