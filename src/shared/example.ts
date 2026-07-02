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
              type: "schema",
              intro:
                "The 4 new columns give each **Task** a local snapshot of its remote Google source — the merge base that `reconcile()` diffs against.",
              entities: [
                {
                  id: "user",
                  name: "User",
                  badge: "TABLE",
                  emphasis: "plain",
                  fields: [
                    { name: "id", type: "String", key: "pk", status: "unchanged" },
                    { name: "email", type: "String", status: "unchanged" },
                    { name: "refreshToken", type: "String", status: "unchanged" },
                  ],
                },
                {
                  id: "task",
                  name: "Task",
                  badge: "CHANGED",
                  emphasis: "changed",
                  fields: [
                    { name: "id", key: "pk", status: "unchanged" },
                    { name: "userId", key: "fk", ref: "user", status: "unchanged" },
                    { name: "description", status: "unchanged" },
                    { name: "status", status: "unchanged" },
                    { name: "externalId", key: "fk", ref: "google", status: "unchanged" },
                    { name: "externalListId", type: "String?", status: "new" },
                    { name: "externalTitle", type: "String?", status: "new" },
                    { name: "externalDue", type: "DateTime?", status: "new" },
                    { name: "externalStatus", type: "TaskStatus?", status: "new" },
                  ],
                },
                {
                  id: "google",
                  name: "GoogleTaskItem",
                  emphasis: "external",
                  fields: [
                    { name: "id", status: "unchanged" },
                    { name: "listId", status: "unchanged" },
                    { name: "title", status: "unchanged" },
                    { name: "due", status: "unchanged" },
                    { name: "status", status: "unchanged" },
                  ],
                  footer: "EXTERNAL · GOOGLE API",
                },
              ],
              edges: [
                { from: "user", to: "task", label: "owns", fromEnd: "1", toEnd: "∞", style: "solid", tone: "primary" },
                { from: "task", to: "google", label: "snapshot", fromEnd: "1", toEnd: "▷", style: "dashed", tone: "mod" },
              ],
              columns: {
                caption: "model Task — prisma/schema.prisma",
                columns: ["column", "type", "change"],
                rows: [
                  { cells: ["id · externalId · description", "String", "unchanged"], tone: "faint" },
                  { cells: ["softDeadline · status", "—", "unchanged"], tone: "faint" },
                  { cells: ["+ externalListId", "String?", "NEW"], tone: "add" },
                  { cells: ["+ externalTitle", "String?", "NEW"], tone: "add" },
                  { cells: ["+ externalDue", "DateTime? @db.Date", "NEW"], tone: "add" },
                  { cells: ["+ externalStatus", "TaskStatus?", "NEW"], tone: "add" },
                ],
              },
            },
            {
              type: "callout",
              tone: "info",
              title: "Info",
              text: "All four columns are nullable and `external*`-prefixed; they shadow the Google source and are never shown to the user directly.",
            },
            {
              type: "callout",
              tone: "warn",
              title: "Warning",
              text: "These columns store the **last-synced Google snapshot** — the merge base. Without it there's nothing to diff against, which is the root of the bug.",
            },
            {
              type: "callout",
              tone: "add",
              title: "Safe migration",
              text: "Purely additive and nullable — the migration runs on existing data with no backfill, no downtime.",
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
                  description:
                    "You renamed this task on your phone while offline; Google Tasks has a different name. There's no automatic winner — pick the one to keep, or write your own.",
                  allowOther: true,
                  sides: [
                    {
                      id: "steady",
                      label: "Steady (local)",
                      value: "Buy oat milk",
                      note: "What you last typed on your phone.",
                    },
                    {
                      id: "google",
                      label: "Google",
                      value: "Buy almond milk",
                      note: "What the Google Tasks copy says.",
                    },
                  ],
                },
                {
                  id: "due",
                  label: "Due date",
                  description: "The due dates diverged too. Which date should the merged task keep?",
                  allowOther: false,
                  sides: [
                    { id: "steady", label: "Steady (local)", value: "Fri 4 Jul", note: "Your local edit." },
                    { id: "google", label: "Google", value: "Sat 5 Jul", note: "The remote value." },
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
