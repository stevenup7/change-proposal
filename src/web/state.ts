import type { ReviewDocument, DialogEntry, Outcome, Resolution, Verdict } from "../shared/document";
import { OTHER_CHOICE } from "../shared/document";
import { CONFLICT, type ConflictBlock } from "../shared/blocks/conflict";

// Pure, deterministic reducer: (document, action) -> document. No time, no I/O, no React.
// This is what makes the front end snapshot-testable: input doc + action sequence -> output doc.
// `finalizedAt` (the one impure value) is stamped by the server on save, never here.

export type Action =
  | { kind: "toggleVerdict"; sectionId: string; verdict: Verdict }
  | { kind: "approveAll" }
  | { kind: "addDialog"; sectionId: string; text: string }
  | { kind: "setAnswerChoice"; questionId: string; choice: string }
  | { kind: "setAnswerOther"; questionId: string; other: string }
  | { kind: "setAnswerText"; questionId: string; text: string }
  | { kind: "setResolution"; key: string; side: string; text?: string }
  | { kind: "setFeedback"; text: string }
  | { kind: "finalize"; outcome: Outcome };

/** Mark the round in-progress once the human touches anything (pending -> in-progress). */
function touched(doc: ReviewDocument): ReviewDocument {
  if (doc.status === "pending") return { ...doc, status: "in-progress" };
  return doc;
}

export function reduce(doc: ReviewDocument, action: Action): ReviewDocument {
  switch (action.kind) {
    case "toggleVerdict": {
      const review = { ...doc.response.review };
      if (review[action.sectionId] === action.verdict) delete review[action.sectionId];
      else review[action.sectionId] = action.verdict;
      return touched({ ...doc, response: { ...doc.response, review } });
    }
    case "approveAll": {
      // Kind-aware: the blanket positive verdict is "approved" for a change-proposal,
      // "clear" for an architecture-description.
      const positive = doc.kind === "architecture-description" ? "clear" : "approved";
      const review = { ...doc.response.review };
      for (const s of doc.proposal.sections) review[s.id] = positive;
      return touched({ ...doc, response: { ...doc.response, review } });
    }
    case "addDialog": {
      const text = action.text.trim();
      if (!text) return doc;
      const dialog = { ...doc.dialog };
      dialog[action.sectionId] = [
        ...(dialog[action.sectionId] ?? []),
        { round: doc.round, author: "human", text },
      ];
      return touched({ ...doc, dialog });
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
    case "setResolution": {
      const resolutions = { ...doc.response.resolutions };
      const entry: Resolution = { side: action.side };
      if (action.text !== undefined) entry.text = action.text;
      resolutions[action.key] = entry;
      return touched({ ...doc, response: { ...doc.response, resolutions } });
    }
    case "setFeedback": {
      return touched({ ...doc, response: { ...doc.response, feedback: action.text } });
    }
    case "finalize": {
      return { ...doc, status: "finalized", response: { ...doc.response, outcome: action.outcome } };
    }
  }
}

// --- Derived selectors (pure) ---------------------------------------------

export function reviewedCount(doc: ReviewDocument): number {
  return doc.proposal.sections.filter((s) => doc.response.review[s.id]).length;
}

export function reviewProgress(doc: ReviewDocument): number {
  const total = doc.proposal.sections.length;
  return total === 0 ? 1 : reviewedCount(doc) / total;
}

/** The full conversation for a section, oldest first. Spans every round (dialog is never wiped). */
export function sectionThread(doc: ReviewDocument, sectionId: string): DialogEntry[] {
  return doc.dialog[sectionId] ?? [];
}

/** How many distinct rounds a section's thread spans — drives the "N rounds" chip. */
export function threadRounds(entries: DialogEntry[]): number {
  return new Set(entries.map((e) => e.round)).size;
}

function isAnswered(a: { choice?: string; other?: string; text?: string } | undefined): boolean {
  if (!a) return false;
  if (a.text !== undefined) return a.text.trim().length > 0;
  if (a.choice === "__other__") return (a.other ?? "").trim().length > 0;
  return (a.choice ?? "").length > 0;
}

export function answeredCount(doc: ReviewDocument): number {
  return doc.proposal.questions.filter((q) => isAnswered(doc.response.answers[q.id])).length;
}

export { OTHER_CHOICE };

// --- Conflict resolutions -------------------------------------------------

/** Stable key for a conflict field's pick in `response.resolutions`. */
export function resolutionKey(blockId: string, fieldId: string): string {
  return `${blockId}.${fieldId}`;
}

/** A field is resolved once a side is picked — or, for "__other__", once its write-in is non-empty. */
function isResolved(r: { side: string; text?: string } | undefined): boolean {
  if (!r) return false;
  if (r.side === OTHER_CHOICE) return (r.text ?? "").trim().length > 0;
  return r.side.length > 0;
}

/** Every conflict-field key across the proposal, in document order. Walks the blocks. */
export function conflictKeys(doc: ReviewDocument): string[] {
  const keys: string[] = [];
  for (const section of doc.proposal.sections) {
    for (const block of section.blocks) {
      if (block.type !== CONFLICT) continue;
      const c = block as ConflictBlock;
      for (const field of c.fields) keys.push(resolutionKey(c.id, field.id));
    }
  }
  return keys;
}

/** How many conflict fields are resolved vs. total — drives the "N / M chosen" counter and the nudge. */
export function conflictStats(doc: ReviewDocument): { resolved: number; total: number } {
  const keys = conflictKeys(doc);
  const resolved = keys.filter((k) => isResolved(doc.response.resolutions[k])).length;
  return { resolved, total: keys.length };
}

/** True when every conflict field has a pick (vacuously true when there are none). */
export function conflictsResolved(doc: ReviewDocument): boolean {
  const { resolved, total } = conflictStats(doc);
  return resolved === total;
}
