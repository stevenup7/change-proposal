import type { CalloutBlock } from "../../shared/blocks/callout";
import { renderMarkdown } from "../markdown";

const TONE_COLORS: Record<CalloutBlock["tone"], string> = {
  info: "var(--primary)",
  add: "var(--add)",
  del: "var(--del)",
  mod: "var(--mod)",
  warn: "var(--mod)",
};

export function Callout({ block }: { block: CalloutBlock }) {
  const color = TONE_COLORS[block.tone] ?? TONE_COLORS.info;
  return (
    <div className="callout" style={{ borderLeftColor: color }}>
      {block.title && (
        <div className="callout-title" style={{ color }}>
          {block.title}
        </div>
      )}
      <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }} />
    </div>
  );
}
