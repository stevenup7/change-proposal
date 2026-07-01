import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

// Agent-authored content on a local, single-user tool — trusted author, so we render
// Markdown directly. (If this ever serves untrusted content, add sanitization here.)
export function renderMarkdown(src: string): string {
  return marked.parse(src, { async: false }) as string;
}
