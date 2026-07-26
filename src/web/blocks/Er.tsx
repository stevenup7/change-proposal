import type { ErBlock } from "../../shared/blocks/er";
import { layoutFlow, NODE_W } from "./arch-flow-layout";
import { EdgeLayer, Legend, StatusTag, UnknownRefs, type Status } from "./arch-ui";

// Entity card geometry — must match the er-* CSS heights exactly, because the layout
// engine positions edges from these computed heights.
const HEAD_H = 30;
const NOTE_H = 15;
const FIELD_H = 21;
const PAD_BOTTOM = 8;

function entityHeight(e: ErBlock["entities"][number]): number {
  return HEAD_H + (e.note ? NOTE_H : 0) + e.fields.length * FIELD_H + PAD_BOTTOM;
}

export function Er({ block }: { block: ErBlock }) {
  const layout = layoutFlow(
    { nodes: block.entities, edges: block.relations },
    block.entities.map(entityHeight),
  );
  const statuses = new Set<Status>(
    block.entities.flatMap((e) => [
      ...(e.status ? [e.status] : []),
      ...e.fields.flatMap((f) => (f.status ? [f.status] : [])),
    ]),
  );
  return (
    <div className="arch">
      <div className="arch-flow-scroll">
        <div className="arch-flow" style={{ width: layout.width, height: layout.height }}>
          <EdgeLayer layout={layout} />
          {layout.nodes.map((p, i) => (
            <div
              key={i}
              className={`er-entity ${p.node.status ? `er-entity-${p.node.status}` : ""}`}
              style={{ left: p.x, top: p.y, width: NODE_W, height: p.h }}
            >
              <div className="er-entity-head">
                <span className="er-entity-name">{p.node.label}</span>
                <StatusTag status={p.node.status} />
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
      </div>
      <UnknownRefs type="er" refs={layout.unknownRefs} />
      <Legend statuses={statuses} />
    </div>
  );
}
