import { describe, it, expect } from "vitest";
import { blockSchema } from "./registry";
import { documentSchema } from "../document";
import { exampleDocument } from "../example";

const validTableBlock = {
  type: "table",
  caption: "model Task",
  columns: ["column", "type", "change"],
  rows: [
    { cells: ["id", "String", "unchanged"], tone: "faint" },
    { cells: ["+ externalTitle", "String?", "NEW"], tone: "add" },
  ],
};

const validErBlock = {
  type: "er",
  entities: [
    {
      id: "task",
      label: "Task",
      status: "modified",
      fields: [
        { name: "id", type: "uuid", tags: ["PK"] },
        { name: "syncedAt", type: "timestamptz", status: "added" },
      ],
    },
  ],
  relations: [],
};

describe("er block", () => {
  it("parses a valid diagram and applies defaults", () => {
    const block = blockSchema.parse(validErBlock);
    if (block.type !== "er") throw new Error("wrong type");
    expect(block.entities[0].fields[0].tags).toEqual(["PK"]);
    expect(block.entities[0].fields[1].status).toBe("added");
    expect(block.relations).toEqual([]);
    expect(block.columns).toBeUndefined();
  });

  it("parses with an embedded columns table", () => {
    const block = blockSchema.parse({ ...validErBlock, columns: { columns: ["a"], rows: [{ cells: ["x"] }] } });
    if (block.type !== "er") throw new Error("wrong type");
    expect(block.columns?.rows[0].tone).toBe("default");
  });

  it("rejects ragged rows in the embedded columns table", () => {
    const bad = { ...validErBlock, columns: { columns: ["a", "b"], rows: [{ cells: ["only one"] }] } };
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
