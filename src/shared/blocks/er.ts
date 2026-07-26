import { z } from "zod";
import type { BlockDef } from "./types";
import { archStatusSchema } from "./architecture";

// Entity-relationship diagram: tables/models as titled cards with tagged field rows,
// connected by labeled relationships. The natural block for describing a data model —
// and, with `status`, for proposing changes to one. Layout is automatic (same engine
// as arch-flow); the author never writes coordinates.

export const ER = "er";

export const erFieldTags = ["PK", "FK", "UQ", "IDX"] as const;

const erFieldSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().optional().describe("Column/field type, shown dim on the right."),
    tags: z.array(z.enum(erFieldTags)).default([]).describe("PK/FK/UQ/IDX chips."),
    status: archStatusSchema,
  })
  .strict();
export type ErField = z.infer<typeof erFieldSchema>;

const erEntitySchema = z
  .object({
    id: z.string().min(1).describe("Unique id referenced by relations."),
    label: z.string().min(1).describe("Entity/table name, e.g. 'Task'."),
    note: z.string().optional().describe("One short mono subline (table name, store)."),
    status: archStatusSchema,
    fields: z.array(erFieldSchema).min(1),
  })
  .strict();
export type ErEntity = z.infer<typeof erEntitySchema>;

const erRelationSchema = z
  .object({
    from: z.string().min(1).describe("Source entity id."),
    to: z.string().min(1).describe("Target entity id."),
    label: z.string().optional().describe("Relationship, e.g. 'owns · 1:N'."),
  })
  .strict();
export type ErRelation = z.infer<typeof erRelationSchema>;

export const erSchema = z
  .object({
    type: z.literal(ER),
    entities: z.array(erEntitySchema).min(1),
    relations: z.array(erRelationSchema).default([]),
  })
  .strict();
export type ErBlock = z.infer<typeof erSchema>;

export const erDef: BlockDef<typeof erSchema> = {
  type: ER,
  schema: erSchema,
  guide: [
    "### `er`",
    "An entity-relationship diagram: entities as cards listing `PK`/`FK`/`UQ`/`IDX`-tagged",
    "field rows, connected by labeled relations. Layout is automatic — never write",
    "coordinates. Use for data models: when *describing* a system, omit `status`; when",
    "*proposing* schema changes, mark entities/fields `added | modified | removed`.",
    "",
    "```json",
    '{ "type": "er",',
    '  "entities": [',
    '    { "id": "user", "label": "User",',
    '      "fields": [ { "name": "id", "type": "uuid", "tags": ["PK"] }, { "name": "email", "type": "text", "tags": ["UQ"] } ] },',
    '    { "id": "task", "label": "Task", "note": "tasks",',
    '      "fields": [',
    '        { "name": "id", "type": "uuid", "tags": ["PK"] },',
    '        { "name": "userId", "type": "uuid", "tags": ["FK", "IDX"] },',
    '        { "name": "syncedAt", "type": "timestamptz", "status": "added" }',
    "      ] }",
    "  ],",
    '  "relations": [ { "from": "user", "to": "task", "label": "owns · 1:N" } ] }',
    "```",
  ].join("\n"),
};
