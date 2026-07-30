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
export const archStatusSchema = z
  .enum(archStatuses)
  .optional()
  .describe("Change relative to this proposal; omit for unchanged.");
const archStatus = archStatusSchema;

/** A single component: a module, file, table, service, … */
const archItemSchema = z
  .object({
    label: z.string().min(1),
    status: archStatus,
  })
  .strict();
export type ArchItem = z.infer<typeof archItemSchema>;

// ---------------------------------------------------------------------------
// arch-flow — nodes & labeled edges (what calls what at runtime).
// ---------------------------------------------------------------------------

export const archNodeKinds = ["process", "file", "external"] as const;

const flowNodeSchema = z
  .object({
    id: z.string().min(1).describe("Unique id referenced by edges."),
    label: z.string().min(1),
    note: z.string().optional().describe("One short extra line, e.g. a path, port, or role."),
    kind: z
      .enum(archNodeKinds)
      .default("process")
      .describe("process=a running component, file=a stored artifact, external=outside the system."),
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
    "Use to show what calls what while the system is running, and what data passes between",
    "them. Give `nodes` and the `edges` joining them; positions are computed for you, so never",
    "write coordinates. Keep it under about 10 nodes, and make each edge `label` a short verb",
    "phrase. Node `kind`: `process` a running component, `file` a stored artifact, `external`",
    "something outside the system. Mark proposal changes with",
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
// arch-layers — horizontal stack bands (which layer of the system a change belongs to).
// ---------------------------------------------------------------------------

/** Colour accent for a layer's label; styling only (mirrors section accents). */
export const archAccents = ["blue", "green", "red", "amber", "violet", "neutral"] as const;

const layerSchema = z
  .object({
    label: z.string().min(1).describe("Layer name, e.g. 'Review UI'."),
    sublabel: z.string().optional().describe("Short extra note, e.g. 'browser'."),
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
    "Use to show which layer of the system each part belongs to — API, domain, storage, and",
    "so on. `layers` are ordered top to bottom, each listing its `items`; `connector` labels",
    "the arrow down to the next layer. There are no coordinates, only ordered lists. Mark",
    "changed components with `status`. `accent` sets a colour and carries no meaning.",
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
    note: z.string().optional().describe("Short extra note, e.g. 'writes proposal.json'."),
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
      .describe("Optional shared base that every container imports."),
  })
  .strict();
export type ArchBoundariesBlock = z.infer<typeof archBoundariesSchema>;

export const archBoundariesDef: BlockDef<typeof archBoundariesSchema> = {
  type: ARCH_BOUNDARIES,
  schema: archBoundariesSchema,
  guide: [
    "### `arch-boundaries`",
    "Use to show what lives inside the system and what sits outside it (the container level",
    "of the C4 model). `boundary` names the system; `containers` are the units inside it, each",
    "listing its component `children`, which may themselves group one level deep; `actors` are",
    "the outside parties it talks to; `foundation` is a shared base every container imports.",
    "Nesting is the only structure — there are no coordinates.",
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
