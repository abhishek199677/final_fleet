/**
 * Vercel server entrypoint.
 *
 * Vercel detects `server.js` in the project root, runs it, and captures the
 * HTTP server that `app.listen()` opens — routing every request to it with
 * the ORIGINAL URL. That means Nest's global prefix (`v1`), Express routing,
 * body parsing, and async context all behave exactly like the local server.
 *
 * `nest build` (the Vercel build command) must emit dist/ before this file
 * is bundled; Node's file tracer then includes dist/ and node_modules/.
 */
require('./dist/main.js');
