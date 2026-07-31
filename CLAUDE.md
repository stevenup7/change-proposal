# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`show-me` — an interface for coding assistants to **show a person their work** instead of describing it in a wall of markdown: diagrams, diffs, tables and decision blocks in a page the person reads and answers, section by section. The agent breaks what it has to say into sections plus open questions; the human works through them one at a time, comments per section, answers the questions, and picks sides on the decisions — all routed back to the agent through one JSON file. The sample payloads are just examples; the **page itself is the product**.

Two things to show, so two commands: `show-proposal` (a change the agent proposes to make) and `show-architecture` (how a system works today).

## Current state

**v0.8.0** (past the spec's §7 first cut). A Node + Vite + React + TS package: a thin skill → CLI (`author` / `example` / `validate` / `review` / `iterate` / `result`) → dumb self-terminating Hono server → deterministic React SPA. Since the first cut it has grown a per-section conversation threaded across rounds (`dialog`), archived `history`, and a two-outcome finalize (`approved` = agree & proceed, `discuss` = save & iterate). Blocks: `markdown`, `diff`, `callout`, `conflict` — the first **input-collecting** block (a side-by-side decision whose picks land in `response.resolutions`; soft-gated, never blocks finalize; each field carries a `description` and each side an optional `note` so the decision explains itself) — `table` (generic toned grid; the `er` block's Columns tab reuses its exported `tableContentSchema`), `er` (the sole DB-diagram block — an auto-laid-out entity-relationship diagram with PK/FK/UQ/IDX field rows, a green changed-entity hairline for `modified` entities, relation labels as pills above the connector with `fromEnd`/`toEnd` cardinality glyphs at the line ends, and an optional `columns` table that turns on the Diagram/Columns tabs; the earlier `schema` strip-diagram block it overlapped was retired in v0.8.0), and three architecture diagrams — `arch-flow` (auto-laid-out node/edge graph; pure layout in `src/web/blocks/arch-flow-layout.ts`, generalized to per-node heights for `er`, pinned by tests), `arch-layers` (stack bands), `arch-boundaries` (C4-style nested containers). Cross-field block validation (edge/ref ids must exist, row cells must match columns) runs through each block def's optional `check`, dispatched from a `superRefine` on the block union — zod's `discriminatedUnion` only accepts plain objects as members. The handoff's modal conflict treatment remains deferred. The tool version lives in `src/shared/version.ts` and must match `package.json`'s `version`.

**Two faces, one package.** The commands are `show-proposal` and `show-architecture`; the document has a `kind`: `change-proposal` (approval gate: approve/reject, outcome `approved|discuss`) or `architecture-description` (the agent describes the CURRENT system; the human runs a clarification loop: `clear`/`needs-clarification` per section, outcome `understood|clarify`). The `show-architecture` bin/skill is the same CLI built for the second kind (`src/cli/program.ts` `buildProgram(kind)`); kind↔token mismatches are hard schema errors, and each CLI face refuses the other kind's files. All kind-dependent UI wording lives in `src/web/copy.ts`; the agent-readable `result` digest is kind-aware via outcome-token lines.

## Commands

- `npm install` — first-time setup. If `tsx`/`vite` fail right after install, esbuild's native binary didn't finish its postinstall — run `npm rebuild esbuild`.
- `npm run build` — build the SPA to `dist/web/` (required before `review` can serve the UI).
- `npm test` — run the deterministic-reducer golden tests (`src/web/state.test.ts`) and the block schema-validation tests (`src/shared/blocks/blocks.test.ts`). Run a single test with `npx vitest run -t "<name>"`.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run show-proposal -- example proposal.json` — write a sample `proposal.json` (`npm run show-architecture -- example architecture.json` for the other kind).
- `npm run show-proposal -- validate proposal.json` — validate against the schema + version.
- `npm run show-proposal -- author` — print the versioned authoring guide + block catalog (what the skill fetches). `--block <type>[,<type>]` prints one block's spec (guide + schema fragment); `--schema` the full JSON Schema; `--full` everything inline.
- `npm run show-proposal -- review <file>` — validate a proposal, serve the UI on `:4179`, and block until the user finalizes. Same verb on `show-architecture` for a description.
- `npm run show-proposal -- iterate <file>` — archive the finished round into `history`, keep the `dialog`, and bump `round` for the next pass.
- `npm run show-proposal -- install-skill --all` — install both skills into `~/.claude/skills/`. `--agent claude|cursor|agents` (comma-separated) picks the host convention — Cursor's native `~/.cursor/skills` / `.cursor/skills`, or the vendor-neutral `.agents/skills`; the file itself is identical for every host. Plus `--project`, `--dir <path>`, `--command <cmd>`, `--force`, `--print`. Regenerate this repo's own checked-in skills with `npm run show-proposal -- install-skill --local --all --dir .claude/skills --force`.

## Architecture invariants (don't regress these)

- **`src/shared/` is the single source of truth.** Zod schemas → derived JSON Schema, TS types, and the skill's authoring guide. Node-safe (no React) so both CLI and Vite import it.
- **Skill text is generated, never hand-edited.** Both `SKILL.md` files come from `src/shared/skill.ts` — the checked-in ones in `.claude/skills/` (in-repo `npm run` invocation) and whatever `install-skill` writes into a user/project skills dir (CLI-bin invocation). Edit the generator, regenerate, and `src/shared/skill.test.ts` pins the checked-in copies to it. **The skill text stays host-agnostic** — one file must serve Claude Code, Cursor and `.agents/skills` readers, so the frontmatter stays inside their intersection (`name` lowercase-hyphen and equal to the folder, `description`, `disable-model-invocation`; nothing host-specific), and host differences live in `HOSTS` in `src/cli/install-skill.ts`, not in the text.
- **Both skills are explicit-invocation only** (`disable-model-invocation: true`, honoured identically by Claude Code and Cursor). A review takes over the human's browser and blocks until they finalize — the human asks for it with `/show-proposal`; an agent never opens one unprompted. Don't drop the field to make the tool "discoverable".
- **`src/web/state.ts` is a pure reducer** — no React, no time, no I/O. `finalizedAt` is stamped by the server, never the reducer. This is what the golden tests pin; keep it pure.
- **Adding a block = add `src/shared/blocks/<name>.ts`** (schema + `summary` + guide), register it in `src/shared/blocks/registry.ts`, and add a renderer keyed by the same `type` constant in `src/web/blocks/`. Schema/UI/guide/catalog derive from the registry — don't hand-maintain them separately.
- **The contract is disclosed in layers.** `author` prints the guide plus a one-line-per-block catalog (~6.6KB); `author --block <type>` prints that block's guide + schema fragment; `author --schema` and `author --full` hold the rest. The agent loads the specs for the blocks it will actually use — the whole contract inline was ~52KB, three quarters of it schema for blocks the document never contains. `validate` is the check, so the agent doesn't need the schema in front of it to author. `src/shared/guide.test.ts` pins the split.
- **No fallbacks, force upgrade.** Strict/closed schemas (`.strict()`), version match is hard-checked, unknown block `type` is an error. Don't add tolerant/degrading paths.
- **The file is the sole agent contract.** The server is dumb I/O and guards the proposal region as byte-identical read-only; keep logic in the deterministic front end.
- **Audit dependencies whenever they change.** After any `npm install <pkg>` / dependency bump, run `npm audit` and resolve what it reports (`npm audit fix`, or a pinned upgrade) before committing — the initial cut shipped with known vulnerabilities, so treat a clean audit as part of "done" for any dependency change. Prefer adding a dependency only when it earns its keep; this stays a small, few-dependency package.

## Source of truth

Two layers, read both before writing implementation code:

- **`specs/show-me-spec.md`** — the **implementation decisions** (architecture, data model, versioning, round-trip, v1 scope). This wins where it and the handoff disagree: the handoff is a visual starting point, not a contract.
- **`design_handoff/`** — the **hifi visual/behavioral reference** (below).

## design_handoff/

The canonical visual spec — read before writing any UI code.

- **`design_handoff/README.md`** — the implementation brief. Covers every screen, all interactions, the complete state model, and design tokens (dark + light), typography, spacing, and icons. **Read this first and in full.**
- **`design_handoff/Change Proposal.dc.html`** — the authored source, and the single best reference for *behavior*. Plain inline-styled HTML for markup; all logic in one `class Component` at the bottom (React-class-like: `state`, `setState`, and a `renderVals()` returning the values the template binds to). Fully readable (~1300 lines) — `Read` it directly. It loads `./support.js` (the runtime, not included) — irrelevant for reading the logic.
- **`design_handoff/Change Proposal.standalone.html`** — the same design bundled offline with fonts inlined. **Open in a browser to click through the real thing** (toggle approve/reject, expand diffs and the decision table, open the conflict modal, switch theme). It is a ~515KB single-file bundle — open it, don't `Read` it.

### Superseded: `mockup/`

`mockup/change-proposal-mockup.html` is an earlier, opaque bundle of the same design (gzip+base64 blobs, two 300KB+ lines — do not `Read` it; it blows the token limit). The `design_handoff/` files supersede it; prefer them for everything.

## Component & state model (from `Change Proposal.dc.html`)

One component owns all state — recreate as component state or a store. Markup binds via `{{ }}` interpolation with `<sc-if>` / `<sc-for>` directives (a dc-runtime convention; replace with your framework's equivalents). Key state:

- `open: {[sectionId]: bool}` — expanded section bodies.
- `review: {[sectionId]: 'approved' | 'rejected'}` — per-section verdict; a reviewed card fades to `opacity .58`.
- `comments: {[sectionId]: string[]}`, `answers: {[questionId]: {choice?, other?, text?}}`.
- `questionsOpen` (treat `!== false` as open), `theme: 'dark'|'light'`.
- In-card tabs (`dbTab`, `uiTab`), reference-content toggles (`codeDiffOpen`, `logicTableOpen`).
- `choice: {[field]: 'steady'|'google'}` — conflict-modal picks.
- `modalOpen`; composer: `composerOpen`, `composerMode: 'question'|'changes'|'comment'`, `composerTarget`.
- **Derived**: review progress = reviewed ÷ 9 sections; question progress = answered ÷ 5; resolve-readiness = both conflict fields chosen.
- **No data fetching** — the prototype is static. In production these payloads (sections, diffs, questions, conflicts) come from the agent; wire them to your agent/run API and POST back approvals, comments, answers, and resolutions.

## UX invariants to preserve

The section ids are `['db','logic','code','api','types','ui','tests','deps','build']` plus a "Questions from the agent" panel. These are core to the product, not incidental styling — see the README for exact specs:

- **Sticky header**: title, collapsible description, "N / 9 sections reviewed" progress bar, **Send feedback** + **Approve all**, theme toggle, collapse-all.
- **Review section cards**: per-section accent color, type badge, status pill, comment chip, and a comment/approve/reject action cluster whose clicks must **not** toggle the card (stop propagation). Use the geometric checkmark SVG, not a Unicode `✓`.
- **Composer modal**: `question` / `changes` (request changes, blocks approval) / `comment` (per-section) — each with its own placeholder and send label.
- **Conflict resolution modal**: 3-way-merge picker; resolve button stays disabled until every field is chosen.
- **Theming**: `data-theme` on the root wrapper swaps the full token set (dark default + light); all icons are inline SVG / Unicode glyphs, no icon library or raster assets; fonts are IBM Plex Sans (UI) + IBM Plex Mono (code/counts/badges).
