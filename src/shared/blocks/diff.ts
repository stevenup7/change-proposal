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
    "A concrete code change as a unified diff. Emit the exact patch when precision matters.",
    "`patch` is unified-diff text: `+` add, `-` delete, `@@` hunk header, else context.",
    "",
    "```json",
    '{ "type": "diff", "filename": "src/sync/merge.ts", "patch": "@@ -12,3 +12,5 @@\\n   const local = await load()\\n-  return remote\\n+  const base = await snapshot()\\n+  return merge(base, local, remote)" }',
    "```",
  ].join("\n"),
};
