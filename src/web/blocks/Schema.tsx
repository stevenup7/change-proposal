import { useState } from "react";
import type { SchemaBlock, SchemaEntity, SchemaEdge, EntityField } from "../../shared/blocks/schema";
import { TableGrid } from "./Table";
import { renderMarkdown } from "../markdown";

const EDGE_TONES: Record<SchemaEdge["tone"], string> = {
  primary: "var(--primary)",
  mod: "var(--mod)",
  add: "var(--add)",
  neutral: "var(--border-strong)",
};

function FieldRow({
  field,
  entities,
  onHoverRef,
}: {
  field: EntityField;
  entities: SchemaEntity[];
  onHoverRef: (id: string | null) => void;
}) {
  const isNew = field.status === "new";
  const refName = field.ref ? entities.find((e) => e.id === field.ref)?.name : undefined;
  const tag = field.key
    ? {
        text: field.key.toUpperCase(),
        className: `schema-tag schema-tag-${field.key}`,
        tip: field.key === "pk" ? "Primary key" : `Foreign key → ${refName ?? field.ref ?? ""}`,
      }
    : isNew
      ? { text: "+", className: "schema-tag schema-tag-new", tip: "New column" }
      : undefined;
  return (
    <div className={`schema-field${isNew ? " is-new" : ""}`}>
      {tag ? (
        <span
          className={tag.className}
          title={tag.tip}
          onMouseEnter={field.ref ? () => onHoverRef(field.ref!) : undefined}
          onMouseLeave={field.ref ? () => onHoverRef(null) : undefined}
        >
          {tag.text}
        </span>
      ) : (
        <span className="schema-tag" />
      )}
      <span className="schema-field-name">{field.name}</span>
      {field.type && <span className="schema-field-type">{field.type}</span>}
      {isNew && <span className="schema-field-newchip">NEW</span>}
    </div>
  );
}

function Entity({
  entity,
  entities,
  highlighted,
  onHoverRef,
}: {
  entity: SchemaEntity;
  entities: SchemaEntity[];
  highlighted: boolean;
  onHoverRef: (id: string | null) => void;
}) {
  return (
    <div className={`schema-entity is-${entity.emphasis}${highlighted ? " is-highlight" : ""}`}>
      <div className="schema-entity-head">
        <span className="schema-entity-name">{entity.name}</span>
        {entity.badge && <span className="schema-entity-badge">{entity.badge}</span>}
      </div>
      <div className="schema-entity-fields">
        {entity.fields.map((f, i) => (
          <FieldRow key={i} field={f} entities={entities} onHoverRef={onHoverRef} />
        ))}
      </div>
      {entity.footer && <div className="schema-entity-footer">{entity.footer}</div>}
    </div>
  );
}

function Connector({ edge, reversed }: { edge: SchemaEdge; reversed: boolean }) {
  const color = EDGE_TONES[edge.tone];
  const [left, right] = reversed ? [edge.toEnd, edge.fromEnd] : [edge.fromEnd, edge.toEnd];
  return (
    <div className="schema-connector">
      <span className="schema-connector-label" style={{ color }}>
        {edge.label}
      </span>
      <div className="schema-connector-line" style={{ color }}>
        {left && <span className="schema-connector-end">{left}</span>}
        <div className={`schema-connector-rule is-${edge.style}`} />
        {right && <span className="schema-connector-end">{right}</span>}
      </div>
    </div>
  );
}

export function Schema({ block }: { block: SchemaBlock }) {
  const [tab, setTab] = useState<"diagram" | "columns">("diagram");
  const [highlight, setHighlight] = useState<string | null>(null);
  const showTabs = block.columns !== undefined;
  const showDiagram = !showTabs || tab === "diagram";

  // Adjacent-pair edges (the schema guarantees adjacency, either orientation).
  const edgeBetween = (a: string, b: string) =>
    block.edges.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));

  return (
    <div className="schema">
      {showTabs && (
        <div className="schema-tabs">
          <button
            className={`schema-tab${tab === "diagram" ? " is-active" : ""}`}
            onClick={() => setTab("diagram")}
          >
            Schema diagram
          </button>
          <button
            className={`schema-tab${tab === "columns" ? " is-active" : ""}`}
            onClick={() => setTab("columns")}
          >
            Columns
          </button>
        </div>
      )}
      {showDiagram ? (
        <>
          {block.intro && (
            <div className="prose schema-intro" dangerouslySetInnerHTML={{ __html: renderMarkdown(block.intro) }} />
          )}
          <div className="schema-scroll">
            <div className="schema-strip">
              {block.entities.map((entity, i) => {
                const edge = i > 0 ? edgeBetween(block.entities[i - 1].id, entity.id) : undefined;
                return [
                  edge && <Connector key={`edge-${i}`} edge={edge} reversed={edge.to !== entity.id} />,
                  <Entity
                    key={entity.id}
                    entity={entity}
                    entities={block.entities}
                    highlighted={highlight === entity.id}
                    onHoverRef={setHighlight}
                  />,
                ];
              })}
            </div>
          </div>
        </>
      ) : (
        block.columns && <TableGrid content={block.columns} />
      )}
    </div>
  );
}
