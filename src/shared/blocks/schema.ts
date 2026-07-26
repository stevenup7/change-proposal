import { z } from "zod";
import type { BlockDef } from "./types";
import { tableContentSchema, checkTableContent } from "./table";

export const SCHEMA = "schema";

export const entityEmphases = ["plain", "changed", "external"] as const;
export const edgeStyles = ["solid", "dashed"] as const;
export const edgeTones = ["primary", "mod", "add", "neutral"] as const;

export const entityFieldSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().optional().describe("Column type shown right-aligned, e.g. 'String?'."),
    key: z.enum(["pk", "fk"]).optional().describe("Renders the mono PK/FK tag."),
    ref: z
      .string()
      .optional()
      .describe("For key='fk': the entity id this key points at — hovering the tag highlights it."),
    status: z
      .enum(["unchanged", "new"])
      .default("unchanged")
      .describe("'new' gets the + marker, add-tint row, and NEW chip."),
  })
  .strict();
export type EntityField = z.infer<typeof entityFieldSchema>;

export const entitySchema = z
  .object({
    id: z.string().min(1).describe("Stable id; referenced by edges and FK fields."),
    name: z.string().min(1).describe("Mono heading, e.g. 'Task'."),
    badge: z.string().optional().describe("Small header chip, e.g. 'TABLE' or 'CHANGED'."),
    emphasis: z
      .enum(entityEmphases)
      .default("plain")
      .describe("plain=surface card, changed=green ring + tinted header, external=dashed ghost card."),
    fields: z.array(entityFieldSchema).min(1),
    footer: z.string().optional().describe("Faint caption row, e.g. 'EXTERNAL · GOOGLE API'."),
  })
  .strict();
export type SchemaEntity = z.infer<typeof entitySchema>;

// The diagram lays entities out left-to-right in author order, so an edge must
// connect two ADJACENT entities — that keeps the strip renderer deterministic
// with nothing silently dropped (no fallbacks).
export const edgeSchema = z
  .object({
    from: z.string().min(1).describe("Entity id on the left of the connector."),
    to: z.string().min(1).describe("Entity id on the right — must be adjacent to `from`."),
    label: z.string().min(1).describe("Chip above the line, e.g. 'owns'."),
    fromEnd: z.string().optional().describe("Cardinality glyph at the `from` end, e.g. '1'."),
    toEnd: z.string().optional().describe("Cardinality glyph at the `to` end, e.g. '∞' or '▷'."),
    style: z.enum(edgeStyles).default("solid"),
    tone: z.enum(edgeTones).default("primary"),
  })
  .strict();
export type SchemaEdge = z.infer<typeof edgeSchema>;

export const schemaSchema = z
  .object({
    type: z.literal(SCHEMA),
    intro: z.string().optional().describe("Markdown shown above the diagram."),
    entities: z.array(entitySchema).min(1),
    edges: z.array(edgeSchema).default([]),
    columns: tableContentSchema
      .optional()
      .describe("Optional columns table (same shape as the `table` block). Present → the renderer shows Diagram/Columns tabs."),
  })
  .strict();
export type SchemaBlock = z.infer<typeof schemaSchema>;

function checkSchemaBlock(block: SchemaBlock, ctx: z.RefinementCtx): void {
  const order = new Map(block.entities.map((e, i) => [e.id, i]));
  block.entities.forEach((entity, ei) => {
    entity.fields.forEach((field, fi) => {
      if (field.ref !== undefined) {
        if (field.key !== "fk") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entities", ei, "fields", fi, "ref"],
            message: "`ref` is only meaningful on a key='fk' field",
          });
        } else if (!order.has(field.ref)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entities", ei, "fields", fi, "ref"],
            message: `unknown entity id '${field.ref}'`,
          });
        }
      }
    });
  });
  block.edges.forEach((edge, i) => {
    for (const end of ["from", "to"] as const) {
      if (!order.has(edge[end])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["edges", i, end],
          message: `unknown entity id '${edge[end]}'`,
        });
      }
    }
    const from = order.get(edge.from);
    const to = order.get(edge.to);
    if (from !== undefined && to !== undefined && Math.abs(from - to) !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["edges", i],
        message: `edge '${edge.from}' → '${edge.to}' must connect adjacent entities (the diagram is a left-to-right strip in author order)`,
      });
    }
  });
  if (block.columns) checkTableContent(block.columns, ctx, ["columns"]);
}

export const schemaDef: BlockDef<typeof schemaSchema> = {
  type: SCHEMA,
  schema: schemaSchema,
  check: checkSchemaBlock,
  guide: [
    "### `schema`",
    "An entity diagram: cards laid out left-to-right in author order, joined by labeled",
    "connectors. Use it to show a data-model change at a glance — mark the changed entity",
    "with `emphasis: \"changed\"`, external sources with `emphasis: \"external\"`, new",
    "columns with `status: \"new\"`, and keys with `key: \"pk\"|\"fk\"` (an fk's `ref` names",
    "the entity it points at, which highlights on hover). Edges must connect adjacent",
    "entities. Add a `columns` table (same shape as the `table` block) to get the",
    "Diagram / Columns tab treatment; omit it for just the diagram.",
    "",
    "```json",
    '{ "type": "schema",',
    '  "intro": "The new columns give each **Task** a snapshot of its Google source.",',
    '  "entities": [',
    '    { "id": "user", "name": "User", "badge": "TABLE",',
    '      "fields": [ { "name": "id", "type": "String", "key": "pk" } ] },',
    '    { "id": "task", "name": "Task", "badge": "CHANGED", "emphasis": "changed",',
    '      "fields": [ { "name": "id", "key": "pk" },',
    '                  { "name": "userId", "key": "fk", "ref": "user" },',
    '                  { "name": "externalTitle", "type": "String?", "status": "new" } ] }',
    "  ],",
    '  "edges": [ { "from": "user", "to": "task", "label": "owns",',
    '               "fromEnd": "1", "toEnd": "∞", "tone": "primary" } ],',
    '  "columns": { "caption": "model Task — prisma/schema.prisma",',
    '    "columns": ["column", "type", "change"],',
    '    "rows": [ { "cells": ["+ externalTitle", "String?", "NEW"], "tone": "add" } ] } }',
    "```",
  ].join("\n"),
};
