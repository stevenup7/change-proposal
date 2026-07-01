import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { documentSchema, type ChangeProposalDocument } from "../shared/document";

const here = dirname(fileURLToPath(import.meta.url));
// Built SPA. `review` requires `npm run build` to have produced this.
export const WEB_DIR = resolve(here, "../../dist/web");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

async function serveAsset(pathname: string): Promise<Response> {
  // Resolve within WEB_DIR; fall back to index.html for SPA routes.
  const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^\/+/, "");
  const candidate = resolve(WEB_DIR, rel);
  const file =
    candidate.startsWith(WEB_DIR) && rel && existsSync(candidate)
      ? candidate
      : resolve(WEB_DIR, "index.html");
  const body = await readFile(file);
  return new Response(body, {
    headers: { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" },
  });
}

export interface ReviewServer {
  url: string;
  /** Resolves with the finalized document once the user finalizes; server self-terminates. */
  finished: Promise<ChangeProposalDocument>;
  close: () => void;
}

export interface StartOptions {
  file: string;
  doc: ChangeProposalDocument;
  port: number;
}

export async function startReviewServer(opts: StartOptions): Promise<ReviewServer> {
  let doc = opts.doc;
  // The proposal region is read-only; keep the original to reject any UI that mutates it.
  const originalProposal = JSON.stringify(doc.proposal);

  let resolveFinished!: (d: ChangeProposalDocument) => void;
  const finished = new Promise<ChangeProposalDocument>((res) => (resolveFinished = res));

  const app = new Hono();

  app.get("/api/proposal", (c) => c.json(doc));

  app.put("/api/document", async (c) => {
    const parsed = documentSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "invalid document", issues: parsed.error.issues }, 400);
    }
    const incoming = parsed.data;
    if (JSON.stringify(incoming.proposal) !== originalProposal) {
      return c.json({ error: "proposal region was modified (read-only)" }, 409);
    }
    if (incoming.status === "finalized") {
      incoming.response.finalizedAt = new Date().toISOString();
    }
    doc = incoming;
    await writeFile(opts.file, JSON.stringify(doc, null, 2) + "\n", "utf8");
    if (doc.status === "finalized") {
      // Respond, then self-terminate and hand control back to the CLI.
      setTimeout(() => {
        server.close();
        resolveFinished(doc);
      }, 200);
    }
    return c.json({ ok: true, status: doc.status });
  });

  app.get("/*", async (c) => serveAsset(new URL(c.req.url).pathname));

  const server = serve({ fetch: app.fetch, port: opts.port });
  return {
    url: `http://localhost:${opts.port}`,
    finished,
    close: () => server.close(),
  };
}
