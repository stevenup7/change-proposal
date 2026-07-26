import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeProposalDocument, Outcome, Verdict } from "../../shared/document";
import { reduce, sectionThread, conflictStats, type Action } from "../state";
import { saveDocument } from "../api";
import { KIND_COPY } from "../copy";
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

  const finalize = useCallback(async (outcome: Outcome) => {
    const next = reduce(doc, { kind: "finalize", outcome });
    setDoc(next);
    setSaveState("saving");
    const r = await saveDocument(next);
    setSaveState(r.ok ? "saved" : "error");
  }, [doc]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const copy = KIND_COPY[doc.kind];

  if (finalized) {
    const done =
      doc.response.outcome === copy.finalizeNegative.outcome ? copy.done.negative : copy.done.positive;
    return (
      <div className="done-screen" data-theme={theme}>
        <div className="done-card">
          <div className="done-check">{done.icon}</div>
          <h2>{done.title}</h2>
          <p>{done.body}</p>
        </div>
      </div>
    );
  }

  const p = doc.proposal;
  const conflicts = conflictStats(doc);
  const unresolvedConflicts = conflicts.total - conflicts.resolved;

  return (
    <div className="app">
      <Header
        doc={doc}
        copy={copy}
        theme={theme}
        saveState={saveState}
        unresolvedConflicts={unresolvedConflicts}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onOpenFeedback={() => setComposerOpen(true)}
        onFinalize={finalize}
      />

      <main className="main">
        {p.sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            copy={copy}
            verdict={doc.response.review[section.id]}
            thread={sectionThread(doc, section.id)}
            expanded={expanded[section.id] ?? true}
            resolutions={doc.response.resolutions}
            onToggleExpand={() =>
              setExpanded((e) => ({ ...e, [section.id]: !(e[section.id] ?? true) }))
            }
            onToggleVerdict={(verdict: Verdict) =>
              dispatch({ kind: "toggleVerdict", sectionId: section.id, verdict })
            }
            onAddDialog={(text: string) =>
              dispatch({ kind: "addDialog", sectionId: section.id, text })
            }
            onResolve={(key, side, text) =>
              dispatch({ kind: "setResolution", key, side, text })
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
        placeholder={copy.composerPlaceholder}
        onClose={() => setComposerOpen(false)}
        onSubmit={(text) => {
          dispatch({ kind: "setFeedback", text });
          setComposerOpen(false);
        }}
      />
    </div>
  );
}
