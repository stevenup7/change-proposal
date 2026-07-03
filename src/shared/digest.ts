import {
  OTHER_CHOICE,
  type Answer,
  type ChangeProposalDocument,
  type Question,
  type Resolution,
} from "./document";
import { CONFLICT, type ConflictBlock, type ConflictField } from "./blocks/conflict";

/**
 * Render the response region as agent-readable text. The raw JSON answers in ids
 * (`policy.missed → roll`) that only mean something joined against the proposal's
 * labels, prompts, and side values — the digest does that join once, here, so the
 * agent never has to re-parse the document. The JSON stays the source of truth.
 */
export function renderDigest(doc: ChangeProposalDocument): string {
  const r = doc.response;
  const lines: string[] = [];

  lines.push(`# Review result — round ${doc.round}${r.finalizedAt ? ` · finalized ${r.finalizedAt}` : ""}`);
  lines.push("");
  if (doc.status !== "finalized") {
    lines.push(`STATUS: ${doc.status} — the human has not finalized this round yet.`);
  } else if (r.outcome === "discuss") {
    lines.push("OUTCOME: discuss — do NOT go ahead. Reply in the dialog, iterate, and send another round.");
  } else {
    lines.push("OUTCOME: approved — the human agrees. Go ahead with what this proposal was gating.");
  }

  lines.push("", "## Section verdicts");
  if (Object.keys(r.review).length === 0) {
    lines.push("(none given — with an approved outcome, silence means no objection)");
  } else {
    for (const s of doc.proposal.sections) {
      lines.push(`- ${s.title} [${s.id}]: ${r.review[s.id] ?? "no verdict"}`);
    }
  }

  const conflictBlocks = doc.proposal.sections.flatMap((s) =>
    s.blocks.filter((b): b is ConflictBlock => b.type === CONFLICT),
  );
  if (conflictBlocks.length > 0) {
    lines.push("", "## Conflict decisions");
    for (const block of conflictBlocks) {
      for (const field of block.fields) {
        const key = `${block.id}.${field.id}`;
        lines.push(`- ${field.label} [${key}] → ${describeResolution(r.resolutions[key], field)}`);
      }
    }
  }

  if (doc.proposal.questions.length > 0) {
    lines.push("", "## Question answers");
    for (const q of doc.proposal.questions) {
      lines.push(`- ${q.prompt} [${q.id}]`);
      lines.push(`  → ${describeAnswer(r.answers[q.id], q)}`);
    }
  }

  const notes: string[] = [];
  for (const s of doc.proposal.sections) {
    for (const entry of doc.dialog[s.id] ?? []) {
      if (entry.author === "human" && entry.round === doc.round) {
        notes.push(`- ${s.title} [${s.id}]: ${entry.text}`);
      }
    }
  }
  if (notes.length > 0) lines.push("", "## Notes from the human (this round)", ...notes);

  if (r.feedback.trim().length > 0) lines.push("", "## Overall feedback", r.feedback.trim());

  return lines.join("\n");
}

function describeResolution(res: Resolution | undefined, field: ConflictField): string {
  if (!res || res.side.length === 0) return "UNRESOLVED — left for you to decide";
  if (res.side === OTHER_CHOICE) {
    const text = (res.text ?? "").trim();
    return text.length > 0 ? `Other (write-in): "${text}"` : "UNRESOLVED — Other picked but no write-in";
  }
  const side = field.sides.find((s) => s.id === res.side);
  return side ? `${side.label}: "${side.value}"` : `unknown side id "${res.side}"`;
}

function describeAnswer(answer: Answer | undefined, q: Question): string {
  if (q.kind === "text") {
    const text = (answer?.text ?? "").trim();
    return text.length > 0 ? `"${text}"` : "unanswered";
  }
  if (!answer?.choice) return "unanswered";
  if (answer.choice === OTHER_CHOICE) {
    const text = (answer.other ?? "").trim();
    return text.length > 0 ? `Other (write-in): "${text}"` : "unanswered (Other picked but no write-in)";
  }
  const option = q.options?.find((o) => o.id === answer.choice);
  return option ? option.label : `unknown option id "${answer.choice}"`;
}
