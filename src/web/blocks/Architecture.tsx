import type {
  ArchBoundariesBlock,
  ArchComponent,
  ArchFlowBlock,
  ArchLayersBlock,
} from "../../shared/blocks/architecture";
import { accentVars } from "../theme";
import { layoutFlow, NODE_W } from "./arch-flow-layout";
import { Chip, EdgeLayer, Legend, StatusTag, UnknownRefs, type Status } from "./arch-ui";

// ---------------------------------------------------------------------------
// arch-flow
// ---------------------------------------------------------------------------

export function ArchFlow({ block }: { block: ArchFlowBlock }) {
  const layout = layoutFlow(block);
  const statuses = new Set<Status>(
    block.nodes.flatMap((n) => (n.status ? [n.status] : [])),
  );
  return (
    <div className="arch">
      <div className="arch-flow-scroll">
        <div className="arch-flow" style={{ width: layout.width, height: layout.height }}>
          <EdgeLayer layout={layout} />
          {layout.nodes.map((p, i) => (
            <div
              key={i}
              className={`arch-node arch-node-${p.node.kind} ${p.node.status ? `arch-node-${p.node.status}` : ""}`}
              style={{ left: p.x, top: p.y, width: NODE_W, height: p.h }}
            >
              <div className="arch-node-label">
                <span className="arch-node-text">{p.node.label}</span>
                <StatusTag status={p.node.status} />
              </div>
              {p.node.note && <div className="arch-node-note">{p.node.note}</div>}
            </div>
          ))}
        </div>
      </div>
      <UnknownRefs type="arch-flow" refs={layout.unknownRefs} />
      <Legend statuses={statuses} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// arch-layers
// ---------------------------------------------------------------------------

export function ArchLayers({ block }: { block: ArchLayersBlock }) {
  const statuses = new Set<Status>(
    block.layers.flatMap((l) => l.items.flatMap((it) => (it.status ? [it.status] : []))),
  );
  return (
    <div className="arch">
      <div className="arch-layers">
        {block.layers.map((layer, i) => (
          <div key={i}>
            <div className="arch-lane">
              <div
                className="arch-lane-label"
                style={{ boxShadow: `inset 3px 0 0 ${accentVars(layer.accent).color}` }}
              >
                <div className="arch-lane-name">{layer.label}</div>
                {layer.sublabel && <div className="arch-lane-sub">{layer.sublabel}</div>}
              </div>
              <div className="arch-lane-chips">
                {layer.items.map((item, j) => (
                  <Chip key={j} item={item} />
                ))}
              </div>
            </div>
            {i < block.layers.length - 1 && (
              <div className="arch-conn">
                <span className="arch-stem arch-stem-down" />
                {layer.connector && <span className="arch-conn-label">{layer.connector}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
      <Legend statuses={statuses} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// arch-boundaries
// ---------------------------------------------------------------------------

function componentStatuses(components: ArchComponent[]): Status[] {
  return components.flatMap((c) => [
    ...(c.status ? [c.status] : []),
    ...(c.children ?? []).flatMap((ch) => (ch.status ? [ch.status] : [])),
  ]);
}

function Container({ container }: { container: ArchBoundariesBlock["containers"][number] }) {
  return (
    <div className="arch-container">
      <div className="arch-container-head">
        <span className="arch-container-name">{container.label}</span>
        {container.tech && <span className="arch-container-tech">{container.tech}</span>}
        <StatusTag status={container.status} />
      </div>
      <div className="arch-container-body">
        {container.children.map((c, i) =>
          c.children ? (
            <div key={i} className="arch-group">
              <div className="arch-group-name">
                {c.label} <StatusTag status={c.status} />
              </div>
              <div className="arch-group-chips">
                {c.children.map((ch, j) => (
                  <Chip key={j} item={ch} />
                ))}
              </div>
            </div>
          ) : (
            <Chip key={i} item={{ label: c.label, status: c.status }} />
          ),
        )}
      </div>
    </div>
  );
}

export function ArchBoundaries({ block }: { block: ArchBoundariesBlock }) {
  const statuses = new Set<Status>([
    ...block.containers.flatMap((c) => [
      ...(c.status ? [c.status] : []),
      ...componentStatuses(c.children),
    ]),
    ...(block.foundation
      ? [
          ...(block.foundation.status ? [block.foundation.status] : []),
          ...componentStatuses(block.foundation.children),
        ]
      : []),
  ]);
  return (
    <div className="arch">
      {block.actors.length > 0 && (
        <>
          <div className="arch-actors">
            {block.actors.map((a, i) => (
              <div key={i} className="arch-actor">
                <span className="arch-actor-glyph">◈</span>
                <div>
                  <div className="arch-actor-name">{a.label}</div>
                  {a.note && <div className="arch-actor-note">{a.note}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="arch-stems">
            {block.actors.map((_, i) => (
              <span key={i} className="arch-stem arch-stem-down" />
            ))}
          </div>
        </>
      )}
      <div className="arch-boundary">
        <span className="arch-boundary-tag">{block.boundary}</span>
        <div className="arch-containers">
          {block.containers.map((c, i) => (
            <Container key={i} container={c} />
          ))}
        </div>
        {block.foundation && (
          <>
            <div className="arch-stems arch-imports">
              {block.containers.map((_, i) => (
                <span key={i} className="arch-imports-pair">
                  <span className="arch-stem arch-stem-up" />
                  <span className="arch-conn-label">imports</span>
                </span>
              ))}
            </div>
            <Container container={block.foundation} />
          </>
        )}
      </div>
      <Legend statuses={statuses} />
    </div>
  );
}
