import { z } from "zod";
import type { BlockDef } from "./types";

export const CALLOUT = "callout";

export const calloutTones = ["info", "add", "del", "mod", "warn"] as const;

export const calloutSchema = z
  .object({
    type: z.literal(CALLOUT),
    tone: z
      .enum(calloutTones)
      .default("info")
      .describe("info=neutral, add=safe/positive, del=risk, mod=changed, warn=caution."),
    title: z.string().optional(),
    text: z.string().describe("Markdown body of the callout."),
  })
  .strict();

export type CalloutBlock = z.infer<typeof calloutSchema>;

export const calloutDef: BlockDef<typeof calloutSchema> = {
  type: CALLOUT,
  schema: calloutSchema,
  guide: [
    "### `callout`",
    "A tinted note that draws the eye: a safety guarantee, a risk, a caveat.",
    "`tone`: `info` (neutral), `add` (safe/positive), `del` (risk), `mod` (changed), `warn` (caution).",
    "",
    "```json",
    '{ "type": "callout", "tone": "add", "title": "Safe migration", "text": "Purely additive columns — no backfill, no downtime." }',
    "```",
  ].join("\n"),
};
