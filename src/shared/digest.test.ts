import { describe, expect, it } from "vitest";
import { exampleDocument, exampleDescription } from "./example";
import { renderDigest } from "./digest";
import { OTHER_CHOICE, type ChangeProposalDocument } from "./document";

// The digest's whole job is the id → label join; these pin each join kind.
describe("renderDigest", () => {
  it("joins every response id back to its authored label", () => {
    const doc: ChangeProposalDocument = {
      ...exampleDocument(),
      status: "finalized",
      dialog: { logic: [{ round: 1, author: "human", text: "Converge feels risky for dates." }] },
      response: {
        review: { db: "approved", logic: "changes-requested" },
        answers: {
          "due-date-strategy": { choice: OTHER_CHOICE, other: "Ask only for shifts over a day" },
          scope: { text: "Cover recurring tasks too" },
        },
        resolutions: { "merge.title": { side: "steady" } },
        feedback: "Looks close.",
        outcome: "approved",
        finalizedAt: "2026-07-03T00:00:00.000Z",
      },
    };

    const digest = renderDigest(doc);

    expect(digest).toContain("round 1 · finalized 2026-07-03T00:00:00.000Z");
    expect(digest).toContain("OUTCOME: approved");
    // Verdicts: every section listed, ids kept for cross-reference.
    expect(digest).toContain('- Database schema [db]: approved');
    expect(digest).toContain('- Business logic [logic]: changes-requested');
    expect(digest).toContain('- Code changes [code]: no verdict');
    // Conflict picks: side id joined to label + literal value; missing pick called out.
    expect(digest).toContain('- Task title [merge.title] → Steady (local): "Buy oat milk"');
    expect(digest).toContain("- Due date [merge.due] → UNRESOLVED — left for you to decide");
    // Answers: write-in surfaced verbatim, text answers quoted.
    expect(digest).toContain('Other (write-in): "Ask only for shifts over a day"');
    expect(digest).toContain('"Cover recurring tasks too"');
    // This round's human notes and global feedback.
    expect(digest).toContain("- Business logic [logic]: Converge feels risky for dates.");
    expect(digest).toContain("Looks close.");
  });

  it("speaks the description kind's outcome language", () => {
    const base = exampleDescription();
    const doc: ChangeProposalDocument = {
      ...base,
      status: "finalized",
      response: {
        ...base.response,
        review: { arch: "needs-clarification" },
        outcome: "clarify",
      },
    };
    const digest = renderDigest(doc);
    expect(digest).toContain("OUTCOME: clarify");
    expect(digest).toContain("- Architecture [arch]: needs-clarification");
  });

  it("says so when nothing has happened yet", () => {
    const digest = renderDigest(exampleDocument());
    expect(digest).toContain("STATUS: pending");
    expect(digest).toContain("(none given — with a positive outcome, silence means no objection)");
    expect(digest).not.toContain("## Notes from the human");
    expect(digest).not.toContain("## Overall feedback");
  });
});
