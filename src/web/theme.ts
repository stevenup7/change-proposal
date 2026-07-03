import type { Accent } from "../shared/document";

// Accent name -> CSS custom property. Drives the card's left border only —
// section identity stays a hairline, not a fill. Styling only.
export const ACCENT_VARS: Record<Accent, { color: string }> = {
  blue: { color: "var(--primary)" },
  green: { color: "var(--add)" },
  red: { color: "var(--del)" },
  amber: { color: "var(--mod)" },
  violet: { color: "var(--conflict)" },
  neutral: { color: "var(--text-dim)" },
};

export function accentVars(accent: Accent = "neutral") {
  return ACCENT_VARS[accent] ?? ACCENT_VARS.neutral;
}
