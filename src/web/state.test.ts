import { describe, it, expect } from "vitest";
import { reduce, reviewedCount, answeredCount, reviewProgress, type Action } from "./state";
import { exampleDocument } from "../shared/example";

const run = (actions: Action[]) => actions.reduce((d, a) => reduce(d, a), exampleDocument());

describe("reducer is deterministic and pure", () => {
  it("does not mutate the input document", () => {
    const doc = exampleDocument();
    const snapshot = JSON.stringify(doc);
    reduce(doc, { kind: "toggleVerdict", sectionId: "db", verdict: "approved" });
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it("toggles a verdict on and off", () => {
    const on = reduce(exampleDocument(), { kind: "toggleVerdict", sectionId: "db", verdict: "approved" });
    expect(on.response.review.db).toBe("approved");
    const off = reduce(on, { kind: "toggleVerdict", sectionId: "db", verdict: "approved" });
    expect(off.response.review.db).toBeUndefined();
  });

  it("approveAll marks every section and fills progress", () => {
    const d = run([{ kind: "approveAll" }]);
    expect(reviewedCount(d)).toBe(d.proposal.sections.length);
    expect(reviewProgress(d)).toBe(1);
  });

  it("moves pending -> in-progress on first touch", () => {
    expect(exampleDocument().status).toBe("pending");
    expect(run([{ kind: "setFeedback", text: "hi" }]).status).toBe("in-progress");
  });

  it("ignores empty comments, keeps non-empty ones", () => {
    const d = run([
      { kind: "addComment", sectionId: "db", text: "   " },
      { kind: "addComment", sectionId: "db", text: "looks good" },
    ]);
    expect(d.response.comments.db).toEqual(["looks good"]);
  });

  it("counts answered questions (choice, other, text)", () => {
    const d = run([
      { kind: "setAnswerChoice", questionId: "due-date-strategy", choice: "modal" },
      { kind: "setAnswerText", questionId: "scope", text: "also handle deletes" },
    ]);
    expect(answeredCount(d)).toBe(2);
  });

  it("'other' choice only counts once the write-in is non-empty", () => {
    const picked = run([{ kind: "setAnswerChoice", questionId: "due-date-strategy", choice: "__other__" }]);
    expect(answeredCount(picked)).toBe(0);
    const filled = reduce(picked, { kind: "setAnswerOther", questionId: "due-date-strategy", other: "hybrid" });
    expect(answeredCount(filled)).toBe(1);
  });

  it("finalize sets status without stamping time (server does that)", () => {
    const d = run([{ kind: "approveAll" }, { kind: "finalize" }]);
    expect(d.status).toBe("finalized");
    expect(d.response.finalizedAt).toBeUndefined();
  });

  it("same action sequence yields identical output (determinism)", () => {
    const seq: Action[] = [
      { kind: "toggleVerdict", sectionId: "db", verdict: "approved" },
      { kind: "addComment", sectionId: "logic", text: "prefer pull" },
      { kind: "setAnswerChoice", questionId: "due-date-strategy", choice: "local" },
    ];
    expect(JSON.stringify(run(seq))).toBe(JSON.stringify(run(seq)));
  });
});
