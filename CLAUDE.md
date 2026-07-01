# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

An interface for coding assistants to generate **change proposal pages** — a structured, section-by-section approval gate that sits between an agent's plan and its execution, replacing "read this markdown plan". The agent breaks a proposed change into reviewable sections (schema, logic, code diffs, API, types, UI, tests, deps, build) plus open questions; the human approves/rejects each section, leaves per-section comments, answers the agent's questions, and resolves conflicts — all routed back to the agent. The sample payload (a Google Tasks 3-way-merge fix) is just an example; the **review surface itself is the product**.

## Current state

**v0.3.0** (past the spec's §7 first cut). A Node + Vite + React + TS package: a thin skill → CLI (`author` / `example` / `validate` / `review` / `iterate`) → dumb self-terminating Hono server → deterministic React SPA. Since the first cut it has grown a per-section conversation threaded across rounds (`dialog`), archived `history`, and a two-outcome finalize (`approved` = agree & proceed, `discuss` = save & iterate). Blocks: `markdown`, `diff`, `callout`. Conflicts and specialized blocks are still deferred. The tool version lives in `src/shared/version.ts` and must match `package.json`'s `version`.

## Commands

- `npm install` — first-time setup. If `tsx`/`vite` fail right after install, esbuild's native binary didn't finish its postinstall — run `npm rebuild esbuild`.
- `npm run build` — build the SPA to `dist/web/` (required before `review` can serve the UI).
- `npm test` — run the deterministic-reducer golden tests (`src/web/state.test.ts`). Run a single test with `npx vitest run -t "<name>"`.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run example` — write a sample `proposal.json`.
- `npm run validate` — validate `proposal.json` against the schema + version.
- `npm run cli -- author` — print the versioned authoring guide + JSON schema (what the skill fetches).
- `npm run review` (or `npx tsx src/cli/index.ts review <file>`) — validate a proposal, serve the UI on `:4179`, and block until the user finalizes.
- `npm run cli -- iterate <file>` — archive the finished round into `history`, keep the `dialog`, and bump `round` for the next pass.

## Architecture invariants (don't regress these)

- **`src/shared/` is the single source of truth.** Zod schemas → derived JSON Schema, TS types, and the skill's authoring guide. Node-safe (no React) so both CLI and Vite import it.
- **`src/web/state.ts` is a pure reducer** — no React, no time, no I/O. `finalizedAt` is stamped by the server, never the reducer. This is what the golden tests pin; keep it pure.
- **Adding a block = add `src/shared/blocks/<name>.ts`** (schema + guide), register it in `src/shared/blocks/registry.ts`, and add a renderer keyed by the same `type` constant in `src/web/blocks/`. Schema/UI/guide derive from the registry — don't hand-maintain them separately.
- **No fallbacks, force upgrade.** Strict/closed schemas (`.strict()`), version match is hard-checked, unknown block `type` is an error. Don't add tolerant/degrading paths.
- **The file is the sole agent contract.** The server is dumb I/O and guards the proposal region as byte-identical read-only; keep logic in the deterministic front end.
- **Audit dependencies whenever they change.** After any `npm install <pkg>` / dependency bump, run `npm audit` and resolve what it reports (`npm audit fix`, or a pinned upgrade) before committing — the initial cut shipped with known vulnerabilities, so treat a clean audit as part of "done" for any dependency change. Prefer adding a dependency only when it earns its keep; this stays a small, few-dependency package.

## Source of truth

Two layers, read both before writing implementation code:

- **`specs/change-proposal-spec.md`** — the **implementation decisions** (architecture, data model, versioning, round-trip, v1 scope). This wins where it and the handoff disagree: the handoff is a visual starting point, not a contract.
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
