import { z } from "zod";
import type { BlockDef } from "./types";

export const TABLE = "table";

export const tableTones = ["default", "faint", "add", "del", "mod"] as const;

export const tableRowSchema = z
  .object({
    cells: z.array(z.string()).min(1).describe("One cell per column, in column order."),
    tone: z
      .enum(tableTones)
      .default("default")
      .describe("faint=unchanged/background, add=new, del=removed, mod=changed."),
  })
  .strict();
export type TableRow = z.infer<typeof tableRowSchema>;

// The content shape, separate from the block wrapper: the `schema` block's Columns
// tab embeds this exact schema, so the two renderings cannot drift.
export const tableContentSchema = z
  .object({
    caption: z
      .string()
      .optional()
      .describe("Caption above the table, e.g. 'model Task — prisma/schema.prisma'."),
    columns: z.array(z.string().min(1)).min(1).describe("Header labels, one per column."),
    rows: z.array(tableRowSchema).min(1),
  })
  .strict();
export type TableContent = z.infer<typeof tableContentSchema>;

/** Cross-field check shared by `table` blocks and the `er` block's `columns`. */
export function checkTableContent(table: TableContent, ctx: z.RefinementCtx, path: (string | number)[] = []): void {
  table.rows.forEach((row, i) => {
    if (row.cells.length !== table.columns.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, "rows", i, "cells"],
        message: `row has ${row.cells.length} cells but the table has ${table.columns.length} columns`,
      });
    }
  });
}

export const tableSchema = tableContentSchema
  .extend({ type: z.literal(TABLE) })
  .strict();
export type TableBlock = z.infer<typeof tableSchema>;

export const tableDef: BlockDef<typeof tableSchema> = {
  type: TABLE,
  schema: tableSchema,
  check: (block, ctx) => checkTableContent(block, ctx),
  guide: [
    "### `table`",
    "Use when the same few facts repeat across several items: column lists, decision tables,",
    "before/after comparisons. `columns` are the headers and `rows` hold the cells — every row",
    "must have exactly one cell per column, in column order. A row's optional `tone` marks",
    "what happened to it: `faint` unchanged, `add` new, `del` removed, `mod` changed.",
    "",
    "```json",
    '{ "type": "table", "caption": "model Task — prisma/schema.prisma",',
    '  "columns": ["column", "type", "change"],',
    '  "rows": [',
    '    { "cells": ["id · description", "String", "unchanged"], "tone": "faint" },',
    '    { "cells": ["+ externalListId", "String?", "NEW"], "tone": "add" } ] }',
    "```",
  ].join("\n"),
};
