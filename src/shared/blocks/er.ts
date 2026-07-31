import { z } from "zod";
import type { BlockDef } from "./types";
import { archStatusSchema } from "./architecture";
import { tableContentSchema, checkTableContent } from "./table";

// Entity-relationship diagram: tables/models with their tagged fields, connected by
// labeled relationships. The block for describing a data model — and, with `status`,
// for proposing changes to one. Positions are computed automatically (same engine as
// arch-flow); the author never writes coordinates.

export const ER = "er";

export const erFieldTags = ["PK", "FK", "UQ", "IDX"] as const;

const erFieldSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().optional().describe("Column/field type, e.g. 'uuid'."),
    tags: z.array(z.enum(erFieldTags)).default([]).describe("Field tags: PK primary key, FK foreign key, UQ unique, IDX indexed."),
    ref: z
      .string()
      .optional()
      .describe("For an FK-tagged field: the entity id it points at. Must name an entity in this block."),
    status: archStatusSchema,
  })
  .strict();
export type ErField = z.infer<typeof erFieldSchema>;

const erEntitySchema = z
  .object({
    id: z.string().min(1).describe("Unique id referenced by relations."),
    label: z.string().min(1).describe("Entity/table name, e.g. 'Task'."),
    note: z.string().optional().describe("One short extra line, e.g. the table name or store."),
    status: archStatusSchema,
    fields: z.array(erFieldSchema).min(1),
  })
  .strict();
export type ErEntity = z.infer<typeof erEntitySchema>;

const erRelationSchema = z
  .object({
    from: z.string().min(1).describe("Source entity id."),
    to: z.string().min(1).describe("Target entity id."),
    label: z.string().optional().describe("Relationship name shown above the line, e.g. 'owns'."),
    fromEnd: z.string().optional().describe("Cardinality marker at the `from` end, e.g. '1'."),
    toEnd: z.string().optional().describe("Cardinality marker at the `to` end, e.g. 'N' or '∞'."),
  })
  .strict();
export type ErRelation = z.infer<typeof erRelationSchema>;

export const erSchema = z
  .object({
    type: z.literal(ER),
    entities: z.array(erEntitySchema).min(1),
    relations: z.array(erRelationSchema).default([]),
    columns: tableContentSchema
      .optional()
      .describe("Optional columns table (same shape as the `table` block). When present, the reader can switch between the diagram and this table."),
  })
  .strict();
export type ErBlock = z.infer<typeof erSchema>;

// Field `ref`s are cross-checked (they drive the FK-hover highlight, so a dangling id
// is a hard error), as is the embedded columns table. Relations that name a missing
// entity are instead shown in the UI (UnknownRefs) — the same tolerant handling the
// arch-flow diagrams give their edges.
function checkErBlock(block: ErBlock, ctx: z.RefinementCtx): void {
  const ids = new Set(block.entities.map((e) => e.id));
  block.entities.forEach((entity, ei) => {
    entity.fields.forEach((field, fi) => {
      if (field.ref === undefined) return;
      if (!field.tags.includes("FK")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entities", ei, "fields", fi, "ref"],
          message: "`ref` is only meaningful on an FK-tagged field",
        });
      } else if (!ids.has(field.ref)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entities", ei, "fields", fi, "ref"],
          message: `unknown entity id '${field.ref}'`,
        });
      }
    });
  });
  if (block.columns) checkTableContent(block.columns, ctx, ["columns"]);
}

export const erDef: BlockDef<typeof erSchema> = {
  type: ER,
  schema: erSchema,
  check: checkErBlock,
  summary: "a data model: entities, their fields, and the relations joining them",
  guide: [
    "### `er`",
    "Use for a data model: `entities` (tables or models) listing their fields, joined by",
    "`relations`. Positions are computed for you, so never write coordinates. Tag fields",
    "`PK`, `FK`, `UQ` or `IDX`. When describing a system as it is, omit `status`; when",
    "proposing schema changes, mark the entities and fields you are changing",
    "`added | modified | removed`. On an FK-tagged field, set `ref` to the entity id it points",
    "at; a `ref` naming no entity in this block is an error. Add a `columns` table (same shape",
    "as the `table` block) when the fields need types and per-column notes the diagram cannot",
    "hold — the reader can then switch between the two. Omit it to show only the diagram.",
    "",
    "```json",
    '{ "type": "er",',
    '  "entities": [',
    '    { "id": "user", "label": "User",',
    '      "fields": [ { "name": "id", "type": "uuid", "tags": ["PK"] }, { "name": "email", "type": "text", "tags": ["UQ"] } ] },',
    '    { "id": "task", "label": "Task", "note": "tasks", "status": "modified",',
    '      "fields": [',
    '        { "name": "id", "type": "uuid", "tags": ["PK"] },',
    '        { "name": "userId", "type": "uuid", "tags": ["FK", "IDX"], "ref": "user" },',
    '        { "name": "syncedAt", "type": "timestamptz", "status": "added" }',
    "      ] }",
    "  ],",
    '  "relations": [ { "from": "user", "to": "task", "label": "owns", "fromEnd": "1", "toEnd": "N" } ],',
    '  "columns": { "caption": "model Task — prisma/schema.prisma",',
    '    "columns": ["column", "type", "change"],',
    '    "rows": [ { "cells": ["+ syncedAt", "timestamptz", "NEW"], "tone": "add" } ] } }',
    "```",
  ].join("\n"),
};
