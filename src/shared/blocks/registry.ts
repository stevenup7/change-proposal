import { z } from "zod";
import type { BlockDef } from "./types";
import { markdownDef, markdownSchema } from "./markdown";
import { diffDef, diffSchema } from "./diff";
import { calloutDef, calloutSchema } from "./callout";
import {
  archFlowDef,
  archFlowSchema,
  archLayersDef,
  archLayersSchema,
  archBoundariesDef,
  archBoundariesSchema,
} from "./architecture";

// The registry: adding a block = add its module and register it here (and a renderer in
// web/blocks/ keyed by the same `type`). Schema, validation, and skill guidance are all
// derived from this list — they cannot drift.
export const blockDefs: BlockDef[] = [
  markdownDef,
  diffDef,
  calloutDef,
  archFlowDef,
  archLayersDef,
  archBoundariesDef,
];

// Discriminated union of every registered block. Strict/closed: an unknown `type` is a
// validation error (no fallbacks — force upgrade).
export const blockSchema = z.discriminatedUnion("type", [
  markdownSchema,
  diffSchema,
  calloutSchema,
  archFlowSchema,
  archLayersSchema,
  archBoundariesSchema,
]);

export type Block = z.infer<typeof blockSchema>;

/** Assemble the block portion of the authoring guide from every registered block. */
export function blockGuide(): string {
  return blockDefs.map((b) => b.guide).join("\n\n");
}
