# Handoff: Coding-Agent Change Proposal / Review Surface

## Overview
This is a **review surface** a coding agent presents to a human before it starts implementing. The agent has produced a plan for a real bug fix ("importing from Google Tasks overwrites your local edits") and broken it into reviewable sections — schema, business logic, code diffs, API, types, UI, tests, dependencies, build. The human approves or requests changes per section, leaves per-section comments, answers the agent's open questions, and either approves all or sends feedback. The example payload is a 3-way-merge fix, but the surface is a reusable pattern: **a structured, section-by-section approval gate between an agent's plan and its execution.**

The design is a single self-contained page (sticky header → core-change cards → secondary cards → "Questions from the agent" → modals).

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype showing the intended look and behavior, **not production code to copy directly**. The task is to **recreate this design in your target codebase's existing environment** (React, Vue, Svelte, etc.) using its established components, design tokens, and patterns. If no front-end environment exists yet, pick the most appropriate framework and implement it there.

Two files are included:
- `Change Proposal.dc.html` — the authored source. It's a "Design Component": markup is plain inline-styled HTML; logic lives in a single `class Component` at the bottom (a React-class-like shape — `state`, `setState`, and a `renderVals()` that returns the values the template binds to). Read this to understand state and behavior precisely.
- `Change Proposal.standalone.html` — the same design bundled into one offline file (fonts inlined). Open this in a browser to click through the real thing.

To preview behavior, open the standalone file and interact: toggle approve/reject on each section, expand the diffs and decision table, open the conflict modal, collapse the questions panel, switch the theme.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, dark+light themes, hover states, and interactions are all specified. Recreate the UI faithfully using your codebase's existing primitives — but map the visual tokens below onto your own design system rather than hard-coding these hexes if you already have equivalents.

## Layout Foundations
- **Page**: `font-family: 'IBM Plex Sans'`; body background `var(--bg)`; `min-height: 100vh`; antialiased.
- **Content column**: every region is centered in `max-width: 980px` with `padding: 0 28px` (header) / `22px 28px 48px` (main).
- **Main**: vertical `flex`, `gap: 14px` between cards.
- **Two type families only**: IBM Plex Sans for all prose/UI; IBM Plex Mono for code, counts, badges, field keys, and small meta labels (weights — Sans 400/500/600/700, Mono 400/500/600).

## Screens / Views

### 1. Sticky Header
- **Purpose**: identity of the proposal + global review controls; stays pinned on scroll.
- **Layout**: `position: sticky; top: 0; z-index: 40`. Translucent background `color-mix(in srgb, var(--bg) 86%, transparent)` with `backdrop-filter: blur(12px)` and a `1px` bottom border (`var(--border)`).
  - **Row 1**: 32×32 rounded-9px tile (mono `◇` glyph, `var(--primary)`) · H1 title (`21px / 600 / letter-spacing -.02em / line-height 1.2`) · 34×34 theme-toggle button (sun `☀` in dark, moon `☾` in light).
  - **Description**: paragraph, `13.5px / line-height 1.5 / var(--text-dim)`, `max-width: 680px`, indented `margin-left: 45px` to align under the title. Wrapped in `#cp-desc` which animates `max-height 88px→0` + opacity on collapse (`transition: max-height .34s cubic-bezier(.4,0,.2,1)`).
  - **Row 3 (progress + actions)**: collapse-all chevron button (rotates `0deg`↔`-90deg`) · progress bar (`flex:1; height:5px; radius 3px`, track `var(--surface-3)`, fill `var(--primary)` width = % reviewed, `transition: width .35s`) · mono progress text "`N / 9 sections reviewed`" · **Send feedback** button (outlined, speech-bubble icon) · **Approve all** button (solid `var(--primary)`, white text).

### 2. Section band label
- A thin row above the core cards: a small dot + mono uppercase "CORE CHANGES" + dim note "— review carefully", with right-aligned mono tab hints ("schema · logic · code"). Purely a visual section divider.

### 3. Review Section Card (the core repeated unit — 9 instances)
Sections by id: `db` (Database schema), `logic` (Business logic), `code` (Code changes), `api` (API changes), `types` (Types & interfaces), `ui` (UI components), `tests` (Tests), `deps` (Libraries & imports), `build` (Build & migration).

- **Shell**: `background: var(--surface)`; `1px` border `var(--border)`; `border-left: 3px solid <accent>` (accent varies per section — see below); `border-radius: 11px`; `box-shadow: var(--shadow)`; `overflow: hidden`. **Reviewed cards recede**: `opacity: 0.58` once approved/rejected (vs `1`), with `transition: opacity`.
- **Header row** (clickable to expand/collapse, `role="button"`, `aria-expanded`): `display:flex; align-items:center; gap:13px; padding:15px 17px`.
  - **Chevron** (left): 14px-wide span, `var(--text-faint)`, an 11px down-chevron SVG (`polyline points="6 9 12 15 18 9"`, `stroke-width 3`, round caps); `transform: rotate(0deg)` open / `rotate(-90deg)` collapsed; `transition: transform .2s cubic-bezier(.4,0,.2,1)`.
  - **Type badge**: mono pill `min-width:38px; height:22px; radius 6px`, tinted to the section accent (e.g. DB on `var(--mod-bg)` / `var(--mod)`).
  - **Title block**: title `14px / 600`; an optional faint `400 / 12px` count suffix (e.g. "— 9 proposed"); a `12px` dim summary line beneath.
  - **Right side**: optional review status pill (mono `10px / 600`, "approved" on add-tint, "changes" on del-tint) · optional comment-count chip · **action cluster** (`onClick` stops propagation so it doesn't toggle): 28×28 **comment** button, 28×28 **approve** button, 28×28 **reject** button.
- **Approve button states**: idle = `var(--surface-2)` bg / `var(--border)` border / `var(--text-faint)` icon; approved = `var(--add)` bg / `var(--add)` border / `#04130a` icon. Icon is a **geometric checkmark SVG** (`viewBox 0 0 24 24`, `polyline points="4 12.5 9.5 18 20 6"`, `stroke-width 2.6`, round caps) — deliberately matched to the reject `✕` glyph's weight; do **not** use a default Unicode `✓` (too calligraphic).
- **Reject button states**: idle same as approve idle; rejected = `var(--del)` bg / white `✕` glyph / `var(--del)` border.
- **Body** (shown when expanded): `border-top: 1px solid var(--border); padding: 17px`. Content differs per section (see below).

**Section accents** (left border / badge tint):
- db → `--mod` (amber); logic → `--conflict` (violet, plus a faint violet glow ring); code → `--primary` (blue); api → `--add` (green); types/ui/deps/build → `--border-strong` (neutral) except ui uses `--primary` badge and tests/api/deps/build use `--add`.

### 3a. Database schema body
- Two tabs ("Schema diagram" / "Columns"), tab = underline in `var(--primary)` when active, `var(--text-faint)` when not.
- **Diagram**: three entity cards (User · Task[CHANGED] · GoogleTaskItem) connected by labeled edges ("owns", "snapshot"). Each entity is a titled card listing `PK/FK`-tagged mono field rows. New columns on Task highlighted.
- **Columns**: tabular list of the 4 new columns with types.

### 3b. Business logic body
- A vertical list of **merge rules**, each a card: a tinted tag (`no-op`, `← pull`, `push →`, `converge`, `⚑ conflict`), a title, a description, and a right-side fidelity chip ("EXACT RULE" vs "NEEDS DECISION"). The conflict rule is violet-tinted, `cursor:pointer`, and opens the conflict modal.
- A toggle button "**+ view exact decision table**" / "**− hide exact decision table**" reveals a precise base×google×steady → action table.

### 3c. Code changes body
- A list of **modules**, each: `NEW`/`MOD` badge (green/amber) + colored dot, mono file path, a summary line, an optional bullet list of guidance, and a fidelity chip ("EXACT DIFF" / "GUIDANCE").
- Modules with a pinned diff get a "**+ view exact diff**" toggle that expands a mono diff block. **Diff line styles**: hunk (`var(--surface-2)` bg, faint), del (`var(--del-line)` bg, `var(--del)` text), add (`var(--add-line)` bg, `var(--add)` text), ctx (transparent, `var(--text-dim)`); each row has a mono line-number gutter.

### 3d / 3e / 3f. API · Types · UI · Tests · Deps · Build bodies
- Prose + tinted callouts (e.g. a green "Safe" note for the additive migration, a green "Zero new packages" note for deps). UI section has its own "Anatomy / States / Placement" tabs (same underline-tab pattern). These are lower-fidelity, content-led — recreate the copy and the callout treatment, lay out with your own components.

### 4. Questions from the agent (collapsible panel)
- **Shell**: like a section card but `border-left: 3px solid var(--primary)` plus a faint primary glow ring (`box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent), var(--shadow)`).
- **Header is a single `<button>`** (full-width, transparent, `cursor:pointer`) toggling the panel: left chevron (same component/rotation as section cards) · mono `?` badge on `var(--primary-bg)` · title "Questions from the agent" + dim subtitle · right-aligned mono "`N of 5 answered`" progress.
- **Body** (when open): vertical list of question cards. Each card: the question prompt (`13.5px / 500`) + a status pill ("answered" green / "pick one" / "awaiting answer").
  - **Choice questions**: a column of option buttons, each with a mono letter chip (A/B/C…, `+` for "Other…"). Selected = `var(--primary)` border + `var(--primary-bg)` + primary letter chip. Choosing "Other…" reveals a free-text input.
  - **Text questions**: a `<textarea>` (min-height 64px).

### 5. Conflict resolution modal
- **Overlay**: `position:fixed; inset:0; z-index:60; background: rgba(4,6,10,.5)`, items aligned to the bottom-center; `animation: mp-fade .15s`.
- **Dialog**: `role="dialog" aria-modal`, `max-width: 980px`, `margin: 0 28px 28px`, `var(--surface)` bg, `1px` strong border, `radius 12px`, `box-shadow: var(--shadow)`, `padding 16px`; `animation: mp-in .2s cubic-bezier(.4,0,.2,1)` (rises + slight scale).
- **Content**: per conflicting field (title, due date), show **Steady value** vs **Google value** side by side; the user picks one (selected card gets the accent border + tint — green for Steady, blue for Google). Footer shows "`N / 2 fields chosen`"; the resolve button is disabled (`var(--surface-3)` / faint / `not-allowed`) until both are chosen, then `var(--conflict)` / white / pointer.

### 6. Composer modal (feedback / comment)
- Same overlay + bottom-sheet dialog shell as the conflict modal.
- **Title + mono tag** (e.g. "Send feedback · → coding agent", or "Comment on <Section> · <Section>").
- For global feedback only, a **two-option type picker**: "Ask a question" (`?` dot, "non-blocking · expects an answer") vs "Request changes" (`!` dot, "blocks approval · agent revises"); selected option tinted primary (question) or del (changes). Hidden for per-section comments.
- A `<textarea>` (min-height 84px) with a mode-specific placeholder, then a send button ("Send to agent" / "Post comment").

## Interactions & Behavior
- **Expand/collapse**: each section header and the questions header toggle their body. The header chevron rotates `0deg`↔`-90deg` over `.2s`. Collapse-all button in the header opens/closes every section at once (and flips its own chevron).
- **Approve / Reject per section**: clicking sets that section's review state; the action buttons restyle, a status pill appears, and the **whole card fades to `opacity .58`** to push solved items into the background. Clicking the action cluster never toggles the card (propagation stopped).
- **Approve all**: marks every section approved at once → progress bar fills to 100%.
- **Comment**: opens the composer in `comment` mode targeted at that section; on send, the text is pushed into `comments[sectionId]` and a comment-count chip appears on the header.
- **Send feedback**: opens the composer in `question`/`changes` mode (global, no target).
- **Questions panel**: choice buttons set `answers[qid].choice`; selecting "Other…" reveals the write-in; text questions write `answers[qid].text`. The "N of 5 answered" count updates live (a choice counts as answered only if it has a value, and "Other" counts only when its write-in is non-empty).
- **Decision table / exact diffs**: per-item toggles that expand precise reference content; button label flips between "+ view…" and "− hide…".
- **Conflict modal**: opened from the violet conflict rule or its trigger; resolve button stays disabled until all fields are chosen.
- **Theme toggle**: flips `data-theme` between `dark`/`light` on the root wrapper, swapping the entire token set; icon flips ☀/☾.
- **Animations**: `mp-in` (modal rise, `.2s cubic-bezier(.4,0,.2,1)`), `mp-fade` (overlay, `.15s`), progress width (`.35s cubic-bezier(.4,0,.2,1)`), chevrons (`.2s`), description collapse (`.34s`).

## State Management
All state lives on one component (recreate as component state / a store):
- `open: {[sectionId]: bool}` — which section bodies are expanded.
- `review: {[sectionId]: 'approved' | 'rejected'}` — per-section verdict.
- `comments: {[sectionId]: string[]}` — per-section comment threads.
- `answers: {[questionId]: { choice?: string, other?: string, text?: string }}` — question responses.
- `questionsOpen: bool` — the questions panel collapse state (defaults open; treat `!== false` as open).
- `theme: 'dark' | 'light'`.
- `dbTab: 'diagram'|'columns'`, `uiTab: 'anatomy'|'states'|'placement'` — in-card tabs.
- `codeDiffOpen: {[index]: bool}`, `logicTableOpen: bool` — reference-content toggles.
- `choice: {[field]: 'steady'|'google'}` — conflict-modal picks.
- `modalOpen: bool`; `composerOpen: bool`, `composerMode: 'question'|'changes'|'comment'`, `composerTarget: sectionId|null`.
- **Derived**: progress = count of sections with a review state ÷ 9; question progress = answered count ÷ 5; resolve readiness = both conflict fields chosen.
- **No data fetching** — all content is static in the prototype. In production these payloads (sections, diffs, questions, conflicts) come from the agent; wire them to your agent/run API and POST back approvals, comments, answers, and resolutions.

## Design Tokens

### Colors — Dark (default)
- `--bg #0c0f14` · `--surface #12161d` · `--surface-2 #1a1f28` · `--surface-3 #222834`
- `--border #262d38` · `--border-strong #3a434f`
- `--text #e7ebf1` · `--text-dim #9aa4b4` · `--text-faint #6b7585`
- `--add #4ec07a` (bg `rgba(78,192,122,.13)`, line `rgba(78,192,122,.07)`)
- `--del #f0726b` (bg `rgba(240,114,107,.13)`, line `rgba(240,114,107,.07)`)
- `--mod #e0a93f` (bg `rgba(224,169,63,.14)`)
- `--conflict #b07cf0` (bg `rgba(176,124,240,.15)`)
- `--primary #5a9cf8` (bg `rgba(90,156,248,.14)`)
- `--shadow 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.28)`

### Colors — Light (`[data-theme="light"]`)
- `--bg #f4f6f9` · `--surface #ffffff` · `--surface-2 #f3f5f8` · `--surface-3 #eaeef3`
- `--border #e2e6ec` · `--border-strong #cdd4de`
- `--text #1a1f28` · `--text-dim #5b6573` · `--text-faint #8c97a6`
- `--add #1a7f43` · `--del #cf2f2f` · `--mod #9a6a00` · `--conflict #7b3fe4` · `--primary #1f6fdc` (each with matching low-alpha bg/line, see source `:root` blocks)
- `--shadow 0 1px 2px rgba(15,30,55,.08), 0 8px 22px rgba(15,30,55,.08)`

### Typography
- Families: **IBM Plex Sans** (UI/prose), **IBM Plex Mono** (code, counts, badges, keys, meta labels).
- Scale in use: H1 21/600; section title 14/600; body 13.5/1.5; dim summary 12; meta + counts 11–11.5 mono; badges/pills 9–10.5 mono; small option labels 12.5.
- Letter-spacing: −.02em on H1; +.03em on mono badges.

### Spacing & shape
- Content max-width 980px; horizontal padding 28px.
- Card radius 11–12px; button/pill radius 6–9px; small chips/letter-chips radius 5–8px / 999px.
- Common paddings: card header `15px 17px`; card body `17px`; small buttons 28×28; modal `16px`.
- Card gap 14px; intra-row gaps 9–14px.

### Icons (all inline stroke SVG, `viewBox 0 0 24 24`, round caps/joins)
- Chevron: `polyline 6 9 12 15 18 9`, `stroke-width 3`.
- Approve check: `polyline 4 12.5 9.5 18 20 6`, `stroke-width 2.6`.
- Reject: Unicode `✕` glyph.
- Feedback: speech-bubble path (see header). Theme: `☀` / `☾` glyphs. Logo: `◇` glyph.

## Assets
- **No raster images, no icon library.** All icons are inline SVG or Unicode glyphs (`◇ ☀ ☾ ✕ ⚑ ← →`). All entity/schema diagrams are built from styled HTML — recreate with your own layout primitives or a diagram lib.
- **Fonts**: IBM Plex Sans + IBM Plex Mono (Google Fonts). The standalone file has them inlined; in your codebase, load them via your normal font pipeline.

## Files
- `Change Proposal.dc.html` — authored source (markup + the `Component` logic class with all state/derived values). The single best reference for behavior.
- `Change Proposal.standalone.html` — runnable offline bundle; open in a browser to interact with the real design.
