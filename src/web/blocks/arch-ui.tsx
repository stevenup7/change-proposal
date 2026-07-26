import { useId } from "react";
import type { ArchItem } from "../../shared/blocks/architecture";
import type { FlowLayout } from "./arch-flow-layout";

// Shared visual vocabulary for the diagram blocks (arch-* and er): status tags,
// component chips, the used-statuses legend, and the SVG edge layer.

export type Status = NonNullable<ArchItem["status"]>;

const STATUS_LABEL: Record<Status, string> = { added: "NEW", modified: "MOD", removed: "DEL" };

export function StatusTag({ status }: { status: Status | undefined }) {
  if (!status) return null;
  return <span className={`arch-st arch-st-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Chip({ item }: { item: ArchItem }) {
  return (
    <span className={`arch-chip ${item.status ? `arch-chip-${item.status}` : ""}`}>
      {item.label}
      <StatusTag status={item.status} />
    </span>
  );
}

/** Legend row listing only the change-states the diagram actually uses. */
export function Legend({ statuses }: { statuses: Set<Status> }) {
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

/**
 * Edges + labels for a computed layout. Render this BEFORE the node boxes: a label
 * that outgrows its gap then slides under the neighboring node instead of painting
 * over its title.
 */
export function EdgeLayer({ layout }: { layout: FlowLayout<{ id: string }> }) {
  const markerId = useId();
  return (
    <>
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
      {layout.edges.map(
        (e, i) =>
          e.edge.label && (
            <span key={i} className="arch-elabel" style={{ left: e.labelX, top: e.labelY }}>
              {e.edge.label}
            </span>
          ),
      )}
    </>
  );
}

export function UnknownRefs({ type, refs }: { type: string; refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="block-error">
      {type} edges reference unknown node id{refs.length === 1 ? "" : "s"}:{" "}
      <code>{refs.join(", ")}</code>
    </div>
  );
}
