import type { Block } from "../../shared/blocks/registry";
import { MARKDOWN } from "../../shared/blocks/markdown";
import { DIFF } from "../../shared/blocks/diff";
import { CALLOUT } from "../../shared/blocks/callout";
import { Markdown } from "./Markdown";
import { Diff } from "./Diff";
import { Callout } from "./Callout";

// type -> renderer. Keyed by the same `type` constants the schema uses, so UI and schema
// cannot drift. No fallback: an unknown type is a hard error (force upgrade).
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case MARKDOWN:
      return <Markdown block={block} />;
    case DIFF:
      return <Diff block={block} />;
    case CALLOUT:
      return <Callout block={block} />;
    default:
      return (
        <div className="block-error">
          Unknown block type: <code>{(block as { type: string }).type}</code> — this document
          requires a newer version of the tool.
        </div>
      );
  }
}
