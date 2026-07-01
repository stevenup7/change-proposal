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
            {
              type: "conflict",
              id: "merge",
              title: "Both sides edited these — you decide which wins",
              fields: [
                {
                  id: "title",
                  label: "Task title",
                  allowOther: true,
                  sides: [
                    { id: "steady", label: "Steady (local)", value: "Buy oat milk" },
                    { id: "google", label: "Google", value: "Buy almond milk" },
                  ],
                },
                {
                  id: "due",
                  label: "Due date",
                  allowOther: false,
                  sides: [
                    { id: "steady", label: "Steady (local)", value: "Fri 4 Jul" },
                    { id: "google", label: "Google", value: "Sat 5 Jul" },
                  ],
                },
              ],
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
