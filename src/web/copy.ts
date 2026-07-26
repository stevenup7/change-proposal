import type { DocumentKind, Outcome, Verdict } from "../shared/document";

// All kind-dependent wording in one place. The components render from this table;
// nothing else in the UI branches on doc.kind.

interface FinalizeCopy {
  outcome: Outcome;
  label: string;
  title: string;
}

interface DoneCopy {
  icon: string;
  title: string;
  body: string;
}

export interface KindCopy {
  /** Verdict token the positive/negative section buttons toggle. */
  positiveVerdict: Verdict;
  negativeVerdict: Verdict;
  positiveAction: string;
  negativeAction: string;
  /** Glyph on the negative 28×28 action button (✕ = reject, ? = ask to clarify). */
  negativeGlyph: string;
  footPrompt: string;
  /** Mono progress-noun in the header: "N / M <noun>". */
  progressNoun: string;
  commentPlaceholder: string;
  composerPlaceholder: string;
  finalizePositive: FinalizeCopy;
  finalizeNegative: FinalizeCopy;
  done: { positive: DoneCopy; negative: DoneCopy };
}

export const KIND_COPY: Record<DocumentKind, KindCopy> = {
  "change-proposal": {
    positiveVerdict: "approved",
    negativeVerdict: "rejected",
    positiveAction: "Approve",
    negativeAction: "Request changes",
    negativeGlyph: "✕",
    footPrompt: "Reviewed this section?",
    progressNoun: "flagged",
    commentPlaceholder: "Leave a note on this section for the agent…",
    composerPlaceholder: "e.g. Prefer last-write-wins over a modal for the due-date field…",
    finalizePositive: {
      outcome: "approved",
      label: "Agree & proceed",
      title: "I agree — the agent goes ahead with the proposed next step",
    },
    finalizeNegative: {
      outcome: "discuss",
      label: "Save & discuss",
      title: "Save my notes and send it back for another round — the agent won't go ahead yet",
    },
    done: {
      positive: {
        icon: "✓",
        title: "Agreed — sent to the agent",
        body: "The agent will go ahead with the proposed next step. You can close this tab and return to your agent.",
      },
      negative: {
        icon: "💬",
        title: "Saved for discussion",
        body: "Your notes are saved. The agent will reply and send back another round before going ahead.",
      },
    },
  },
  "architecture-description": {
    positiveVerdict: "clear",
    negativeVerdict: "needs-clarification",
    positiveAction: "Clear",
    negativeAction: "Needs clarification",
    negativeGlyph: "?",
    footPrompt: "Is this section accurate and clear?",
    progressNoun: "checked",
    commentPlaceholder: "Ask the agent to clarify something in this section…",
    composerPlaceholder: "e.g. Where does authentication actually happen? What writes the snapshot?…",
    finalizePositive: {
      outcome: "understood",
      label: "Understood",
      title: "The description is clear — the agent can rely on it as shared context",
    },
    finalizeNegative: {
      outcome: "clarify",
      label: "Request clarification",
      title: "Send it back — the agent answers your clarification requests in another round",
    },
    done: {
      positive: {
        icon: "✓",
        title: "Understood — sent to the agent",
        body: "You've confirmed the description matches the system as you know it. The agent will treat it as shared context.",
      },
      negative: {
        icon: "💬",
        title: "Clarification requested",
        body: "Your questions are saved. The agent will clarify those sections and send back another round.",
      },
    },
  },
};

/** Pill styling for every verdict token, both kinds. */
export const VERDICT_PILL: Record<Verdict, { label: string; cls: string }> = {
  approved: { label: "approved", cls: "pill-add" },
  rejected: { label: "rejected", cls: "pill-del" },
  "changes-requested": { label: "changes", cls: "pill-mod" },
  clear: { label: "clear", cls: "pill-add" },
  "needs-clarification": { label: "clarify", cls: "pill-mod" },
};
