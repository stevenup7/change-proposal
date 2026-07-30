import { z } from "zod";
import type { BlockDef } from "./types";

export const DIFF = "diff";

export const diffSchema = z
  .object({
    type: z.literal(DIFF),
    filename: z.string().optional().describe("Path shown in the diff header."),
    language: z.string().optional().describe("Language hint (informational)."),
    patch: z
      .string()
      .describe(
        "Unified-diff text. Lines beginning with '+' are additions, '-' deletions, " +
          "'@@' hunk headers, anything else context. The renderer classifies lines deterministically.",
      ),
  })
  .strict();

export type DiffBlock = z.infer<typeof diffSchema>;

export const diffDef: BlockDef<typeof diffSchema> = {
  type: DIFF,
  schema: diffSchema,
  guide: [
    "### `diff`",
    "Use when the exact code change is what the reviewer needs to see and a summary would",
    "leave doubt. `patch` is unified-diff text: `+` adds a line, `-` deletes one, `@@` starts",
    "a hunk, anything else is unchanged context.",
    "",
    "```json",
    '{ "type": "diff", "filename": "src/sync/merge.ts", "patch": "@@ -12,3 +12,5 @@\\n   const local = await load()\\n-  return remote\\n+  const base = await snapshot()\\n+  return merge(base, local, remote)" }',
    "```",
  ].join("\n"),
};
