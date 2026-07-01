import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ChangeProposalDocument } from "../shared/document";
import { fetchProposal } from "./api";
import { App } from "./components/App";
import "./styles.css";

function Boot() {
  const [doc, setDoc] = useState<ChangeProposalDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProposal().then(setDoc).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="boot-error">Failed to load proposal: {error}</div>;
  if (!doc) return <div className="boot-loading">Loading…</div>;
  return <App initialDoc={doc} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
);
