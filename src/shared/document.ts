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

export const answerSchema = z
  .object({
    choice: z.string().optional(),
    other: z.string().optional(),
    text: z.string().optional(),
  })
  .strict();
export type Answer = z.infer<typeof answerSchema>;

export const responseSchema = z
  .object({
    review: z.record(z.enum(verdicts)).default({}),
    comments: z.record(z.array(z.string())).default({}),
    answers: z.record(answerSchema).default({}),
    feedback: z.string().default(""),
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
    response: responseSchema.default({
      review: {},
      comments: {},
      answers: {},
      feedback: "",
    }),
  })
  .strict();
export type ChangeProposalDocument = z.infer<typeof documentSchema>;

/** A fresh, empty response region (used when authoring or resetting a round). */
export function emptyResponse(): ResponseRegion {
  return { review: {}, comments: {}, answers: {}, feedback: "" };
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
