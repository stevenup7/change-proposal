import { z } from "zod";
import type { BlockDef } from "./types";

export const MARKDOWN = "markdown";

export const markdownSchema = z
  .object({
    type: z.literal(MARKDOWN),
    text: z.string().describe("Markdown body. Rendered as prose."),
  })
  .strict();

export type MarkdownBlock = z.infer<typeof markdownSchema>;

export const markdownDef: BlockDef<typeof markdownSchema> = {
  type: MARKDOWN,
  schema: markdownSchema,
  guide: [
    "### `markdown`",
    "General prose: explanation, rationale, bullet lists, guidance.",
    "Use for anything narrative. Standard Markdown (headings, lists, `code`, **bold**).",
    "",
    "```json",
    '{ "type": "markdown", "text": "Replace the one-way mirror with a **3-way merge**.\\n\\n- pull remote-only edits\\n- push local-only edits" }',
    "```",
  ].join("\n"),
};
