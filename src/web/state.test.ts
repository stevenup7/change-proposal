import { describe, it, expect } from "vitest";
import { reduce, reviewedCount, answeredCount, reviewProgress, sectionThread, threadRounds, type Action } from "./state";
import { exampleDocument } from "../shared/example";
import { startNextRound } from "../shared/document";

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

  it("ignores empty dialog notes, stamps round + author on non-empty ones", () => {
    const d = run([
      { kind: "addDialog", sectionId: "db", text: "   " },
      { kind: "addDialog", sectionId: "db", text: "looks good" },
    ]);
    expect(d.dialog.db).toEqual([{ round: 1, author: "human", text: "looks good" }]);
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
      { kind: "addDialog", sectionId: "logic", text: "prefer pull" },
      { kind: "setAnswerChoice", questionId: "due-date-strategy", choice: "local" },
    ];
    expect(JSON.stringify(run(seq))).toBe(JSON.stringify(run(seq)));
  });
});

describe("conversation threads across rounds", () => {
  it("startNextRound archives response into history without dropping the dialog", () => {
    const r1 = run([
      { kind: "toggleVerdict", sectionId: "db", verdict: "changes-requested" },
      { kind: "addDialog", sectionId: "db", text: "add an index too" },
    ]);
    const r2 = startNextRound(r1);

    // response archived and reset; round bumped; back to pending
    expect(r2.round).toBe(2);
    expect(r2.status).toBe("pending");
    expect(r2.history).toHaveLength(1);
    expect(r2.history[0].review.db).toBe("changes-requested");
    expect(r2.response.review).toEqual({});
    // dialog survives the round boundary
    expect(r2.dialog.db).toEqual([{ round: 1, author: "human", text: "add an index too" }]);
  });

  it("sectionThread merges entries from every round in order", () => {
    const r1 = run([{ kind: "addDialog", sectionId: "db", text: "round one note" }]);
    const r2 = startNextRound(r1);
    const r2b = reduce(r2, { kind: "addDialog", sectionId: "db", text: "round two follow-up" });

    const thread = sectionThread(r2b, "db");
    expect(thread.map((e) => [e.round, e.text])).toEqual([
      [1, "round one note"],
      [2, "round two follow-up"],
    ]);
    expect(threadRounds(thread)).toBe(2);
  });

  it("dialog is keyed per section — threads don't bleed", () => {
    const d = run([
      { kind: "addDialog", sectionId: "db", text: "for db" },
      { kind: "addDialog", sectionId: "logic", text: "for logic" },
    ]);
    expect(sectionThread(d, "db").map((e) => e.text)).toEqual(["for db"]);
    expect(sectionThread(d, "code")).toEqual([]);
  });
});
