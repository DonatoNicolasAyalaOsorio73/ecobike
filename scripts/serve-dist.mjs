// Serves the `expo export --platform web` output so the *production* bundle
// can be exercised in a browser, not just the dev server. SPA fallback: any
// unknown path returns index.html, matching how a static host must be
// configured for expo-router's client-side routes to work on refresh.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join, normalize, resolve } from "node:path";

// fileURLToPath + resolve so ROOT uses the platform's own separators —
// comparing a forward-slash ROOT against join()'s backslashes made every
// containment check fail on Windows, and the SPA fallback then served
// index.html in place of the JS bundle.
const ROOT = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const PORT = Number(process.env.PORT ?? 8082);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  // normalize() collapses any ../ before it can escape the served directory.
  const candidate = join(ROOT, normalize(urlPath));
  const safe = candidate.startsWith(ROOT) ? candidate : ROOT;

  for (const file of [safe, join(ROOT, "index.html")]) {
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
      return;
    } catch {
      // fall through to the SPA index.html
    }
  }

  res.writeHead(404).end("Not found");
}).listen(PORT, () => console.log(`Serving dist/ on http://localhost:${PORT}`));
