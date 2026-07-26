import { z } from "zod";
import type { BlockDef } from "./types";

// Three sibling architecture-diagram blocks sharing one vocabulary. They are separate
// `type`s (not one block with a layout field) so each stays a strict ZodObject with only
// the fields its geometry needs — the outer discriminated union stays closed and exact.

export const ARCH_FLOW = "arch-flow";
export const ARCH_LAYERS = "arch-layers";
export const ARCH_BOUNDARIES = "arch-boundaries";

/** Change-state of a component relative to this proposal. Omit = unchanged. */
export const archStatuses = ["added", "modified", "removed"] as const;
const archStatus = z
  .enum(archStatuses)
  .optional()
  .describe("Change relative to this proposal; omit for unchanged.");

/** A leaf component chip: a module, file, table, service, … */
const archItemSchema = z
  .object({
    label: z.string().min(1),
    status: archStatus,
  })
  .strict();
export type ArchItem = z.infer<typeof archItemSchema>;

// ---------------------------------------------------------------------------
// arch-flow — nodes & labeled edges (runtime story: who calls whom).
// ---------------------------------------------------------------------------

export const archNodeKinds = ["process", "file", "external"] as const;

const flowNodeSchema = z
  .object({
    id: z.string().min(1).describe("Unique id referenced by edges."),
    label: z.string().min(1),
    note: z.string().optional().describe("One short mono subline (path, port, role)."),
    kind: z
      .enum(archNodeKinds)
      .default("process")
      .describe("process=solid box, file=dashed mono artifact, external=out-of-system actor."),
    status: archStatus,
  })
  .strict();
export type ArchFlowNode = z.infer<typeof flowNodeSchema>;

const flowEdgeSchema = z
  .object({
    from: z.string().min(1).describe("Source node id."),
    to: z.string().min(1).describe("Target node id."),
    label: z.string().optional().describe("Short verb phrase, e.g. 'POST finalize'."),
  })
  .strict();
export type ArchFlowEdge = z.infer<typeof flowEdgeSchema>;

export const archFlowSchema = z
  .object({
    type: z.literal(ARCH_FLOW),
    nodes: z.array(flowNodeSchema).min(1),
    edges: z.array(flowEdgeSchema).default([]),
  })
  .strict();
export type ArchFlowBlock = z.infer<typeof archFlowSchema>;

export const archFlowDef: BlockDef<typeof archFlowSchema> = {
  type: ARCH_FLOW,
  schema: archFlowSchema,
  guide: [
    "### `arch-flow`",
    "An architecture diagram of nodes and labeled edges — the runtime story (who calls",
    "whom, what crosses each boundary). Layout is computed automatically left-to-right",
    "from the edges; never think about coordinates. Best under ~10 nodes; edge labels",
    "are short verb phrases. Node `kind`: `process` (solid), `file` (dashed artifact),",
    "`external` (actor outside the system). Mark proposal changes with",
    "`status: added | modified | removed`.",
    "",
    "```json",
    '{ "type": "arch-flow",',
    '  "nodes": [',
    '    { "id": "importer", "label": "Task importer", "note": "src/sync/import.ts" },',
    '    { "id": "merge", "label": "3-way merge", "note": "src/sync/merge.ts", "status": "added" },',
    '    { "id": "db", "label": "tasks.db", "kind": "file" }',
    "  ],",
    '  "edges": [',
    '    { "from": "importer", "to": "merge", "label": "base · local · remote" },',
    '    { "from": "merge", "to": "db", "label": "write merged" }',
    "  ] }",
    "```",
  ].join("\n"),
};

// ---------------------------------------------------------------------------
// arch-layers — horizontal stack bands (altitude: which layer a change lives in).
// ---------------------------------------------------------------------------

/** Styling-only accent for a layer's label rail (mirrors section accents). */
export const archAccents = ["blue", "green", "red", "amber", "violet", "neutral"] as const;

const layerSchema = z
  .object({
    label: z.string().min(1).describe("Layer name, e.g. 'Review UI'."),
    sublabel: z.string().optional().describe("Short mono note, e.g. 'browser'."),
    accent: z.enum(archAccents).default("neutral"),
    items: z.array(archItemSchema).min(1),
    connector: z
      .string()
      .optional()
      .describe("Label on the arrow to the NEXT layer, e.g. 'GET /proposal · POST finalize'."),
  })
  .strict();
export type ArchLayer = z.infer<typeof layerSchema>;

export const archLayersSchema = z
  .object({
    type: z.literal(ARCH_LAYERS),
    layers: z.array(layerSchema).min(1).describe("Top-to-bottom stack order."),
  })
  .strict();
export type ArchLayersBlock = z.infer<typeof archLayersSchema>;

export const archLayersDef: BlockDef<typeof archLayersSchema> = {
  type: ARCH_LAYERS,
  schema: archLayersSchema,
  guide: [
    "### `arch-layers`",
    "An architecture diagram as horizontal stack bands, top-to-bottom, with components as",
    "chips — answers 'which layer does this change live in?'. Zero geometry: just ordered",
    "lists. `connector` labels the arrow to the next layer. Mark changed components with",
    "`status`; `accent` tints the layer's label rail (styling only).",
    "",
    "```json",
    '{ "type": "arch-layers",',
    '  "layers": [',
    '    { "label": "API", "sublabel": "hono", "accent": "blue",',
    '      "items": [ { "label": "sync router", "status": "modified" } ],',
    '      "connector": "invokes" },',
    '    { "label": "Domain", "accent": "violet",',
    '      "items": [ { "label": "merge rules", "status": "added" }, { "label": "importer" } ] }',
    "  ] }",
    "```",
  ].join("\n"),
};

// ---------------------------------------------------------------------------
// arch-boundaries — C4-style nested containers (ownership: what lives where).
// ---------------------------------------------------------------------------

const actorSchema = z
  .object({
    label: z.string().min(1),
    note: z.string().optional().describe("Short mono note, e.g. 'writes proposal.json'."),
  })
  .strict();
export type ArchActor = z.infer<typeof actorSchema>;

/** A component inside a container; may hold one level of grouped children. */
const componentSchema = z
  .object({
    label: z.string().min(1),
    status: archStatus,
    children: z
      .array(archItemSchema)
      .optional()
      .describe("Optional sub-group (e.g. a folder's modules). One level deep."),
  })
  .strict();
export type ArchComponent = z.infer<typeof componentSchema>;

const containerSchema = z
  .object({
    label: z.string().min(1).describe("Container name, e.g. 'src/web' or 'billing-service'."),
    tech: z.string().optional().describe("Short tech tag, e.g. 'react spa'."),
    status: archStatus,
    children: z.array(componentSchema).default([]),
  })
  .strict();
export type ArchContainer = z.infer<typeof containerSchema>;

export const archBoundariesSchema = z
  .object({
    type: z.literal(ARCH_BOUNDARIES),
    boundary: z.string().min(1).describe("Name of the system boundary, e.g. the package or service."),
    actors: z.array(actorSchema).default([]).describe("External actors above the boundary."),
    containers: z.array(containerSchema).min(1),
    foundation: containerSchema
      .optional()
      .describe("Optional shared base every container imports; rendered full-width below."),
  })
  .strict();
export type ArchBoundariesBlock = z.infer<typeof archBoundariesSchema>;

export const archBoundariesDef: BlockDef<typeof archBoundariesSchema> = {
  type: ARCH_BOUNDARIES,
  schema: archBoundariesSchema,
  guide: [
    "### `arch-boundaries`",
    "A C4-style ownership map: a dashed system `boundary` holding container boxes with",
    "component chips inside (one optional level of grouped `children`), external `actors`",
    "above, and an optional `foundation` container every other container imports (rendered",
    "full-width below). No geometry — nesting is the only structure.",
    "",
    "```json",
    '{ "type": "arch-boundaries",',
    '  "boundary": "task-app",',
    '  "actors": [ { "label": "Google Tasks API", "note": "remote source" } ],',
    '  "containers": [',
    '    { "label": "src/sync", "tech": "node", "status": "modified",',
    '      "children": [ { "label": "merge.ts", "status": "added" }, { "label": "import.ts", "status": "modified" } ] }',
    "  ],",
    '  "foundation": { "label": "src/db", "tech": "sqlite", "children": [ { "label": "Task", "status": "modified" } ] } }',
    "```",
  ].join("\n"),
};
