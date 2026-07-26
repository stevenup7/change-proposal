import { z } from "zod";
import type { BlockDef } from "./types";
import { markdownDef, markdownSchema } from "./markdown";
import { diffDef, diffSchema } from "./diff";
import { calloutDef, calloutSchema } from "./callout";
import { conflictDef, conflictSchema } from "./conflict";
import { schemaDef, schemaSchema } from "./schema";
import { tableDef, tableSchema } from "./table";
import {
  archFlowDef,
  archFlowSchema,
  archLayersDef,
  archLayersSchema,
  archBoundariesDef,
  archBoundariesSchema,
} from "./architecture";
import { erDef, erSchema } from "./er";

// The registry: adding a block = add its module and register it here (and a renderer in
// web/blocks/ keyed by the same `type`). Schema, validation, and skill guidance are all
// derived from this list — they cannot drift.
export const blockDefs: BlockDef[] = [
  markdownDef,
  diffDef,
  calloutDef,
  conflictDef,
  schemaDef,
  tableDef,
  archFlowDef,
  archLayersDef,
  archBoundariesDef,
  erDef,
];

// Discriminated union of every registered block. Strict/closed: an unknown `type` is a
// validation error (no fallbacks — force upgrade). Cross-field checks (a block's `check`)
// run on top: discriminatedUnion members must be plain objects, so the union carries them.
const blockUnion = z.discriminatedUnion("type", [
  markdownSchema,
  diffSchema,
  calloutSchema,
  conflictSchema,
  schemaSchema,
  tableSchema,
  archFlowSchema,
  archLayersSchema,
  archBoundariesSchema,
  erSchema,
]);

export const blockSchema = blockUnion.superRefine((block, ctx) => {
  blockDefs.find((d) => d.type === block.type)?.check?.(block, ctx);
});

export type Block = z.infer<typeof blockUnion>;

/** Assemble the block portion of the authoring guide from every registered block. */
export function blockGuide(): string {
  return blockDefs.map((b) => b.guide).join("\n\n");
}
