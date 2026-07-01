import type { Question, Answer } from "../../shared/document";
import { OTHER_CHOICE } from "../state";

interface Props {
  questions: Question[];
  answers: Record<string, Answer>;
  onChoice: (questionId: string, choice: string) => void;
  onOther: (questionId: string, text: string) => void;
  onText: (questionId: string, text: string) => void;
}

const LETTERS = "ABCDEFGHIJ";

function answered(a: Answer | undefined): boolean {
  if (!a) return false;
  if (a.text !== undefined) return a.text.trim().length > 0;
  if (a.choice === OTHER_CHOICE) return (a.other ?? "").trim().length > 0;
  return (a.choice ?? "").length > 0;
}

export function Questions({ questions, answers, onChoice, onOther, onText }: Props) {
  const done = questions.filter((q) => answered(answers[q.id])).length;

  return (
    <section className="card questions">
      <div className="card-head questions-head">
        <span className="badge badge-q">?</span>
        <div className="card-titles">
          <div className="card-title">Questions from the agent</div>
          <div className="card-summary">The agent needs your input to proceed.</div>
        </div>
        <span className="progress-text">
          {done} of {questions.length} answered
        </span>
      </div>

      <div className="card-body">
        {questions.map((q) => {
          const a = answers[q.id];
          return (
            <div className="question" key={q.id}>
              <div className="question-prompt">
                {q.prompt}
                {answered(a) && <span className="pill pill-add">answered</span>}
              </div>

              {q.kind === "choice" ? (
                <div className="options">
                  {(q.options ?? []).map((opt, i) => (
                    <button
                      key={opt.id}
                      className={`option ${a?.choice === opt.id ? "option-on" : ""}`}
                      onClick={() => onChoice(q.id, opt.id)}
                    >
                      <span className="option-letter">{LETTERS[i] ?? "•"}</span>
                      {opt.label}
                    </button>
                  ))}
                  {q.allowOther && (
                    <button
                      className={`option ${a?.choice === OTHER_CHOICE ? "option-on" : ""}`}
                      onClick={() => onChoice(q.id, OTHER_CHOICE)}
                    >
                      <span className="option-letter">+</span>
                      Other…
                    </button>
                  )}
                  {q.allowOther && a?.choice === OTHER_CHOICE && (
                    <input
                      className="other-input"
                      autoFocus
                      placeholder="Your answer…"
                      value={a?.other ?? ""}
                      onChange={(e) => onOther(q.id, e.target.value)}
                    />
                  )}
                </div>
              ) : (
                <textarea
                  className="text-answer"
                  placeholder="Type your answer…"
                  value={a?.text ?? ""}
                  onChange={(e) => onText(q.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
