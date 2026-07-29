// Deterministic left-to-right layered layout for node/edge diagrams (`arch-flow`, and
// `er` via per-node heights). Pure — no React, no randomness — so the same block always
// renders the same diagram (same spirit as state.ts: geometry is derived, never authored).

export const NODE_W = 200;
export const NODE_H = 58;
export const GAP_X = 96;
export const GAP_Y = 34;
export const PAD = 22;
/** Vertical spacing between the loop-back lanes routed below the node grid. */
export const LOOP_GAP = 16;

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface PlacedNode<N> {
  node: N;
  x: number;
  y: number;
  /** This node's box height (uniform NODE_H unless the caller passed heights). */
  h: number;
}

export interface RoutedEdge {
  edge: GraphEdge;
  path: string;
  labelX: number;
  labelY: number;
  /** The two path endpoints (source anchor, target anchor) — lets a caller drop
   *  cardinality glyphs at the line ends (the `er` block does this). */
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface FlowLayout<N> {
  width: number;
  height: number;
  nodes: PlacedNode<N>[];
  edges: RoutedEdge[];
  /** Edge endpoints that name no node — surfaced in the UI instead of silently dropped. */
  unknownRefs: string[];
}

export function layoutFlow<N extends { id: string }>(
  block: { nodes: N[]; edges: GraphEdge[] },
  heights?: number[],
): FlowLayout<N> {
  const nodes = block.nodes;
  const h = (i: number) => heights?.[i] ?? NODE_H;
  const index = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (!index.has(n.id)) index.set(n.id, i);
  });

  const unknownRefs: string[] = [];
  const valid: GraphEdge[] = [];
  for (const e of block.edges) {
    if (!index.has(e.from)) unknownRefs.push(e.from);
    if (!index.has(e.to)) unknownRefs.push(e.to);
    if (!index.has(e.from) || !index.has(e.to) || e.from === e.to) continue;
    valid.push(e);
  }

  // Build a DAG for ranking: accept edges in document order, treating any edge that
  // would close a cycle as a back edge (it still renders, it just doesn't push ranks).
  const adj: number[][] = nodes.map(() => []);
  const reaches = (from: number, to: number): boolean => {
    const stack = [from];
    const seen = new Set<number>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === to) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const next of adj[cur]) stack.push(next);
    }
    return false;
  };
  for (const e of valid) {
    const f = index.get(e.from)!;
    const t = index.get(e.to)!;
    if (!reaches(t, f)) adj[f].push(t);
  }

  // Longest-path rank over the DAG (column), then stack nodes within a column in
  // document order, accumulating each node's own height.
  const rank = nodes.map(() => 0);
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (let f = 0; f < nodes.length; f++) {
      for (const t of adj[f]) {
        if (rank[t] < rank[f] + 1) {
          rank[t] = rank[f] + 1;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  const row = nodes.map(() => 0);
  const yPos = nodes.map(() => 0);
  const rowsPerRank = new Map<number, number>();
  const stackedHeight = new Map<number, number>();
  nodes.forEach((_, i) => {
    const r = rank[i];
    const idx = rowsPerRank.get(r) ?? 0;
    row[i] = idx;
    rowsPerRank.set(r, idx + 1);
    const acc = stackedHeight.get(r) ?? 0;
    yPos[i] = PAD + acc + idx * GAP_Y;
    stackedHeight.set(r, acc + h(i));
  });

  const maxRank = rank.length ? Math.max(...rank) : 0;
  const maxRows = Math.max(1, ...rowsPerRank.values());
  const width = PAD * 2 + (maxRank + 1) * NODE_W + maxRank * GAP_X;
  let contentBottom = PAD;
  for (const [r, total] of stackedHeight) {
    contentBottom = Math.max(contentBottom, PAD + total + (rowsPerRank.get(r)! - 1) * GAP_Y);
  }
  // Back edges (target left of source) loop around below the grid, one lane each,
  // so they never cut through intermediate nodes. Long forward hops travel in a row
  // gap; only a single-row diagram forces that dip below the grid, in which case the
  // loop lanes start deeper so the two kinds of lane can't collide.
  const backCount = valid.filter(
    (e) => rank[index.get(e.to)!] < rank[index.get(e.from)!],
  ).length;
  const anyLongHop = valid.some((e) => rank[index.get(e.to)!] - rank[index.get(e.from)!] > 1);
  const dipBelowGrid = maxRows === 1 && anyLongHop;
  const loopStart = contentBottom + (dipBelowGrid ? GAP_Y / 2 + 20 : 14);
  const height =
    backCount > 0
      ? loopStart + (backCount - 1) * LOOP_GAP + PAD
      : (dipBelowGrid ? contentBottom + GAP_Y / 2 + 6 : contentBottom) + PAD;

  const placed: PlacedNode<N>[] = nodes.map((n, i) => ({
    node: n,
    x: PAD + rank[i] * (NODE_W + GAP_X),
    y: yPos[i],
    h: h(i),
  }));

  // Parallel edges between the same node pair (either direction) fan out so they
  // never overlap; a lone edge stays centered.
  const pairKey = (e: GraphEdge) => [e.from, e.to].sort().join(" ");
  const pairTotal = new Map<string, number>();
  for (const e of valid) pairTotal.set(pairKey(e), (pairTotal.get(pairKey(e)) ?? 0) + 1);
  const pairSeen = new Map<string, number>();

  let loopLane = 0;
  const edges: RoutedEdge[] = valid.map((e, i) => {
    const fi = index.get(e.from)!;
    const ti = index.get(e.to)!;
    const f = placed[fi];
    const t = placed[ti];
    const key = pairKey(e);
    const occ = pairSeen.get(key) ?? 0;
    pairSeen.set(key, occ + 1);
    const off =
      (pairTotal.get(key) ?? 1) === 1 ? 0 : (occ % 2 === 0 ? -1 : 1) * (9 + Math.floor(occ / 2) * 9);
    const midOff = ((i % 3) - 1) * 6;

    let path: string;
    let labelX: number;
    let labelY: number;
    let start: { x: number; y: number };
    let end: { x: number; y: number };
    if (rank[ti] > rank[fi]) {
      const sx = f.x + NODE_W;
      const sy = f.y + f.h / 2 + off;
      const tx = t.x;
      const ty = t.y + t.h / 2 + off;
      start = { x: sx, y: sy };
      end = { x: tx, y: ty };
      if (rank[ti] - rank[fi] > 1) {
        // Long hop: travel in the row gap next to the source (above it when the
        // source sits last in its column) so the horizontal run never crosses a
        // node in an intermediate column.
        const m1 = sx + GAP_X / 2 + midOff;
        const m2 = tx - GAP_X / 2 + midOff;
        const lastInColumn = row[fi] === rowsPerRank.get(rank[fi])! - 1;
        const dip = lastInColumn && maxRows > 1 ? f.y - GAP_Y / 2 : f.y + f.h + GAP_Y / 2;
        path = `M ${sx} ${sy} H ${m1} V ${dip} H ${m2} V ${ty} H ${tx}`;
        labelX = (m1 + m2) / 2;
        labelY = dip;
      } else if (sy === ty) {
        path = `M ${sx} ${sy} H ${tx}`;
        labelX = (sx + tx) / 2;
        labelY = sy - 11;
      } else {
        const mid = sx + GAP_X / 2 + midOff;
        path = `M ${sx} ${sy} H ${mid} V ${ty} H ${tx}`;
        labelX = mid;
        labelY = (sy + ty) / 2;
      }
    } else if (rank[ti] < rank[fi]) {
      // Back edge: loop below the grid in its own lane.
      const cxF = f.x + NODE_W / 2 + off;
      const cxT = t.x + NODE_W / 2 + off;
      const yLoop = loopStart + loopLane * LOOP_GAP;
      loopLane += 1;
      path = `M ${cxF} ${f.y + f.h} V ${yLoop} H ${cxT} V ${t.y + t.h}`;
      labelX = (cxF + cxT) / 2;
      labelY = yLoop;
      start = { x: cxF, y: f.y + f.h };
      end = { x: cxT, y: t.y + t.h };
    } else {
      const cx = f.x + NODE_W / 2 + off;
      const down = t.y > f.y;
      const sy = down ? f.y + f.h : f.y;
      const ty = down ? t.y : t.y + t.h;
      path = `M ${cx} ${sy} V ${ty}`;
      labelX = cx;
      labelY = (sy + ty) / 2;
      start = { x: cx, y: sy };
      end = { x: cx, y: ty };
    }
    return { edge: e, path, labelX, labelY, start, end };
  });

  return { width, height, nodes: placed, edges, unknownRefs: [...new Set(unknownRefs)] };
}
