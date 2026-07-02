import type { TableBlock, TableContent } from "../../shared/blocks/table";

// Handoff pattern: all columns 1fr except the trailing change/meta column, which hugs.
function gridTemplate(n: number): string {
  return n > 1 ? `repeat(${n - 1}, minmax(0, 1fr)) auto` : "1fr";
}

/** The bare grid — shared with the schema block's Columns tab. */
export function TableGrid({ content }: { content: TableContent }) {
  const template = gridTemplate(content.columns.length);
  return (
    <div>
      {content.caption && <div className="table-caption">{content.caption}</div>}
      <div className="table-grid">
        <div className="table-row table-head" style={{ gridTemplateColumns: template }}>
          {content.columns.map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </div>
        {content.rows.map((row, i) => (
          <div key={i} className={`table-row tone-${row.tone}`} style={{ gridTemplateColumns: template }}>
            {row.cells.map((cell, j) => (
              <span key={j}>{cell}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Table({ block }: { block: TableBlock }) {
  return <TableGrid content={block} />;
}
