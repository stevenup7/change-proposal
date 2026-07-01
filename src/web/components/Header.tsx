import type { ChangeProposalDocument } from "../../shared/document";
import { reviewedCount, reviewProgress } from "../state";
import { renderMarkdown } from "../markdown";

interface Props {
  doc: ChangeProposalDocument;
  theme: "dark" | "light";
  saveState: "idle" | "saving" | "saved" | "error";
  onToggleTheme: () => void;
  onApproveAll: () => void;
  onOpenFeedback: () => void;
  onFinalize: () => void;
}

const SAVE_LABEL = { idle: "", saving: "saving…", saved: "saved", error: "save failed" };

export function Header({ doc, theme, saveState, onToggleTheme, onApproveAll, onOpenFeedback, onFinalize }: Props) {
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
            {reviewed} / {total} reviewed
          </span>
          <span className="save-state">{SAVE_LABEL[saveState]}</span>
          <div className="header-buttons">
            <button className="btn btn-ghost" onClick={onOpenFeedback}>
              Send feedback
            </button>
            <button className="btn btn-outline" onClick={onApproveAll}>
              Approve all
            </button>
            <button className="btn btn-primary" onClick={onFinalize}>
              Finalize &amp; send
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
