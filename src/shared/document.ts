import { z } from "zod";
import { VERSION } from "./version";
import { blockSchema } from "./blocks/registry";

// ---------------------------------------------------------------------------
// Proposal region — authored by the agent, read-only in the UI.
// ---------------------------------------------------------------------------

/** `accent` only drives styling (left border + badge tint). Sections are author-defined. */
export const accents = ["blue", "green", "red", "amber", "violet", "neutral"] as const;
export type Accent = (typeof accents)[number];

export const sectionSchema = z
  .object({
    id: z.string().min(1).describe("Stable unique id; keys the review/comment state."),
    title: z.string().min(1),
    badge: z.string().optional().describe("Short mono label, e.g. 'DB', 'API'."),
    accent: z.enum(accents).default("neutral"),
    summary: z.string().optional().describe("One-line summary shown collapsed (Markdown)."),
    blocks: z.array(blockSchema).default([]),
  })
  .strict();
export type Section = z.infer<typeof sectionSchema>;

export const choiceOptionSchema = z
  .object({ id: z.string().min(1), label: z.string().min(1) })
  .strict();

export const questionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    kind: z.enum(["choice", "text"]),
    options: z.array(choiceOptionSchema).optional().describe("Required for kind='choice'."),
    allowOther: z.boolean().default(false).describe("Choice questions: offer an 'Other…' write-in."),
  })
  .strict();
export type Question = z.infer<typeof questionSchema>;

export const proposalSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional().describe("One-paragraph summary (Markdown)."),
    sections: z.array(sectionSchema).default([]),
    questions: z.array(questionSchema).default([]),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;

// ---------------------------------------------------------------------------
// Response region — authored by the human via the UI. Starts empty.
// ---------------------------------------------------------------------------

export const verdicts = ["approved", "rejected", "changes-requested"] as const;
export type Verdict = (typeof verdicts)[number];

// Document-level intent chosen when the human closes the review. This — not the
// per-section verdicts — is what the agent reads first. Per-section verdicts are
// optional detail layered underneath, so the human never *has* to tick each one.
//   approved → the human agrees; go ahead with whatever this proposal was gating.
//              That is NOT necessarily "write code now" — it may mean draft the full
//              plan, run the migration, etc. The agent decides the next step from
//              the proposal's own content. Approval means agreement, not "implement".
//   discuss  → do NOT go ahead; reply in the dialog and send back another round.
export const outcomes = ["approved", "discuss"] as const;
export type Outcome = (typeof outcomes)[number];

// ---------------------------------------------------------------------------
// Dialog region — the per-section conversation. Shared: the human appends via
// the UI, the agent appends (author: "agent") when authoring the next round.
// Entries carry their round and are never wiped, so a section reads as one
// thread across the whole review, not a fresh form each round.
// ---------------------------------------------------------------------------

export const authors = ["human", "agent"] as const;
export type Author = (typeof authors)[number];

export const dialogEntrySchema = z
  .object({
    round: z.number().int().min(1).describe("Round this entry was written in."),
    author: z.enum(authors),
    text: z.string().min(1),
  })
  .strict();
export type DialogEntry = z.infer<typeof dialogEntrySchema>;

export const answerSchema = z
  .object({
    choice: z.string().optional(),
    other: z.string().optional(),
    text: z.string().optional(),
  })
  .strict();
export type Answer = z.infer<typeof answerSchema>;

// A single conflict-field pick. `side` is a chosen side id or "__other__"; `text`
// carries the write-in when `side === "__other__"`. Mirrors answerSchema's shape.
export const resolutionSchema = z
  .object({ side: z.string(), text: z.string().optional() })
  .strict();
export type Resolution = z.infer<typeof resolutionSchema>;

export const responseSchema = z
  .object({
    review: z.record(z.enum(verdicts)).default({}),
    answers: z.record(answerSchema).default({}),
    // Conflict-block picks, keyed "<blockId>.<fieldId>". First response state a
    // block collects itself (verdicts/answers aside) — the input-block frontier.
    resolutions: z.record(resolutionSchema).default({}),
    feedback: z.string().default(""),
    outcome: z.enum(outcomes).optional().describe("Overall intent, set when the human finalizes."),
    finalizedAt: z.string().optional(),
  })
  .strict();
export type ResponseRegion = z.infer<typeof responseSchema>;

// ---------------------------------------------------------------------------
// Document — the whole file. One doc = one review round.
// ---------------------------------------------------------------------------

export const statuses = ["pending", "in-progress", "finalized"] as const;
export type Status = (typeof statuses)[number];

export const documentSchema = z
  .object({
    version: z.string().describe("Tool version this doc was authored for."),
    status: z.enum(statuses).default("pending"),
    round: z.number().int().min(1).default(1),
    proposal: proposalSchema,
    // Per-section conversation, keyed by section id. Shared, cross-round, never wiped.
    dialog: z.record(z.array(dialogEntrySchema)).default({}),
    response: responseSchema.default({ review: {}, answers: {}, feedback: "" }),
    // Prior rounds' response regions, oldest first. Archived by `startNextRound`.
    history: z.array(responseSchema).default([]),
  })
  .strict();
export type ChangeProposalDocument = z.infer<typeof documentSchema>;

/** A fresh, empty response region (used when authoring or resetting a round). */
export function emptyResponse(): ResponseRegion {
  return { review: {}, answers: {}, resolutions: {}, feedback: "" };
}

/**
 * Begin the next review round: archive the current response into `history`,
 * reset the live response, and bump `round`. The `dialog` is intentionally kept
 * (it carries its own per-entry round), so the conversation survives iteration.
 * Pure — the agent/CLI calls this before re-authoring the proposal for round N+1.
 */
export function startNextRound(doc: ChangeProposalDocument): ChangeProposalDocument {
  return {
    ...doc,
    round: doc.round + 1,
    status: "pending",
    history: [...doc.history, doc.response],
    response: emptyResponse(),
  };
}

/** Parse + validate unknown JSON into a document. Throws ZodError on failure. */
export function parseDocument(data: unknown): ChangeProposalDocument {
  return documentSchema.parse(data);
}

export interface VersionCheck {
  ok: boolean;
  docVersion: string;
  toolVersion: string;
}

/** Strict version match — no fallbacks, force upgrade. */
export function checkVersion(doc: ChangeProposalDocument): VersionCheck {
  return { ok: doc.version === VERSION, docVersion: doc.version, toolVersion: VERSION };
}
