import type { CalloutBlock } from "../../shared/blocks/callout";
import { renderMarkdown } from "../markdown";

const TONE_VARS: Record<CalloutBlock["tone"], { color: string; bg: string }> = {
  info: { color: "var(--primary)", bg: "var(--primary-bg)" },
  add: { color: "var(--add)", bg: "var(--add-bg)" },
  del: { color: "var(--del)", bg: "var(--del-bg)" },
  mod: { color: "var(--mod)", bg: "var(--mod-bg)" },
  warn: { color: "var(--mod)", bg: "var(--mod-bg)" },
};

export function Callout({ block }: { block: CalloutBlock }) {
  const t = TONE_VARS[block.tone] ?? TONE_VARS.info;
  return (
    <div className="callout" style={{ background: t.bg, borderColor: t.color }}>
      {block.title && (
        <div className="callout-title" style={{ color: t.color }}>
          {block.title}
        </div>
      )}
      <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }} />
    </div>
  );
}
