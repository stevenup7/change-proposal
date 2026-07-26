import { useState } from "react";
import type { Section as SectionT, DialogEntry, Verdict } from "../../shared/document";
import { threadRounds } from "../state";
import { accentVars } from "../theme";
import { renderMarkdown } from "../markdown";
import { BlockView } from "../blocks/registry";
import { VERDICT_PILL, type KindCopy } from "../copy";

interface Props {
  section: SectionT;
  copy: KindCopy;
  verdict: Verdict | undefined;
  thread: DialogEntry[];
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleVerdict: (v: Verdict) => void;
  onAddDialog: (text: string) => void;
}

export function Section({
  section,
  copy,
  verdict,
  thread,
  expanded,
  onToggleExpand,
  onToggleVerdict,
  onAddDialog,
}: Props) {
  const accent = accentVars(section.accent);
  const [commenting, setCommenting] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const reviewed = verdict !== undefined;
  const rounds = threadRounds(thread);

  const submitComment = () => {
    const t = draft.trim();
    if (!t) return;
    onAddDialog(t);
    setDraft("");
    setCommenting(false);
    setThreadOpen(true);
  };

  return (
    <section className="card" style={{ borderLeftColor: accent.color, opacity: reviewed ? 0.62 : 1 }}>
      <div className="card-head" role="button" aria-expanded={expanded} onClick={onToggleExpand}>
        <span className={`chevron ${expanded ? "open" : ""}`}>▾</span>
        {section.badge && (
          <span className="badge" style={{ background: accent.bg, color: accent.color }}>
            {section.badge}
          </span>
        )}
        <div className="card-titles">
          <div className="card-title">{section.title}</div>
          {section.summary && (
            <div
              className="card-summary"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(section.summary) }}
            />
          )}
        </div>

        {verdict && <span className={`pill ${VERDICT_PILL[verdict].cls}`}>{VERDICT_PILL[verdict].label}</span>}
        {thread.length > 0 && <span className="pill pill-primary">💬 {thread.length}</span>}

        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="act"
            title="Comment"
            onClick={() => setCommenting((c) => !c)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
          <button
            className={`act ${verdict === copy.positiveVerdict ? "act-approved" : ""}`}
            title={copy.positiveAction}
            onClick={() => onToggleVerdict(copy.positiveVerdict)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 12.5 9.5 18 20 6" />
            </svg>
          </button>
          <button
            className={`act ${verdict === copy.negativeVerdict ? "act-rejected" : ""}`}
            title={copy.negativeAction}
            onClick={() => onToggleVerdict(copy.negativeVerdict)}
          >
            {copy.negativeGlyph}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="card-body">
          {section.blocks.map((block, i) => (
            <div className="block" key={i}>
              <BlockView block={block} />
            </div>
          ))}

          <div className="card-foot">
            <span className="card-foot-label">
              {reviewed ? `You marked this ${VERDICT_PILL[verdict!].label}` : copy.footPrompt}
            </span>
            <div className="card-foot-actions">
              <button className="foot-btn" onClick={() => setCommenting((c) => !c)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Comment
              </button>
              <button
                className={`foot-btn foot-approve ${verdict === copy.positiveVerdict ? "is-active" : ""}`}
                onClick={() => onToggleVerdict(copy.positiveVerdict)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 12.5 9.5 18 20 6" />
                </svg>
                {copy.positiveAction}
              </button>
              <button
                className={`foot-btn foot-reject ${verdict === copy.negativeVerdict ? "is-active" : ""}`}
                onClick={() => onToggleVerdict(copy.negativeVerdict)}
              >
                {copy.negativeGlyph} {copy.negativeAction}
              </button>
            </div>
          </div>

          {thread.length > 0 && (
            <div className="thread">
              <button className="thread-toggle" onClick={() => setThreadOpen((o) => !o)}>
                <span className={`chevron ${threadOpen ? "open" : ""}`}>▾</span>
                Conversation
                <span className="thread-count">
                  {thread.length} note{thread.length === 1 ? "" : "s"} · {rounds} round{rounds === 1 ? "" : "s"}
                </span>
              </button>
              {threadOpen && (
                <ul className="thread-list">
                  {thread.map((entry, i) => (
                    <li key={i} className={`thread-entry thread-${entry.author}`}>
                      <div className="thread-meta">
                        <span className="thread-author">{entry.author === "agent" ? "Agent" : "You"}</span>
                        <span className="thread-round">round {entry.round}</span>
                      </div>
                      <div className="thread-text">{entry.text}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {commenting && (
            <div className="comment-box">
              <textarea
                autoFocus
                value={draft}
                placeholder={copy.commentPlaceholder}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="comment-box-actions">
                <button className="btn btn-ghost" onClick={() => setCommenting(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={submitComment}>
                  Post comment
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
