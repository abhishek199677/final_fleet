/**
 * Vercel function entry (matches the project's `server.js` functions pattern).
 *
 * All traffic is rewritten here by vercel.json. NestJS serves `/v1/*` and
 * `/docs`, so if the platform forwards the destination path (`/api/server…`)
 * instead of the original one, the prefix is stripped before Express sees it.
 */
/** Loaded lazily from the prebuilt dist/ (produced by the vercel.json buildCommand). */
type NodeHandler = (req: unknown, res: unknown) => unknown;

let expressPromise: Promise<NodeHandler> | null = null;

function loadExpress(): Promise<NodeHandler> {
  if (!expressPromise) {
    // Explicit ".js" — the Vercel function runs under Node's ESM resolver,
    // which does not extension-search for dynamic imports.
    expressPromise = import('../dist/serverless.js').then(
      (m) => m.getExpressApp() as unknown as Promise<NodeHandler>,
    );
  }
  return expressPromise;
}

export default async function server(req: Record<string, unknown> & { url?: string; body?: unknown; _body?: boolean }, res: unknown): Promise<unknown> {
  const url = req.url ?? '/';
  if (url === '/api/server') {
    req.url = '/';
  } else if (url.startsWith('/api/server/')) {
    req.url = url.slice('/api/server'.length);
  }

  // If the platform already parsed the body, mark it so Express's
  // body-parser/multer skip re-reading a consumed stream.
  if (req.body !== undefined && req._body === undefined) {
    req._body = true;
  }

  const app = await loadExpress();
  return app(req, res);
}
