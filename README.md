# change-proposal

An interface for coding assistants to generate **change proposal pages** — a structured,
section-by-section approval gate that sits between an agent's plan and its execution,
replacing "read this markdown plan".

The agent breaks a proposed change into reviewable sections (schema, logic, code diffs,
API, types, UI, tests, deps, build) plus open questions; the human approves/rejects each
section, leaves per-section comments, answers the agent's questions, and resolves
conflicts — all routed back to the agent via a single JSON file. **The review surface
itself is the product**; the sample payload (a Google Tasks 3-way-merge fix) is just an
example.

## Requirements

- **Node ≥ 20** (developed on Node 26; Vite 6 needs a modern Node).
- npm.

## Setup

```bash
npm install
```

If `tsx`/`vite` fail right after install, esbuild's binary didn't finish its install
script — rebuild it:

```bash
npm rebuild esbuild
```

When you add or bump a dependency, run `npm audit` and clear what it reports before
committing — the first cut shipped with known vulnerabilities, so a clean audit is part of
"done" for any dependency change. This is meant to stay a small, few-dependency package.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Build the SPA to `dist/web/` — **required before `review` can serve the UI**. |
| `npm test` | Run the deterministic-reducer golden tests (`src/web/state.test.ts`). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run cli -- author` | Print the versioned authoring guide + JSON schema (what the skill fetches). Add `--schema` for just the schema. Use `--silent` on `npm run` to keep stdout clean. |
| `npm run cli -- example proposal.json` | Write a sample proposal you can adapt. |
| `npm run cli -- validate proposal.json` | Validate a proposal against the schema + version. |
| `npm run cli -- review proposal.json` | Validate, serve the UI on `:4179`, and block until you finalize in the browser. |

### Reviewing on a remote/headless box

`review` tries to open a browser but never requires one. Forward the port and open it
locally:

```bash
ssh -L 4179:localhost:4179 <host>   # then browse to http://localhost:4179
```

The surface is also drivable over plain HTTP (`GET /api/proposal`, `PUT /api/document`) —
handy for scripted/headless round-trips.

## How the pieces fit

```
skill  →  CLI (author / review)  →  dumb self-terminating Hono server  →  React SPA
```

- **`src/shared/`** — the single source of truth. Zod schemas derive the JSON Schema, the
  TS types, and the skill's authoring guide. Node-safe (no React).
- **`src/web/state.ts`** — a pure reducer (no React, no time, no I/O); `finalizedAt` is
  stamped by the server, never the reducer. Pinned by the golden tests.
- **`src/server/` + `src/cli/`** — a dumb I/O server that guards the proposal region as
  byte-identical read-only, plus the `author`/`review` CLI.
- **`.claude/skills/change-proposal/`** — the accompanying Claude Code skill that drives
  the flow.

## Docs

- **`specs/change-proposal-spec.md`** — implementation decisions (architecture, data
  model, versioning, round-trip, v1 scope). This is the contract.
- **`design_handoff/`** — the hifi visual/behavioral reference. Read
  `design_handoff/README.md` first; open `Change Proposal.standalone.html` in a browser to
  click through the real design.
- **`CLAUDE.md`** — guidance for Claude Code working in this repo (architecture invariants).

## Status

**v0.5.0** (past the spec's §7 first cut). On top of the first cut it now threads a
per-section conversation across rounds (`dialog`), archives prior rounds into `history`,
and finalizes to one of two outcomes — `approved` (agree & proceed) or `discuss` (save &
iterate). Blocks implemented: `markdown`, `diff`, `callout`, and `conflict` — the first
**input-collecting** block (side-by-side decisions whose picks land in
`response.resolutions`, soft-gated so they never block finalize; each field carries a
`description` and each side an optional `note` so the decision explains itself). The
handoff's modal conflict treatment and other specialized blocks remain deferred.
