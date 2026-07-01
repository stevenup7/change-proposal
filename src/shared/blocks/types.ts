import type { z } from "zod";

// A block module contributes three things from one place: a schema fragment (here),
// a renderer (web/blocks/, keyed by the same `type`), and authoring guidance (`guide`).
// The registry composes all block defs into the global schema + the skill's guide.
export interface BlockDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Discriminator value, e.g. "markdown". Must be unique. */
  type: string;
  /** Zod schema for this block (a strict object with `type: z.literal(...)`). */
  schema: S;
  /** Markdown guidance the skill shows the agent: what this block is and when to use it. */
  guide: string;
}
