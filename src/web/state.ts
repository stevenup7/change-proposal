import type { ChangeProposalDocument, Verdict } from "../shared/document";

// Pure, deterministic reducer: (document, action) -> document. No time, no I/O, no React.
// This is what makes the front end snapshot-testable: input doc + action sequence -> output doc.
// `finalizedAt` (the one impure value) is stamped by the server on save, never here.

export type Action =
  | { kind: "toggleVerdict"; sectionId: string; verdict: Verdict }
  | { kind: "approveAll" }
  | { kind: "addComment"; sectionId: string; text: string }
  | { kind: "setAnswerChoice"; questionId: string; choice: string }
  | { kind: "setAnswerOther"; questionId: string; other: string }
  | { kind: "setAnswerText"; questionId: string; text: string }
  | { kind: "setFeedback"; text: string }
  | { kind: "finalize" };

/** Mark the round in-progress once the human touches anything (pending -> in-progress). */
function touched(doc: ChangeProposalDocument): ChangeProposalDocument {
  if (doc.status === "pending") return { ...doc, status: "in-progress" };
  return doc;
}

export function reduce(doc: ChangeProposalDocument, action: Action): ChangeProposalDocument {
  switch (action.kind) {
    case "toggleVerdict": {
      const review = { ...doc.response.review };
      if (review[action.sectionId] === action.verdict) delete review[action.sectionId];
      else review[action.sectionId] = action.verdict;
      return touched({ ...doc, response: { ...doc.response, review } });
    }
    case "approveAll": {
      const review = { ...doc.response.review };
      for (const s of doc.proposal.sections) review[s.id] = "approved";
      return touched({ ...doc, response: { ...doc.response, review } });
    }
    case "addComment": {
      const text = action.text.trim();
      if (!text) return doc;
      const comments = { ...doc.response.comments };
      comments[action.sectionId] = [...(comments[action.sectionId] ?? []), text];
      return touched({ ...doc, response: { ...doc.response, comments } });
    }
    case "setAnswerChoice": {
      const answers = { ...doc.response.answers };
      answers[action.questionId] = { ...answers[action.questionId], choice: action.choice };
      return touched({ ...doc, response: { ...doc.response, answers } });
    }
    case "setAnswerOther": {
      const answers = { ...doc.response.answers };
      answers[action.questionId] = { ...answers[action.questionId], other: action.other };
      return touched({ ...doc, response: { ...doc.response, answers } });
    }
    case "setAnswerText": {
      const answers = { ...doc.response.answers };
      answers[action.questionId] = { ...answers[action.questionId], text: action.text };
      return touched({ ...doc, response: { ...doc.response, answers } });
    }
    case "setFeedback": {
      return touched({ ...doc, response: { ...doc.response, feedback: action.text } });
    }
    case "finalize": {
      return { ...doc, status: "finalized" };
    }
  }
}

// --- Derived selectors (pure) ---------------------------------------------

export function reviewedCount(doc: ChangeProposalDocument): number {
  return doc.proposal.sections.filter((s) => doc.response.review[s.id]).length;
}

export function reviewProgress(doc: ChangeProposalDocument): number {
  const total = doc.proposal.sections.length;
  return total === 0 ? 1 : reviewedCount(doc) / total;
}

function isAnswered(a: { choice?: string; other?: string; text?: string } | undefined): boolean {
  if (!a) return false;
  if (a.text !== undefined) return a.text.trim().length > 0;
  if (a.choice === "__other__") return (a.other ?? "").trim().length > 0;
  return (a.choice ?? "").length > 0;
}

export function answeredCount(doc: ChangeProposalDocument): number {
  return doc.proposal.questions.filter((q) => isAnswered(doc.response.answers[q.id])).length;
}

export const OTHER_CHOICE = "__other__";
