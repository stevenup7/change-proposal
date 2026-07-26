import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ZodError } from "zod";
import {
  documentSchema,
  checkVersion,
  startNextRound,
  type ChangeProposalDocument,
  type DocumentKind,
} from "../shared/document";
import { renderDigest } from "../shared/digest";
import { authoringGuide, describeGuide, jsonSchema } from "../shared/guide";
import { exampleDocument, exampleDescription } from "../shared/example";
import { VERSION } from "../shared/version";
import { startReviewServer, WEB_DIR } from "../server/server";
import { openBrowser } from "./open-browser";

// One CLI, two faces: `change-proposal` and `describe-architecture` are the same
// program built for different document kinds. The kind selects the bin name, the
// authoring guide, the example, and the finalize messaging — and is hard-checked
// against the document's own `kind` (a proposal can't be served by the describe
// tool, or vice versa; no fallbacks).

interface Mode {
  name: string;
  description: string;
  defaultFile: string;
  guide: () => string;
  example: () => ChangeProposalDocument;
  exampleNoun: string;
  reviewHeading: string;
}

const MODES: Record<DocumentKind, Mode> = {
  "change-proposal": {
    name: "change-proposal",
    description: "Interactive change-proposal review surface for coding agents",
    defaultFile: "proposal.json",
    guide: authoringGuide,
    example: exampleDocument,
    exampleNoun: "proposal",
    reviewHeading: "Change Proposal — reviewing",
  },
  "architecture-description": {
    name: "describe-architecture",
    description:
      "Interactive architecture-description surface — the agent describes the current system, the human runs a clarification loop",
    defaultFile: "architecture.json",
    guide: describeGuide,
    example: exampleDescription,
    exampleNoun: "description",
    reviewHeading: "Architecture Description — presenting",
  },
};

export function buildProgram(kind: DocumentKind): Command {
  const mode = MODES[kind];
  const program = new Command();
  program.name(mode.name).description(mode.description).version(VERSION);

  // --- author: emit the versioned contract the agent authors against --------
  program
    .command("author")
    .description("Print the versioned authoring guide + JSON schema (the skill fetches this)")
    .option("--schema", "print only the JSON schema")
    .action((opts: { schema?: boolean }) => {
      process.stdout.write(
        opts.schema ? JSON.stringify(jsonSchema(), null, 2) + "\n" : mode.guide() + "\n",
      );
    });

  // --- example: write a sample document ------------------------------------
  program
    .command("example")
    .description(`Write a sample ${mode.exampleNoun} document to a file`)
    .argument("[file]", "output path", mode.defaultFile)
    .action(async (file: string) => {
      const path = resolve(process.cwd(), file);
      await writeFile(path, JSON.stringify(mode.example(), null, 2) + "\n", "utf8");
      console.log(`Wrote example ${mode.exampleNoun} to ${path}`);
    });

  // --- validate: schema + version + kind check ------------------------------
  program
    .command("validate")
    .description(`Validate a ${mode.exampleNoun} document against the schema and version`)
    .argument("[file]", `${mode.exampleNoun} file`, mode.defaultFile)
    .action(async (file: string) => {
      const doc = await loadOrExit(file, kind);
      console.log(
        `✓ valid (v${VERSION}) — ${doc.proposal.sections.length} sections, ${doc.proposal.questions.length} questions`,
      );
    });

  // --- iterate: archive the finished round and open the next one ------------
  program
    .command("iterate")
    .description("Start the next round: archive response into history, keep dialog, bump round")
    .argument("[file]", `${mode.exampleNoun} file`, mode.defaultFile)
    .action(async (file: string) => {
      const path = resolve(process.cwd(), file);
      const doc = await loadOrExit(file, kind);
      const next = startNextRound(doc);
      await writeFile(path, JSON.stringify(next, null, 2) + "\n", "utf8");
      console.log(
        `✓ round ${doc.round} archived — now editing round ${next.round}. Revise the ${mode.exampleNoun}, then \`review\`.`,
      );
    });

  // --- result: print the response digest (ids joined back to labels) --------
  program
    .command("result")
    .description(
      `Print an agent-readable digest of a ${mode.exampleNoun}'s response — no JSON parsing needed`,
    )
    .argument("[file]", `${mode.exampleNoun} file`, mode.defaultFile)
    .action(async (file: string) => {
      const doc = await loadOrExit(file, kind);
      console.log(renderDigest(doc));
    });

  // --- review: validate, serve the UI, wait for finalize --------------------
  program
    .command("review")
    .description(`Open the UI for a ${mode.exampleNoun} and wait for the user to finalize`)
    .argument("[file]", `${mode.exampleNoun} file`, mode.defaultFile)
    .option("-p, --port <port>", "server port", "4179")
    .action(async (file: string, opts: { port: string }) => {
      const path = resolve(process.cwd(), file);
      const doc = await loadOrExit(file, kind);
      if (!existsSync(resolve(WEB_DIR, "index.html"))) {
        console.error(`✗ UI not built. Run \`npm run build\` first (expected ${WEB_DIR}).`);
        process.exit(1);
      }

      const port = Number(opts.port) || 4179;
      const server = await startReviewServer({ file: path, doc, port });
      console.log(`\n  ${mode.reviewHeading} ${file}`);
      console.log(`  ${server.url}\n`);
      console.log("  Waiting for you to finalize in the browser… (Ctrl-C to cancel)\n");
      openBrowser(server.url);

      const finalized = await server.finished;
      console.log(`\n  Finalized — responses written to ${file}.\n`);
      console.log(renderDigest(finalized));
      process.exit(0);
    });

  return program;

  // --- helpers --------------------------------------------------------------

  async function loadOrExit(file: string, expectedKind: DocumentKind): Promise<ChangeProposalDocument> {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) {
      console.error(`✗ file not found: ${path}`);
      process.exit(1);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(path, "utf8"));
    } catch (e) {
      console.error(`✗ not valid JSON: ${(e as Error).message}`);
      process.exit(1);
    }
    let doc: ChangeProposalDocument;
    try {
      doc = documentSchema.parse(raw);
    } catch (e) {
      if (e instanceof ZodError) {
        console.error("✗ schema validation failed:");
        for (const issue of e.issues)
          console.error(`  • ${issue.path.join(".") || "(root)"}: ${issue.message}`);
        process.exit(1);
      }
      throw e;
    }
    const v = checkVersion(doc);
    if (!v.ok) {
      console.error(
        `✗ version mismatch: document is v${v.docVersion}, tool is v${v.toolVersion}. Regenerate with the current skill.`,
      );
      process.exit(1);
    }
    if (doc.kind !== expectedKind) {
      const other = MODES[doc.kind].name;
      console.error(
        `✗ this document is kind "${doc.kind}" — use the \`${other}\` command for it (this is \`${mode.name}\`).`,
      );
      process.exit(1);
    }
    return doc;
  }
}
