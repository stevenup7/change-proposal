// Single monotonic tool version. The document carries the version it was authored
// with; `review` hard-fails on mismatch (no fallbacks, force upgrade). Bump on any
// schema/block change — and keep package.json's "version" in sync with this.
export const VERSION = "0.7.0";
