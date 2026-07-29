import { useState } from "react";
import type { ErBlock, ErRelation } from "../../shared/blocks/er";
import { layoutFlow, NODE_W } from "./arch-flow-layout";
import { EdgeLayer, Legend, StatusTag, UnknownRefs, type Status } from "./arch-ui";
import { TableGrid } from "./Table";

// Entity card geometry — must match the er-* CSS heights exactly, because the layout
// engine positions edges from these computed heights.
const HEAD_H = 30;
const NOTE_H = 15;
const FIELD_H = 21;
const PAD_BOTTOM = 8;

function entityHeight(e: ErBlock["entities"][number]): number {
  return HEAD_H + (e.note ? NOTE_H : 0) + e.fields.length * FIELD_H + PAD_BOTTOM;
}

// A `modified` entity reads as "changed" (green), matching the schema block's
// changed-hairline treatment; added/removed keep the shared NEW/DEL tags.
function EntityTag({ status }: { status: Status | undefined }) {
  if (status === "modified") return <span className="arch-st er-st-changed">CHANGED</span>;
  return <StatusTag status={status} />;
}

function Diagram({ block }: { block: ErBlock }) {
  const layout = layoutFlow(
    { nodes: block.entities, edges: block.relations },
    block.entities.map(entityHeight),
  );
  return (
    <div className="arch-flow-scroll">
      <div className="arch-flow" style={{ width: layout.width, height: layout.height }}>
        {/* Edges (paths + arrows) come from the shared layer; labels/cardinality are
            drawn here so the name sits as a pill above the line and the `fromEnd`/`toEnd`
            glyphs land at the two ends, mirroring the schema block's connector. */}
        <EdgeLayer layout={layout} renderLabels={false} />
        {layout.edges.map((e, i) => {
          const rel = e.edge as ErRelation;
          const labelTop = Math.min(e.start.y, e.end.y) - 14;
          return (
            <div key={`edge-deco-${i}`}>
              {rel.label && (
                <span className="arch-elabel er-elabel" style={{ left: e.labelX, top: labelTop }}>
                  {rel.label}
                </span>
              )}
              {rel.fromEnd && (
                <span className="er-eend" style={{ left: e.start.x + 9, top: e.start.y }}>
                  {rel.fromEnd}
                </span>
              )}
              {rel.toEnd && (
                <span className="er-eend" style={{ left: e.end.x - 11, top: e.end.y }}>
                  {rel.toEnd}
                </span>
              )}
            </div>
          );
        })}
        {layout.nodes.map((p, i) => (
          <div
            key={i}
            className={`er-entity ${p.node.status ? `er-entity-${p.node.status}` : ""}`}
            style={{ left: p.x, top: p.y, width: NODE_W, height: p.h }}
          >
            <div className="er-entity-head">
              <span className="er-entity-name">{p.node.label}</span>
              <EntityTag status={p.node.status} />
            </div>
            {p.node.note && <div className="er-entity-note">{p.node.note}</div>}
            <div className="er-fields">
              {p.node.fields.map((f, j) => (
                <div key={j} className={`er-field ${f.status ? `er-field-${f.status}` : ""}`}>
                  {f.tags.length > 0 && (
                    <span className="er-tags">
                      {f.tags.map((t) => (
                        <i key={t}>{t}</i>
                      ))}
                    </span>
                  )}
                  <span className="er-field-name">{f.name}</span>
                  {f.type && <span className="er-field-type">{f.type}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <UnknownRefs type="er" refs={layout.unknownRefs} />
    </div>
  );
}

export function Er({ block }: { block: ErBlock }) {
  const [tab, setTab] = useState<"diagram" | "columns">("diagram");
  const showTabs = block.columns !== undefined;
  const showDiagram = !showTabs || tab === "diagram";
  const statuses = new Set<Status>(
    block.entities.flatMap((e) => [
      ...(e.status ? [e.status] : []),
      ...e.fields.flatMap((f) => (f.status ? [f.status] : [])),
    ]),
  );
  return (
    <div className="arch">
      {showTabs && (
        <div className="er-tabs">
          <button
            className={`er-tab${tab === "diagram" ? " is-active" : ""}`}
            onClick={() => setTab("diagram")}
          >
            Diagram
          </button>
          <button
            className={`er-tab${tab === "columns" ? " is-active" : ""}`}
            onClick={() => setTab("columns")}
          >
            Columns
          </button>
        </div>
      )}
      {showDiagram ? (
        <>
          <Diagram block={block} />
          <Legend statuses={statuses} />
        </>
      ) : (
        block.columns && <TableGrid content={block.columns} />
      )}
    </div>
  );
}
