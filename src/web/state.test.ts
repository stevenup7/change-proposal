import { describe, it, expect } from "vitest";
import {
  reduce,
  reviewedCount,
  answeredCount,
  reviewProgress,
  sectionThread,
  threadRounds,
  conflictStats,
  conflictsResolved,
  resolutionKey,
  OTHER_CHOICE,
  type Action,
} from "./state";
import { exampleDocument, exampleDescription } from "../shared/example";
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

  it("finalize records the outcome and status, without stamping time (server does that)", () => {
    const agreed = run([{ kind: "finalize", outcome: "approved" }]);
    expect(agreed.status).toBe("finalized");
    expect(agreed.response.outcome).toBe("approved");
    expect(agreed.response.finalizedAt).toBeUndefined();

    const discuss = run([{ kind: "finalize", outcome: "discuss" }]);
    expect(discuss.response.outcome).toBe("discuss");
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

describe("architecture-description clarification loop", () => {
  const runDesc = (actions: Action[]) =>
    actions.reduce((d, a) => reduce(d, a), exampleDescription());

  it("approveAll uses the kind's positive verdict: clear, not approved", () => {
    const d = runDesc([{ kind: "approveAll" }]);
    for (const s of d.proposal.sections) expect(d.response.review[s.id]).toBe("clear");
    expect(reviewedCount(d)).toBe(d.proposal.sections.length);
  });

  it("toggles needs-clarification on and off like any verdict", () => {
    const on = reduce(exampleDescription(), {
      kind: "toggleVerdict",
      sectionId: "arch",
      verdict: "needs-clarification",
    });
    expect(on.response.review.arch).toBe("needs-clarification");
    const off = reduce(on, { kind: "toggleVerdict", sectionId: "arch", verdict: "needs-clarification" });
    expect(off.response.review.arch).toBeUndefined();
  });

  it("finalizes with the description outcomes", () => {
    const d = runDesc([{ kind: "finalize", outcome: "clarify" }]);
    expect(d.status).toBe("finalized");
    expect(d.response.outcome).toBe("clarify");
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

describe("conflict resolutions", () => {
  const TITLE = resolutionKey("merge", "title");
  const DUE = resolutionKey("merge", "due");

  it("the example exposes exactly the two conflict fields, none resolved to start", () => {
    expect(conflictStats(exampleDocument())).toEqual({ resolved: 0, total: 2 });
    expect(conflictsResolved(exampleDocument())).toBe(false);
  });

  it("setResolution does not mutate the input document", () => {
    const doc = exampleDocument();
    const snapshot = JSON.stringify(doc);
    reduce(doc, { kind: "setResolution", key: TITLE, side: "steady" });
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it("setResolution records a side pick and overwrites cleanly", () => {
    const picked = run([{ kind: "setResolution", key: TITLE, side: "steady" }]);
    expect(picked.response.resolutions[TITLE]).toEqual({ side: "steady" });
    const changed = reduce(picked, { kind: "setResolution", key: TITLE, side: "google" });
    expect(changed.response.resolutions[TITLE]).toEqual({ side: "google" });
  });

  it("marks pending -> in-progress on first pick", () => {
    expect(run([{ kind: "setResolution", key: DUE, side: "steady" }]).status).toBe("in-progress");
  });

  it("an '__other__' pick only counts once its write-in is non-empty", () => {
    const empty = run([{ kind: "setResolution", key: TITLE, side: OTHER_CHOICE, text: "" }]);
    expect(conflictStats(empty).resolved).toBe(0);
    const filled = reduce(empty, { kind: "setResolution", key: TITLE, side: OTHER_CHOICE, text: "Buy soy milk" });
    expect(conflictStats(filled).resolved).toBe(1);
  });

  it("conflictsResolved flips true only when every field has a pick", () => {
    const one = run([{ kind: "setResolution", key: TITLE, side: "steady" }]);
    expect(conflictsResolved(one)).toBe(false);
    const both = reduce(one, { kind: "setResolution", key: DUE, side: "google" });
    expect(conflictStats(both)).toEqual({ resolved: 2, total: 2 });
    expect(conflictsResolved(both)).toBe(true);
  });

  it("resolutions survive a round boundary in history, reset live", () => {
    const r1 = run([
      { kind: "setResolution", key: TITLE, side: "steady" },
      { kind: "setResolution", key: DUE, side: "google" },
    ]);
    const r2 = startNextRound(r1);
    expect(r2.history[0].resolutions[TITLE]).toEqual({ side: "steady" });
    expect(r2.response.resolutions).toEqual({});
  });
});
