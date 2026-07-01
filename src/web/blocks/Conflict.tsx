import type { ConflictBlock } from "../../shared/blocks/conflict";
import type { Resolution } from "../../shared/document";
import { OTHER_CHOICE, resolutionKey } from "../state";

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
// picks a side (or writes in their own when `allowOther`). Picks route up via onResolve.
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
        return (
          <div className="conflict-field" key={field.id}>
            <div className="conflict-field-label">{field.label}</div>
            <div className="conflict-sides">
              {field.sides.map((side) => {
                const picked = current?.side === side.id;
                return (
                  <button
                    key={side.id}
                    className={`conflict-side ${picked ? "is-picked" : ""}`}
                    aria-pressed={picked}
                    onClick={() => onResolve(key, side.id)}
                  >
                    <span className="conflict-side-label mono">{side.label}</span>
                    <span className="conflict-side-value">{side.value}</span>
                  </button>
                );
              })}
              {field.allowOther && (
                <button
                  className={`conflict-side conflict-other ${otherPicked ? "is-picked" : ""}`}
                  aria-pressed={otherPicked}
                  onClick={() => onResolve(key, OTHER_CHOICE, otherPicked ? (current?.text ?? "") : "")}
                >
                  <span className="conflict-side-label mono">Other…</span>
                  <span className="conflict-side-value">Write in a different value</span>
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
