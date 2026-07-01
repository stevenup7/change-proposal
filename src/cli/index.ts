import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { documentSchema, checkVersion, type ChangeProposalDocument } from "../shared/document";
import { authoringGuide, jsonSchema } from "../shared/guide";
import { exampleDocument } from "../shared/example";
import { VERSION } from "../shared/version";
import { startReviewServer, WEB_DIR } from "../server/server";
import { openBrowser } from "./open-browser";

const program = new Command();
program
  .name("change-proposal")
  .description("Interactive change-proposal review surface for coding agents")
  .version(VERSION);

// --- author: emit the versioned contract the agent authors against ----------
program
  .command("author")
  .description("Print the versioned authoring guide + JSON schema (the skill fetches this)")
  .option("--schema", "print only the JSON schema")
  .action((opts: { schema?: boolean }) => {
    process.stdout.write(opts.schema ? JSON.stringify(jsonSchema(), null, 2) + "\n" : authoringGuide() + "\n");
  });

// --- example: write a sample proposal.json ----------------------------------
program
  .command("example")
  .description("Write a sample proposal document to a file")
  .argument("[file]", "output path", "proposal.json")
  .action(async (file: string) => {
    const path = resolve(process.cwd(), file);
    await writeFile(path, JSON.stringify(exampleDocument(), null, 2) + "\n", "utf8");
    console.log(`Wrote example proposal to ${path}`);
  });

// --- validate: schema + version check ---------------------------------------
program
  .command("validate")
  .description("Validate a proposal document against the schema and version")
  .argument("[file]", "proposal file", "proposal.json")
  .action(async (file: string) => {
    const doc = await loadOrExit(file);
    const v = checkVersion(doc);
    if (!v.ok) {
      console.error(`✗ version mismatch: document is v${v.docVersion}, tool is v${v.toolVersion}. Regenerate with the current skill.`);
      process.exit(1);
    }
    console.log(`✓ valid (v${v.toolVersion}) — ${doc.proposal.sections.length} sections, ${doc.proposal.questions.length} questions`);
  });

// --- review: validate, serve the UI, wait for finalize ----------------------
program
  .command("review")
  .description("Open the review UI for a proposal and wait for the user to finalize")
  .argument("[file]", "proposal file", "proposal.json")
  .option("-p, --port <port>", "server port", "4179")
  .action(async (file: string, opts: { port: string }) => {
    const path = resolve(process.cwd(), file);
    const doc = await loadOrExit(file);
    const v = checkVersion(doc);
    if (!v.ok) {
      console.error(`✗ version mismatch: document is v${v.docVersion}, tool is v${v.toolVersion}. Regenerate with the current skill.`);
      process.exit(1);
    }
    if (!existsSync(resolve(WEB_DIR, "index.html"))) {
      console.error(`✗ UI not built. Run \`npm run build\` first (expected ${WEB_DIR}).`);
      process.exit(1);
    }

    const port = Number(opts.port) || 4179;
    const server = await startReviewServer({ file: path, doc, port });
    console.log(`\n  Change Proposal — reviewing ${file}`);
    console.log(`  ${server.url}\n`);
    console.log("  Waiting for you to finalize in the browser… (Ctrl-C to cancel)\n");
    openBrowser(server.url);

    const finalized = await server.finished;
    const reviewed = Object.keys(finalized.response.review).length;
    console.log(`\n  ✓ Finalized. ${reviewed} section(s) reviewed. Responses written to ${file}.`);
    process.exit(0);
  });

program.parseAsync(process.argv);

// --- helpers ----------------------------------------------------------------

async function loadOrExit(file: string): Promise<ChangeProposalDocument> {
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
  try {
    return documentSchema.parse(raw);
  } catch (e) {
    if (e instanceof ZodError) {
      console.error("✗ schema validation failed:");
      for (const issue of e.issues) console.error(`  • ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      process.exit(1);
    }
    throw e;
  }
}
