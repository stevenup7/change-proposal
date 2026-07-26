import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  initial: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function Composer({ open, initial, placeholder, onClose, onSubmit }: Props) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (open) setText(initial);
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <span className="dialog-title">Send feedback</span>
          <span className="dialog-tag">→ coding agent</span>
        </div>
        <textarea
          className="dialog-text"
          autoFocus
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => onSubmit(text)}>
            Send to agent
          </button>
        </div>
      </div>
    </div>
  );
}
