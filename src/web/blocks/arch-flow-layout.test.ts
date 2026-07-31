import { describe, it, expect } from "vitest";
import { layoutFlow, NODE_W, NODE_H, GAP_X, GAP_Y, PAD } from "./arch-flow-layout";

const n = (id: string) => ({ id, label: id, kind: "process" as const });

describe("arch-flow layout is deterministic", () => {
  it("ranks a chain left-to-right, one column per hop", () => {
    const l = layoutFlow({
      nodes: [n("a"), n("b"), n("c")],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    });
    expect(l.nodes.map((p) => p.x)).toEqual([
      PAD,
      PAD + NODE_W + GAP_X,
      PAD + 2 * (NODE_W + GAP_X),
    ]);
    expect(l.nodes.map((p) => p.y)).toEqual([PAD, PAD, PAD]);
    expect(l.width).toBe(PAD * 2 + 3 * NODE_W + 2 * GAP_X);
    expect(l.height).toBe(PAD * 2 + NODE_H);
  });

  it("uses longest path for rank and stacks same-rank nodes by document order", () => {
    // a -> b -> d and a -> d: d must sit at rank 2, not 1; b and c share rank 1.
    const l = layoutFlow({
      nodes: [n("a"), n("b"), n("c"), n("d")],
      edges: [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "a", to: "d" },
        { from: "b", to: "d" },
      ],
    });
    const at = (id: string) => l.nodes.find((p) => p.node.id === id)!;
    expect(at("b").x).toBe(at("c").x);
    expect(at("b").y).toBe(PAD);
    expect(at("c").y).toBe(PAD + NODE_H + GAP_Y);
    expect(at("d").x).toBe(PAD + 2 * (NODE_W + GAP_X));
  });

  it("routes a cycle without diverging: the back edge does not push ranks", () => {
    const l = layoutFlow({
      nodes: [n("server"), n("spa")],
      edges: [
        { from: "server", to: "spa", label: "GET" },
        { from: "spa", to: "server", label: "POST" },
      ],
    });
    const at = (id: string) => l.nodes.find((p) => p.node.id === id)!;
    expect(at("server").x).toBe(PAD);
    expect(at("spa").x).toBe(PAD + NODE_W + GAP_X);
    // both edges render, fanned apart so they don't overlap
    expect(l.edges).toHaveLength(2);
    expect(l.edges[0].path).not.toBe(l.edges[1].path);
    // the back edge loops below the grid instead of cutting back through it,
    // and the canvas grows to make room for the loop lane
    const contentBottom = PAD + NODE_H;
    expect(l.edges[1].path).toContain(`V ${contentBottom + 14}`);
    expect(l.height).toBe(contentBottom + 14 + PAD);
  });

  it("routes long hops through the row gap, not through intermediate columns", () => {
    // a(row 0) -> b -> c, plus s(row 1, rank 0) -> c: the s->c horizontal run must
    // dip below s's row instead of tracking c's row through b's column.
    const l = layoutFlow({
      nodes: [n("a"), n("b"), n("c"), n("s")],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "s", to: "c" },
      ],
    });
    const at = (id: string) => l.nodes.find((p) => p.node.id === id)!;
    // s is in the last row, so the hop travels in the row gap ABOVE it — inside the
    // grid, never sharing space with below-grid loop lanes.
    const dip = at("s").y - GAP_Y / 2;
    expect(l.edges[2].path).toContain(`V ${dip}`);
  });

  it("reports unknown edge refs instead of silently dropping them", () => {
    const l = layoutFlow({ nodes: [n("a")], edges: [{ from: "a", to: "ghost" }] });
    expect(l.unknownRefs).toEqual(["ghost"]);
    expect(l.edges).toHaveLength(0);
  });

  it("supports per-node heights (er entities): columns stack actual heights", () => {
    // b and c share a column; b is 120 tall, so c starts below b's real height.
    const l = layoutFlow(
      {
        nodes: [n("a"), n("b"), n("c")],
        edges: [
          { from: "a", to: "b" },
          { from: "a", to: "c" },
        ],
      },
      [80, 120, 60],
    );
    const at = (id: string) => l.nodes.find((p) => p.node.id === id)!;
    expect(at("a").h).toBe(80);
    expect(at("b").y).toBe(PAD);
    expect(at("c").y).toBe(PAD + 120 + GAP_Y);
    expect(l.height).toBe(PAD + 120 + GAP_Y + 60 + PAD);
    // edges anchor at each node's own vertical center
    expect(l.edges[0].path.startsWith(`M ${PAD + NODE_W} ${PAD + 40}`)).toBe(true);
  });

  it("same input yields identical output (pure)", () => {
    const block = {
      nodes: [n("a"), n("b"), n("c")],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "a" },
      ],
    };
    expect(JSON.stringify(layoutFlow(block))).toBe(JSON.stringify(layoutFlow(block)));
  });
});
