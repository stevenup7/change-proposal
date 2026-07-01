import type { ChangeProposalDocument } from "../shared/document";

export async function fetchProposal(): Promise<ChangeProposalDocument> {
  const r = await fetch("/api/proposal");
  if (!r.ok) throw new Error(`failed to load proposal (${r.status})`);
  return r.json();
}

export interface SaveResult {
  ok?: boolean;
  status?: string;
  error?: string;
}

export async function saveDocument(doc: ChangeProposalDocument): Promise<SaveResult> {
  const r = await fetch("/api/document", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(doc),
  });
  return r.json().catch(() => ({ error: `save failed (${r.status})` }));
}
