import type { Block } from "../../shared/blocks/registry";
import type { Resolution } from "../../shared/document";
import { MARKDOWN } from "../../shared/blocks/markdown";
import { DIFF } from "../../shared/blocks/diff";
import { CALLOUT } from "../../shared/blocks/callout";
import { CONFLICT } from "../../shared/blocks/conflict";
import { SCHEMA } from "../../shared/blocks/schema";
import { TABLE } from "../../shared/blocks/table";
import { ARCH_FLOW, ARCH_LAYERS, ARCH_BOUNDARIES } from "../../shared/blocks/architecture";
import { ER } from "../../shared/blocks/er";
import { Markdown } from "./Markdown";
import { Diff } from "./Diff";
import { Callout } from "./Callout";
import { Conflict } from "./Conflict";
import { Schema } from "./Schema";
import { Table } from "./Table";
import { ArchFlow, ArchLayers, ArchBoundaries } from "./Architecture";
import { Er } from "./Er";

// Input-collecting blocks (conflict) read/write these; render-only blocks ignore them.
export interface BlockViewProps {
  block: Block;
  resolutions?: Record<string, Resolution>;
  onResolve?: (key: string, side: string, text?: string) => void;
}

// type -> renderer. Keyed by the same `type` constants the schema uses, so UI and schema
// cannot drift. No fallback: an unknown type is a hard error (force upgrade).
export function BlockView({ block, resolutions, onResolve }: BlockViewProps) {
  switch (block.type) {
    case MARKDOWN:
      return <Markdown block={block} />;
    case DIFF:
      return <Diff block={block} />;
    case CALLOUT:
      return <Callout block={block} />;
    case CONFLICT:
      return (
        <Conflict
          block={block}
          resolutions={resolutions ?? {}}
          onResolve={onResolve ?? (() => {})}
        />
      );
    case SCHEMA:
      return <Schema block={block} />;
    case TABLE:
      return <Table block={block} />;
    case ARCH_FLOW:
      return <ArchFlow block={block} />;
    case ARCH_LAYERS:
      return <ArchLayers block={block} />;
    case ARCH_BOUNDARIES:
      return <ArchBoundaries block={block} />;
    case ER:
      return <Er block={block} />;
    default:
      return (
        <div className="block-error">
          Unknown block type: <code>{(block as { type: string }).type}</code> — this document
          requires a newer version of the tool.
        </div>
      );
  }
}
