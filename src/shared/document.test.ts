import { describe, it, expect } from "vitest";
import { documentSchema } from "./document";
import { exampleDocument, exampleDescription } from "./example";

describe("document kinds are strict about their tokens", () => {
  it("both example documents validate", () => {
    expect(() => documentSchema.parse(exampleDocument())).not.toThrow();
    expect(() => documentSchema.parse(exampleDescription())).not.toThrow();
  });

  it("a description may not use change-proposal verdicts", () => {
    const doc = exampleDescription();
    doc.response.review.arch = "approved";
    const r = documentSchema.safeParse(doc);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["response", "review", "arch"]);
    }
  });

  it("a change-proposal may not use description outcomes", () => {
    const doc = exampleDocument();
    doc.response.outcome = "understood";
    expect(documentSchema.safeParse(doc).success).toBe(false);
  });

  it("history is checked too, not just the live response", () => {
    const doc = exampleDescription();
    doc.history = [{ review: { arch: "rejected" }, answers: {}, resolutions: {}, feedback: "" }];
    expect(documentSchema.safeParse(doc).success).toBe(false);
  });

  it("kind defaults to change-proposal for proposal docs", () => {
    const raw = JSON.parse(JSON.stringify(exampleDocument())) as Record<string, unknown>;
    delete raw.kind;
    const parsed = documentSchema.parse(raw);
    expect(parsed.kind).toBe("change-proposal");
  });
});
