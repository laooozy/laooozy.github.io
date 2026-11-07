#!/usr/bin/env node
/**
 * Dependency-free static server for the built site (`dist/`).
 *
 * Playwright's `webServer` cannot use `astro preview` in this Astro version
 * because it backgrounds itself, so the E2E harness builds + pagefinds the
 * artifact and then runs this foreground server. It deliberately serves the
 * real `dist/` output (not the dev server) so the specs prove the shipped HTML,
 * CSS, fonts and Pagefind index.
 *
 * Behaviour:
 *  - `/` and every directory resolve to `index.html`;
 *  - like GitHub Pages, an extensionless path falls back to `<path>.html`
 *    (so `/404` serves `404.html` with status 200), then `<path>/index.html`;
 *  - an unknown path serves `404.html` with status 404 (the real not-found
 *    document), matching how GitHub Pages responds;
 *  - content types cover the artifact's html/js/css/json/images/fonts/wasm/gz;
 *  - every request is resolved inside the artifact root; `..`, encoded
 *    traversal, a NUL byte or a symlink escaping the root is rejected with 403;
 *  - HEAD is supported and the process exits cleanly on SIGINT/SIGTERM.
 *
 * Usage: `PORT=4322 DIST_DIR=dist node scripts/serve-dist.mjs` (both default to
 * 4322 and `dist`).
 */

import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT ?? "4322", 10);
const DIST_DIR = process.env.DIST_DIR ?? "dist";
const ROOT = resolve(process.cwd(), DIST_DIR);
const NOT_FOUND = resolve(ROOT, "404.html");

/** Artifact extensions -> response content type. */
const CONTENT_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".htm", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".wasm", "application/wasm"],
  [".gz", "application/gzip"],
  [".pdf", "application/pdf"],
]);

function contentTypeFor(path) {
  return (
    CONTENT_TYPES.get(extname(path).toLowerCase()) ?? "application/octet-stream"
  );
}

/** Resolve a URL pathname inside `dist/`, or `null` when it escapes the root. */
function resolveInsideRoot(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decoded.includes("\0")) return null;
  // Prefix with "." so an absolute pathname cannot replace the root.
  const candidate = resolve(ROOT, `.${decoded}`);
  if (candidate !== ROOT && !candidate.startsWith(`${ROOT}${sep}`)) return null;
  return candidate;
}

async function sendFile(request, response, filePath, status = 200) {
  const fileStat = await stat(filePath);
  response.writeHead(status, {
    "content-type": contentTypeFor(filePath),
    "content-length": fileStat.size,
    "cache-control": "no-store",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath)
    .on("error", () => response.destroy())
    .pipe(response);
}

function isInsideRoot(path) {
  return path === ROOT || path.startsWith(`${ROOT}${sep}`);
}

/**
 * Resolve a URL pathname to a file in the artifact, mimicking GitHub Pages'
 * extensionless lookup. Returns `forbidden` when the path escapes the root.
 */
async function resolveArtifact(pathname) {
  const target = resolveInsideRoot(pathname);
  if (target === null) return { kind: "forbidden" };

  const candidates = [target];
  if (!extname(target)) {
    candidates.push(`${target}.html`, resolve(target, "index.html"));
  }

  for (const candidate of candidates) {
    let resolved;
    try {
      resolved = await realpath(candidate);
    } catch {
      continue;
    }
    if (!isInsideRoot(resolved)) return { kind: "forbidden" };

    let candidateStat;
    try {
      candidateStat = await stat(resolved);
    } catch {
      continue;
    }

    if (candidateStat.isDirectory()) {
      const index = resolve(resolved, "index.html");
      try {
        const indexResolved = await realpath(index);
        if (!isInsideRoot(indexResolved)) return { kind: "forbidden" };
        if ((await stat(indexResolved)).isFile()) {
          return { kind: "file", path: indexResolved };
        }
      } catch {
        continue;
      }
    } else if (candidateStat.isFile()) {
      return { kind: "file", path: resolved };
    }
  }

  return { kind: "missing" };
}

async function sendNotFound(request, response) {
  try {
    await sendFile(request, response, NOT_FOUND, 404);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("404: Not Found");
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = new URL(request.url ?? "/", `http://${HOST}:${PORT}`).pathname;
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }

  const artifact = await resolveArtifact(pathname);
  if (artifact.kind === "forbidden") {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("403: Forbidden");
    return;
  }

  if (artifact.kind === "file") {
    await sendFile(request, response, artifact.path);
    return;
  }

  await sendNotFound(request, response);
});

server.listen(PORT, HOST, () => {
  console.log(`[serve-dist] serving ${ROOT} at http://${HOST}:${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
