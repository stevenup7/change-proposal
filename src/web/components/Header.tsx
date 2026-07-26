import type { ChangeProposalDocument, Outcome } from "../../shared/document";
import { reviewedCount, reviewProgress } from "../state";
import { renderMarkdown } from "../markdown";
import type { KindCopy } from "../copy";

interface Props {
  doc: ChangeProposalDocument;
  copy: KindCopy;
  theme: "dark" | "light";
  saveState: "idle" | "saving" | "saved" | "error";
  onToggleTheme: () => void;
  onOpenFeedback: () => void;
  onFinalize: (outcome: Outcome) => void;
}

const SAVE_LABEL = { idle: "", saving: "saving…", saved: "saved", error: "save failed" };

export function Header({ doc, copy, theme, saveState, onToggleTheme, onOpenFeedback, onFinalize }: Props) {
  const total = doc.proposal.sections.length;
  const reviewed = reviewedCount(doc);
  const pct = Math.round(reviewProgress(doc) * 100);

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-top">
          <div className="logo">◇</div>
          <h1 className="title">{doc.proposal.title}</h1>
          <button className="icon-btn" title="Toggle theme" onClick={onToggleTheme}>
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>

        {doc.proposal.description && (
          <p
            className="description"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.proposal.description) }}
          />
        )}

        <div className="header-actions">
          <div className="progress" role="progressbar" aria-valuenow={pct}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-text">
            {reviewed} / {total} {copy.progressNoun}
          </span>
          <span className="save-state">{SAVE_LABEL[saveState]}</span>
          <div className="header-buttons">
            <button className="btn btn-ghost" onClick={onOpenFeedback}>
              Send feedback
            </button>
            <button
              className="btn btn-outline"
              onClick={() => onFinalize(copy.finalizeNegative.outcome)}
              title={copy.finalizeNegative.title}
            >
              {copy.finalizeNegative.label}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onFinalize(copy.finalizePositive.outcome)}
              title={copy.finalizePositive.title}
            >
              {copy.finalizePositive.label}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
