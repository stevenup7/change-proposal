import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeProposalDocument, Verdict } from "../../shared/document";
import { reduce, sectionThread, type Action } from "../state";
import { saveDocument } from "../api";
import { Header } from "./Header";
import { Section } from "./Section";
import { Questions } from "./Questions";
import { Composer } from "./Composer";

type SaveState = "idle" | "saving" | "saved" | "error";
type Theme = "dark" | "light";

export function App({ initialDoc }: { initialDoc: ChangeProposalDocument }) {
  const [doc, setDoc] = useState(initialDoc);
  const [theme, setTheme] = useState<Theme>("dark");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialDoc.proposal.sections.map((s) => [s.id, true])),
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const finalized = doc.status === "finalized";

  // Autosave drafts (debounced). Skip the very first render and anything post-finalize.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (finalized) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const r = await saveDocument(doc);
      setSaveState(r.ok ? "saved" : "error");
    }, 600);
    return () => clearTimeout(t);
  }, [doc, finalized]);

  const dispatch = useCallback((action: Action) => setDoc((d) => reduce(d, action)), []);

  const finalize = useCallback(async () => {
    const next = reduce(doc, { kind: "finalize" });
    setDoc(next);
    setSaveState("saving");
    const r = await saveDocument(next);
    setSaveState(r.ok ? "saved" : "error");
  }, [doc]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (finalized) {
    return (
      <div className="done-screen" data-theme={theme}>
        <div className="done-card">
          <div className="done-check">✓</div>
          <h2>Review sent to the agent</h2>
          <p>Your responses have been saved. You can close this tab and return to your agent.</p>
        </div>
      </div>
    );
  }

  const p = doc.proposal;

  return (
    <div className="app">
      <Header
        doc={doc}
        theme={theme}
        saveState={saveState}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onApproveAll={() => dispatch({ kind: "approveAll" })}
        onOpenFeedback={() => setComposerOpen(true)}
        onFinalize={finalize}
      />

      <main className="main">
        {p.sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            verdict={doc.response.review[section.id]}
            thread={sectionThread(doc, section.id)}
            expanded={expanded[section.id] ?? true}
            onToggleExpand={() =>
              setExpanded((e) => ({ ...e, [section.id]: !(e[section.id] ?? true) }))
            }
            onToggleVerdict={(verdict: Verdict) =>
              dispatch({ kind: "toggleVerdict", sectionId: section.id, verdict })
            }
            onAddDialog={(text: string) =>
              dispatch({ kind: "addDialog", sectionId: section.id, text })
            }
          />
        ))}

        {p.questions.length > 0 && (
          <Questions
            questions={p.questions}
            answers={doc.response.answers}
            onChoice={(questionId, choice) => dispatch({ kind: "setAnswerChoice", questionId, choice })}
            onOther={(questionId, other) => dispatch({ kind: "setAnswerOther", questionId, other })}
            onText={(questionId, text) => dispatch({ kind: "setAnswerText", questionId, text })}
          />
        )}
      </main>

      <Composer
        open={composerOpen}
        initial={doc.response.feedback}
        onClose={() => setComposerOpen(false)}
        onSubmit={(text) => {
          dispatch({ kind: "setFeedback", text });
          setComposerOpen(false);
        }}
      />
    </div>
  );
}
