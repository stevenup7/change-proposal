import { describe, it, expect } from "vitest";
import type { z } from "zod";
import { blockSchema } from "./registry";
import type { schemaSchema } from "./schema";
import { documentSchema } from "../document";
import { exampleDocument } from "../example";

const validSchemaBlock: z.input<typeof schemaSchema> = {
  type: "schema",
  entities: [
    { id: "user", name: "User", fields: [{ name: "id", key: "pk" }] },
    {
      id: "task",
      name: "Task",
      emphasis: "changed",
      fields: [
        { name: "userId", key: "fk", ref: "user" },
        { name: "externalTitle", type: "String?", status: "new" },
      ],
    },
  ],
  edges: [{ from: "user", to: "task", label: "owns", fromEnd: "1", toEnd: "∞" }],
};

const validTableBlock = {
  type: "table",
  caption: "model Task",
  columns: ["column", "type", "change"],
  rows: [
    { cells: ["id", "String", "unchanged"], tone: "faint" },
    { cells: ["+ externalTitle", "String?", "NEW"], tone: "add" },
  ],
};

describe("schema block", () => {
  it("parses a valid diagram and applies defaults", () => {
    const block = blockSchema.parse(validSchemaBlock);
    if (block.type !== "schema") throw new Error("wrong type");
    expect(block.entities[0].emphasis).toBe("plain");
    expect(block.entities[1].fields[1].status).toBe("new");
    expect(block.edges[0].style).toBe("solid");
    expect(block.edges[0].tone).toBe("primary");
  });

  it("parses with an embedded columns table", () => {
    const block = blockSchema.parse({ ...validSchemaBlock, columns: { columns: ["a"], rows: [{ cells: ["x"] }] } });
    if (block.type !== "schema") throw new Error("wrong type");
    expect(block.columns?.rows[0].tone).toBe("default");
  });

  it("rejects an edge referencing an unknown entity", () => {
    const bad = { ...validSchemaBlock, edges: [{ from: "user", to: "ghost", label: "owns" }] };
    expect(() => blockSchema.parse(bad)).toThrow(/unknown entity id 'ghost'/);
  });

  it("rejects an edge between non-adjacent entities", () => {
    const bad = {
      ...validSchemaBlock,
      entities: [
        ...validSchemaBlock.entities,
        { id: "google", name: "GoogleTaskItem", emphasis: "external", fields: [{ name: "id" }] },
      ],
      edges: [{ from: "user", to: "google", label: "skips" }],
    };
    expect(() => blockSchema.parse(bad)).toThrow(/adjacent/);
  });

  it("rejects a field ref to an unknown entity", () => {
    const bad = structuredClone(validSchemaBlock);
    bad.entities[1].fields[0].ref = "ghost";
    expect(() => blockSchema.parse(bad)).toThrow(/unknown entity id 'ghost'/);
  });

  it("rejects a ref on a non-fk field", () => {
    const bad = structuredClone(validSchemaBlock);
    bad.entities[0].fields[0] = { name: "id", ref: "task" };
    expect(() => blockSchema.parse(bad)).toThrow(/key='fk'/);
  });

  it("rejects ragged rows in the embedded columns table", () => {
    const bad = { ...validSchemaBlock, columns: { columns: ["a", "b"], rows: [{ cells: ["only one"] }] } };
    expect(() => blockSchema.parse(bad)).toThrow(/1 cells but the table has 2 columns/);
  });
});

describe("table block", () => {
  it("parses a valid table and applies the default tone", () => {
    const block = blockSchema.parse({ ...validTableBlock, rows: [{ cells: ["a", "b", "c"] }] });
    if (block.type !== "table") throw new Error("wrong type");
    expect(block.rows[0].tone).toBe("default");
  });

  it("rejects a row with the wrong cell count", () => {
    const bad = { ...validTableBlock, rows: [{ cells: ["too", "few"] }] };
    expect(() => blockSchema.parse(bad)).toThrow(/2 cells but the table has 3 columns/);
  });

  it("rejects an unknown tone", () => {
    const bad = { ...validTableBlock, rows: [{ cells: ["a", "b", "c"], tone: "loud" }] };
    expect(() => blockSchema.parse(bad)).toThrow();
  });
});

describe("example document", () => {
  it("round-trips through the document schema", () => {
    expect(() => documentSchema.parse(exampleDocument())).not.toThrow();
  });
});
