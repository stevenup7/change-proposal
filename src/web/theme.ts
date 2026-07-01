import type { Accent } from "../shared/document";

// Accent name -> CSS custom-property pair (color + tint bg). Styling only.
export const ACCENT_VARS: Record<Accent, { color: string; bg: string }> = {
  blue: { color: "var(--primary)", bg: "var(--primary-bg)" },
  green: { color: "var(--add)", bg: "var(--add-bg)" },
  red: { color: "var(--del)", bg: "var(--del-bg)" },
  amber: { color: "var(--mod)", bg: "var(--mod-bg)" },
  violet: { color: "var(--conflict)", bg: "var(--conflict-bg)" },
  neutral: { color: "var(--text-dim)", bg: "var(--surface-3)" },
};

export function accentVars(accent: Accent = "neutral") {
  return ACCENT_VARS[accent] ?? ACCENT_VARS.neutral;
}
