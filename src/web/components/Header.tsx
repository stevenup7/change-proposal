import { useState } from "react";
import type { ChangeProposalDocument, Outcome } from "../../shared/document";
import { reviewedCount, reviewProgress } from "../state";
import { renderMarkdown } from "../markdown";
import type { KindCopy } from "../copy";

interface Props {
  doc: ChangeProposalDocument;
  copy: KindCopy;
  theme: "dark" | "light";
  saveState: "idle" | "saving" | "saved" | "error";
  unresolvedConflicts: number;
  onToggleTheme: () => void;
  onOpenFeedback: () => void;
  onFinalize: (outcome: Outcome) => void;
}

const SAVE_LABEL = { idle: "", saving: "saving…", saved: "saved", error: "save failed" };

export function Header({
  doc,
  copy,
  theme,
  saveState,
  unresolvedConflicts,
  onToggleTheme,
  onOpenFeedback,
  onFinalize,
}: Props) {
  const total = doc.proposal.sections.length;
  const reviewed = reviewedCount(doc);
  const pct = Math.round(reviewProgress(doc) * 100);

  // Soft gate: unresolved conflicts never *block* finalize, but the first positive-
  // finalize click surfaces them and asks for one confirming click. UI-only — the
  // reducer's `finalize` stays unconditional.
  const [confirming, setConfirming] = useState(false);
  const approve = () => {
    if (unresolvedConflicts > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    onFinalize(copy.finalizePositive.outcome);
  };

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
              onClick={approve}
              title={copy.finalizePositive.title}
            >
              {confirming ? "Proceed anyway" : copy.finalizePositive.label}
            </button>
          </div>
        </div>

        {confirming && unresolvedConflicts > 0 && (
          <div className="finalize-nudge" role="status">
            {unresolvedConflicts} conflict{unresolvedConflicts === 1 ? "" : "s"} still unresolved —
            the agent will pick for those unless you resolve them first. Click
            <strong> Proceed anyway</strong> to agree regardless.
          </div>
        )}
      </div>
    </header>
  );
}
