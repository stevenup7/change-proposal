import { z } from "zod";
import type { BlockDef } from "./types";

export const CONFLICT = "conflict";

// A conflicting field: two or more candidate values, the human picks one (or writes
// in their own when `allowOther`). `value` is display text — the renderer shows it verbatim.
export const conflictFieldSchema = z
  .object({
    id: z.string().min(1).describe("Stable field id; keys the resolution as '<blockId>.<fieldId>'."),
    label: z.string().min(1),
    allowOther: z.boolean().default(false).describe("Offer an 'Other…' write-in beside the sides."),
    sides: z
      .array(z.object({ id: z.string().min(1), label: z.string().min(1), value: z.string() }).strict())
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
    "A structured decision: per field, the human picks one of two-or-more candidate values",
    "(e.g. a 3-way-merge collision). Unlike other blocks it collects input — the pick lands",
    "in `response.resolutions[\"<blockId>.<fieldId>\"]` as `{ side, text? }`.",
    "Give the block a stable `id`, each field a stable `id`, and set `allowOther: true` to",
    "offer a free-text write-in beside the sides. It never blocks finalize (soft gate).",
    "",
    "```json",
    '{ "type": "conflict", "id": "merge", "title": "Field conflicts",',
    '  "fields": [',
    '    { "id": "title", "label": "Task title", "allowOther": true, "sides": [',
    '      { "id": "steady", "label": "Steady (local)", "value": "Buy oat milk" },',
    '      { "id": "google", "label": "Google", "value": "Buy almond milk" } ] } ] }',
    "```",
  ].join("\n"),
};
