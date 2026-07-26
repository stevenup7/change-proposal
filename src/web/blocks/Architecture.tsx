import { useId } from "react";
import type {
  ArchBoundariesBlock,
  ArchComponent,
  ArchFlowBlock,
  ArchItem,
  ArchLayersBlock,
} from "../../shared/blocks/architecture";
import { accentVars } from "../theme";
import { layoutFlow, NODE_H, NODE_W } from "./arch-flow-layout";

type Status = NonNullable<ArchItem["status"]>;

const STATUS_LABEL: Record<Status, string> = { added: "NEW", modified: "MOD", removed: "DEL" };

function StatusTag({ status }: { status: Status | undefined }) {
  if (!status) return null;
  return <span className={`arch-st arch-st-${status}`}>{STATUS_LABEL[status]}</span>;
}

function Chip({ item }: { item: ArchItem }) {
  return (
    <span className={`arch-chip ${item.status ? `arch-chip-${item.status}` : ""}`}>
      {item.label}
      <StatusTag status={item.status} />
    </span>
  );
}

/** Legend row listing only the change-states the diagram actually uses. */
function Legend({ statuses }: { statuses: Set<Status> }) {
  if (statuses.size === 0) return null;
  return (
    <div className="arch-legend">
      {(["added", "modified", "removed"] as const)
        .filter((s) => statuses.has(s))
        .map((s) => (
          <span key={s} className="arch-lg">
            <i className={`arch-lg-${s}`} /> {s}
          </span>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// arch-flow
// ---------------------------------------------------------------------------

export function ArchFlow({ block }: { block: ArchFlowBlock }) {
  const layout = layoutFlow(block);
  const markerId = useId();
  const statuses = new Set<Status>(
    block.nodes.flatMap((n) => (n.status ? [n.status] : [])),
  );
  return (
    <div className="arch">
      <div className="arch-flow-scroll">
        <div className="arch-flow" style={{ width: layout.width, height: layout.height }}>
          <svg className="arch-edges" width={layout.width} height={layout.height}>
            <defs>
              <marker
                id={markerId}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            {layout.edges.map((e, i) => (
              <path key={i} d={e.path} markerEnd={`url(#${markerId})`} />
            ))}
          </svg>
          {/* labels before nodes: a label that outgrows its gap slides under the
              neighboring node instead of painting over its title */}
          {layout.edges.map(
            (e, i) =>
              e.edge.label && (
                <span key={i} className="arch-elabel" style={{ left: e.labelX, top: e.labelY }}>
                  {e.edge.label}
                </span>
              ),
          )}
          {layout.nodes.map((p, i) => (
            <div
              key={i}
              className={`arch-node arch-node-${p.node.kind} ${p.node.status ? `arch-node-${p.node.status}` : ""}`}
              style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
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
      {layout.unknownRefs.length > 0 && (
        <div className="block-error">
          arch-flow edges reference unknown node id{layout.unknownRefs.length === 1 ? "" : "s"}:{" "}
          <code>{layout.unknownRefs.join(", ")}</code>
        </div>
      )}
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
