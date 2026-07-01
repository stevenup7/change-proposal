import type { DiffBlock } from "../../shared/blocks/diff";

type LineKind = "add" | "del" | "hunk" | "ctx";

interface DiffLine {
  kind: LineKind;
  text: string;
  oldLine?: number;
  newLine?: number;
}

// Deterministic unified-diff parser: classify each line and track line numbers.
function parsePatch(patch: string): DiffLine[] {
  const lines = patch.replace(/\n$/, "").split("\n");
  const out: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;
  for (const raw of lines) {
    if (raw.startsWith("@@")) {
      const m = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldNo = Number(m[1]);
        newNo = Number(m[2]);
      }
      out.push({ kind: "hunk", text: raw });
    } else if (raw.startsWith("+")) {
      out.push({ kind: "add", text: raw.slice(1), newLine: newNo++ });
    } else if (raw.startsWith("-")) {
      out.push({ kind: "del", text: raw.slice(1), oldLine: oldNo++ });
    } else {
      const text = raw.startsWith(" ") ? raw.slice(1) : raw;
      out.push({ kind: "ctx", text, oldLine: oldNo++, newLine: newNo++ });
    }
  }
  return out;
}

export function Diff({ block }: { block: DiffBlock }) {
  const lines = parsePatch(block.patch);
  return (
    <div className="diff">
      {block.filename && <div className="diff-file">{block.filename}</div>}
      <div className="diff-body">
        {lines.map((l, i) => (
          <div key={i} className={`diff-line diff-${l.kind}`}>
            <span className="diff-gutter">{l.kind === "hunk" ? "" : (l.newLine ?? l.oldLine ?? "")}</span>
            <span className="diff-sign">{l.kind === "add" ? "+" : l.kind === "del" ? "-" : " "}</span>
            <span className="diff-text">{l.text || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
