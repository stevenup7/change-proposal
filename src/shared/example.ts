import { VERSION } from "./version";
import type { ChangeProposalDocument } from "./document";
import { emptyResponse } from "./document";

/** A representative sample proposal — used by `change-proposal example` and by tests. */
export function exampleDocument(): ChangeProposalDocument {
  return {
    version: VERSION,
    status: "pending",
    round: 1,
    proposal: {
      title: "Fix: importing from Google Tasks overwrites your local edits",
      description:
        "Replace the one-way mirror with a **3-way merge** plus opt-in write-back. " +
        "Non-conflicting edits reconcile automatically in both directions.",
      sections: [
        {
          id: "db",
          title: "Database schema",
          badge: "DB",
          accent: "amber",
          summary: "Task model — 4 new columns, 1 migration.",
          blocks: [
            {
              type: "markdown",
              text: "Add snapshot + sync-tracking columns to `Task` so we can compute a 3-way merge base.",
            },
            {
              type: "callout",
              tone: "add",
              title: "Safe migration",
              text: "Purely additive columns — no backfill, no downtime.",
            },
          ],
        },
        {
          id: "logic",
          title: "Business logic",
          badge: "LOGIC",
          accent: "violet",
          summary: "Merge rules for reconciling local and remote edits.",
          blocks: [
            {
              type: "markdown",
              text: "Reconcile each field independently:\n\n- remote-only change → **pull**\n- local-only change → **push**\n- both changed to the same value → **converge**\n- both changed differently → **conflict** (ask the user)",
            },
          ],
        },
        {
          id: "arch",
          title: "Architecture",
          badge: "ARCH",
          accent: "blue",
          summary: "Where the merge sits: sync flow, stack altitude, and ownership.",
          blocks: [
            {
              type: "markdown",
              text: "The merge engine is a **new module** between the importer and the store — nothing else moves.",
            },
            {
              type: "arch-flow",
              nodes: [
                { id: "google", label: "Google Tasks API", kind: "external", note: "remote source" },
                { id: "importer", label: "Task importer", kind: "process", note: "src/sync/import.ts", status: "modified" },
                { id: "merge", label: "3-way merge", kind: "process", note: "src/sync/merge.ts", status: "added" },
                { id: "snapshot", label: "snapshot", kind: "file", note: "merge base per task" },
                { id: "db", label: "tasks.db", kind: "file", note: "local store" },
              ],
              edges: [
                { from: "google", to: "importer", label: "pull remote" },
                { from: "importer", to: "merge", label: "merge inputs" },
                { from: "snapshot", to: "merge", label: "merge base" },
                { from: "merge", to: "db", label: "write merged" },
                { from: "merge", to: "google", label: "push local wins" },
              ],
            },
            {
              type: "arch-layers",
              layers: [
                {
                  label: "Sync",
                  sublabel: "src/sync",
                  accent: "violet",
                  items: [
                    { label: "import.ts", status: "modified" },
                    { label: "merge.ts", status: "added" },
                    { label: "push.ts", status: "added" },
                  ],
                  connector: "reads · writes",
                },
                {
                  label: "Domain",
                  sublabel: "src/tasks",
                  accent: "blue",
                  items: [{ label: "Task model", status: "modified" }, { label: "list queries" }],
                  connector: "persists via",
                },
                {
                  label: "Store",
                  sublabel: "sqlite",
                  accent: "amber",
                  items: [{ label: "tasks.db" }, { label: "migration 007", status: "added" }],
                },
              ],
            },
            {
              type: "arch-boundaries",
              boundary: "task-app",
              actors: [
                { label: "Google Tasks API", note: "remote source of truth" },
                { label: "User", note: "edits tasks locally" },
              ],
              containers: [
                {
                  label: "src/sync",
                  tech: "node",
                  status: "modified",
                  children: [
                    { label: "import.ts", status: "modified" },
                    {
                      label: "merge/",
                      status: "added",
                      children: [
                        { label: "rules.ts", status: "added" },
                        { label: "conflicts.ts", status: "added" },
                      ],
                    },
                  ],
                },
                {
                  label: "src/ui",
                  tech: "react",
                  children: [{ label: "task list" }, { label: "conflict modal", status: "added" }],
                },
              ],
              foundation: {
                label: "src/db",
                tech: "sqlite",
                children: [{ label: "Task", status: "modified" }, { label: "GoogleTaskItem" }],
              },
            },
          ],
        },
        {
          id: "code",
          title: "Code changes",
          badge: "CODE",
          accent: "blue",
          summary: "New merge module + wire it into the importer.",
          blocks: [
            {
              type: "diff",
              filename: "src/sync/import.ts",
              patch:
                "@@ -12,3 +12,5 @@\n   const local = await loadTask(id)\n-  return applyRemote(local, remote)\n+  const base = await loadSnapshot(id)\n+  return merge(base, local, remote)",
            },
          ],
        },
      ],
      questions: [
        {
          id: "due-date-strategy",
          prompt: "How should we resolve a conflicting due date?",
          kind: "choice",
          allowOther: true,
          options: [
            { id: "modal", label: "Ask me each time (resolution modal)" },
            { id: "local", label: "Prefer my local value" },
            { id: "remote", label: "Prefer the Google value" },
          ],
        },
        {
          id: "scope",
          prompt: "Anything else you want covered in this fix?",
          kind: "text",
          allowOther: false,
        },
      ],
    },
    dialog: {},
    response: emptyResponse(),
    history: [],
  };
}
