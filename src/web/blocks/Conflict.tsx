import type { ConflictBlock } from "../../shared/blocks/conflict";
import type { Resolution } from "../../shared/document";
import { OTHER_CHOICE, resolutionKey } from "../state";
import { renderMarkdown } from "../markdown";

interface Props {
  block: ConflictBlock;
  resolutions: Record<string, Resolution>;
  onResolve: (key: string, side: string, text?: string) => void;
}

function chosen(r: Resolution | undefined): boolean {
  if (!r) return false;
  if (r.side === OTHER_CHOICE) return (r.text ?? "").trim().length > 0;
  return r.side.length > 0;
}

// The first block that *collects* input rather than displaying it: per field the human
// picks one side (or writes in their own when `allowOther`). Rendered as a radio group so
// it reads as a chooser, not a table. Picks route up via onResolve.
export function Conflict({ block, resolutions, onResolve }: Props) {
  const done = block.fields.filter((f) => chosen(resolutions[resolutionKey(block.id, f.id)])).length;

  return (
    <div className="conflict">
      <div className="conflict-head">
        {block.title && <span className="conflict-title">{block.title}</span>}
        <span className="conflict-count mono">
          {done} / {block.fields.length} chosen
        </span>
      </div>

      {block.fields.map((field) => {
        const key = resolutionKey(block.id, field.id);
        const current = resolutions[key];
        const otherPicked = current?.side === OTHER_CHOICE;
        const fieldChosen = chosen(current);
        return (
          <div className="conflict-field" key={field.id}>
            <div className="conflict-field-head">
              <span className="conflict-field-label">{field.label}</span>
              <span className={`pill ${fieldChosen ? "pill-add" : "pill-muted"}`}>
                {fieldChosen ? "chosen" : "pick one"}
              </span>
            </div>
            {field.description && (
              <div
                className="conflict-field-desc prose"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(field.description) }}
              />
            )}
            <div className="conflict-sides" role="radiogroup" aria-label={field.label}>
              {field.sides.map((side) => {
                const picked = current?.side === side.id;
                return (
                  <button
                    key={side.id}
                    className={`conflict-side ${picked ? "is-picked" : ""}`}
                    role="radio"
                    aria-checked={picked}
                    onClick={() => onResolve(key, side.id)}
                  >
                    <span className="conflict-radio" aria-hidden="true" />
                    <span className="conflict-side-body">
                      <span className="conflict-side-label mono">{side.label}</span>
                      <span className="conflict-side-value">{side.value}</span>
                      {side.note && <span className="conflict-side-note">{side.note}</span>}
                    </span>
                  </button>
                );
              })}
              {field.allowOther && (
                <button
                  className={`conflict-side conflict-other ${otherPicked ? "is-picked" : ""}`}
                  role="radio"
                  aria-checked={otherPicked}
                  onClick={() => onResolve(key, OTHER_CHOICE, otherPicked ? (current?.text ?? "") : "")}
                >
                  <span className="conflict-radio" aria-hidden="true" />
                  <span className="conflict-side-body">
                    <span className="conflict-side-label mono">Other…</span>
                    <span className="conflict-side-value">Write in a different value</span>
                  </span>
                </button>
              )}
            </div>
            {otherPicked && (
              <input
                className="conflict-writein"
                autoFocus
                value={current?.text ?? ""}
                placeholder="Your value…"
                onChange={(e) => onResolve(key, OTHER_CHOICE, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
