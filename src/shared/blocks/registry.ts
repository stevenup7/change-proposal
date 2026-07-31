import { z } from "zod";
import type { BlockDef } from "./types";
import { markdownDef, markdownSchema } from "./markdown";
import { diffDef, diffSchema } from "./diff";
import { calloutDef, calloutSchema } from "./callout";
import { conflictDef, conflictSchema } from "./conflict";
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

/**
 * One line per registered block — the catalog the agent loads up front. It names what
 * exists; the agent then fetches the full guide + schema for the few blocks it will use
 * (`author --block <type>`), instead of carrying all nine specs it mostly won't need.
 */
export function blockCatalog(): string {
  return blockDefs.map((b) => `- \`${b.type}\` — ${b.summary}`).join("\n");
}

/** Look up one block def by `type`. Unknown types are an error — no fallbacks. */
export function blockDefFor(type: string): BlockDef {
  const def = blockDefs.find((d) => d.type === type);
  if (!def) {
    throw new Error(
      `unknown block type '${type}'. Known types: ${blockDefs.map((d) => d.type).join(", ")}`,
    );
  }
  return def;
}
