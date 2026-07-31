import { describe, it, expect } from "vitest";
import { authoringGuide, describeGuide, blockSpec, jsonSchema } from "./guide";
import { blockCatalog, blockDefs } from "./blocks/registry";

// The guide is disclosed in layers: the catalog names every block, and a block's own
// spec (guide + schema fragment) is fetched only when the document will use it. These
// tests pin that split — a regression here quietly puts the whole contract back into
// every agent's context.

describe("block catalog", () => {
  it("names every registered block, one line each", () => {
    const lines = blockCatalog().split("\n");
    expect(lines).toHaveLength(blockDefs.length);
    for (const def of blockDefs) {
      expect(def.summary).not.toBe("");
      expect(blockCatalog()).toContain(`\`${def.type}\` — ${def.summary}`);
    }
  });
});

describe("block spec", () => {
  it("gives a block's guide and its schema fragment", () => {
    const spec = blockSpec(["diff"]);
    expect(spec).toContain("### `diff`");
    expect(spec).toContain("#### `diff` schema");
    expect(spec).toContain('"const": "diff"');
  });

  it("takes several blocks at once", () => {
    const spec = blockSpec(["markdown", "callout"]);
    expect(spec).toContain("### `markdown`");
    expect(spec).toContain("### `callout`");
  });

  // No fallbacks: an unknown type is an error that names what is available.
  it("rejects an unknown block type", () => {
    expect(() => blockSpec(["schema"])).toThrow(/unknown block type 'schema'/);
    expect(() => blockSpec(["schema"])).toThrow(/markdown/);
  });
});

describe.each([
  ["show-proposal", authoringGuide],
  ["show-architecture", describeGuide],
])("%s guide", (tool, guide) => {
  it("carries the catalog, not every block's spec", () => {
    const text = guide();
    expect(text).toContain(blockCatalog());
    expect(text).not.toContain("### `er`");
    expect(text).toContain(`${tool} author --block`);
  });

  it("leaves the full schema behind a flag", () => {
    const schema = JSON.stringify(jsonSchema(), null, 2);
    expect(guide()).not.toContain(schema);
    expect(guide(true)).toContain(schema);
  });

  it("is a fraction of the full contract", () => {
    expect(guide().length).toBeLessThan(guide(true).length / 4);
  });
});
