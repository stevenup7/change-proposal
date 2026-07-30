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
    "Use for one short point the reviewer must not miss — a risk, a guarantee, a caveat. Keep",
    "it to a sentence or two; if it needs more than that, use `markdown` instead. `tone` sets",
    "the colour: `info` neutral, `add` safe or positive, `del` risky, `mod` changed, `warn`",
    "proceed with caution.",
    "",
    "```json",
    '{ "type": "callout", "tone": "add", "title": "Safe migration", "text": "Purely additive columns — no backfill, no downtime." }',
    "```",
  ].join("\n"),
};
