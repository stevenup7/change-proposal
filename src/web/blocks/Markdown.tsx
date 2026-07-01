import type { MarkdownBlock } from "../../shared/blocks/markdown";
import { renderMarkdown } from "../markdown";

export function Markdown({ block }: { block: MarkdownBlock }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }} />;
}
