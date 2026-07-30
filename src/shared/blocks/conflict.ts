import { z } from "zod";
import type { BlockDef } from "./types";

export const CONFLICT = "conflict";

// A conflicting field: two or more candidate values, the human picks one (or writes
// in their own when `allowOther`). `value` is display text — the renderer shows it verbatim.
export const conflictFieldSchema = z
  .object({
    id: z.string().min(1).describe("Stable field id; keys the resolution as '<blockId>.<fieldId>'."),
    label: z.string().min(1).describe("Short heading — the thing being decided."),
    description: z
      .string()
      .optional()
      .describe("Markdown intro: what this decision is and why it matters. Give the human context before they pick."),
    allowOther: z.boolean().default(false).describe("Offer an 'Other…' write-in beside the sides."),
    sides: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).describe("Which source this value is from, e.g. 'Local'."),
            value: z.string().describe("The literal value shown verbatim — keep it to the value itself."),
            note: z
              .string()
              .optional()
              .describe("What choosing this side means — the trade-off. Put opinion here, never in `value`."),
          })
          .strict(),
      )
      .min(2)
      .describe("The candidate values, e.g. local vs remote."),
  })
  .strict();
export type ConflictField = z.infer<typeof conflictFieldSchema>;

// Unlike render-only blocks, a conflict COLLECTS input, so it carries a stable `id`:
// the human's pick per field lands in `response.resolutions["<id>.<fieldId>"]`.
export const conflictSchema = z
  .object({
    type: z.literal(CONFLICT),
    id: z.string().min(1).describe("Stable block id; keys resolutions per field."),
    title: z.string().optional(),
    fields: z.array(conflictFieldSchema).min(1),
  })
  .strict();

export type ConflictBlock = z.infer<typeof conflictSchema>;

export const conflictDef: BlockDef<typeof conflictSchema> = {
  type: CONFLICT,
  schema: conflictSchema,
  guide: [
    "### `conflict`",
    "Use when you need the human to choose between specific competing values — for example a",
    "3-way-merge collision. This is the only block that collects an answer: each pick lands in",
    "`response.resolutions[\"<blockId>.<fieldId>\"]` as `{ side, text? }`. Give the block and",
    "every field a stable `id`, and set `allowOther: true` to let the human type their own",
    "value instead. The human can finalize without answering; unanswered fields come back",
    "unresolved, for you to decide.",
    "",
    "**Explain before you ask.** Don't make the human infer the decision from bare values:",
    "- Give each field a `description` — a sentence or two on what's being decided and why.",
    "- Keep each side's `value` to the literal value; put the trade-off in its `note`.",
    "",
    "```json",
    '{ "type": "conflict", "id": "merge", "title": "Field conflicts",',
    '  "fields": [',
    '    { "id": "title", "label": "Task title",',
    '      "description": "Both devices renamed this task offline. Pick the name to keep.",',
    '      "allowOther": true, "sides": [',
    '      { "id": "steady", "label": "Steady (local)", "value": "Buy oat milk",',
    '        "note": "What you last typed on your phone." },',
    '      { "id": "google", "label": "Google", "value": "Buy almond milk",',
    '        "note": "What the Google Tasks copy says." } ] } ] }',
    "```",
  ].join("\n"),
};
