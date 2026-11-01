#!/usr/bin/env node
/**
 * Internal link checker for the static build.
 *
 * Walks every HTML file in `dist/`, extracts `<a href>` targets, and verifies
 * that each internal target resolves to a file emitted by the build. External
 * URLs and non-navigational schemes are ignored; no network access is made.
 *
 * Usage: node scripts/check-links.mjs [distDir]
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DIST_DIR = path.resolve(process.argv[2] ?? "dist");
const IGNORED_SCHEMES = [
  "http:",
  "https:",
  "mailto:",
  "tel:",
  "data:",
  "javascript:",
  "ftp:",
];

/** Recursively list every `.html` file under `dir`. */
async function findHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findHtmlFiles(full)));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

/** Extract raw `href` values from `<a>` elements in `html`. */
function extractAnchorHrefs(html) {
  const hrefs = [];
  const anchor = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of html.matchAll(anchor)) {
    hrefs.push(match[1] ?? match[2] ?? "");
  }
  return hrefs;
}

/** True when `href` points off-site or is not a navigable document link. */
function isIgnoredHref(href) {
  const trimmed = href.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("//")) return true;
  return IGNORED_SCHEMES.some((scheme) =>
    trimmed.toLowerCase().startsWith(scheme),
  );
}

/** Map a page file to the URL directory its relative links resolve against. */
function pageDirectory(htmlFile) {
  return path.posix.dirname(
    path.relative(DIST_DIR, htmlFile).split(path.sep).join("/"),
  );
}

async function isFile(candidate) {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
}

/** Resolve an internal URL path to a built file, if one exists. */
async function resolveTarget(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const normalized = path.posix.normalize(`/${decoded}`);
  const relative = normalized.replace(/^\/+/, "");
  const base = path.join(DIST_DIR, relative);
  const candidates = [base, `${base}.html`, path.join(base, "index.html")];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

async function main() {
  let distStat;
  try {
    distStat = await stat(DIST_DIR);
  } catch {
    console.error(`check-links: build directory not found: ${DIST_DIR}`);
    process.exit(1);
  }
  if (!distStat.isDirectory()) {
    console.error(`check-links: not a directory: ${DIST_DIR}`);
    process.exit(1);
  }

  const htmlFiles = await findHtmlFiles(DIST_DIR);
  const failures = [];
  let checked = 0;

  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, "utf8");
    const pageDir = pageDirectory(htmlFile);
    for (const href of extractAnchorHrefs(html)) {
      if (isIgnoredHref(href)) continue;

      const withoutFragment = href.split("#")[0].split("?")[0];
      if (withoutFragment === "") continue;

      let urlPath;
      if (withoutFragment.startsWith("/")) {
        urlPath = withoutFragment;
      } else {
        urlPath = path.posix.join(pageDir, withoutFragment);
      }

      checked += 1;
      if (!(await resolveTarget(urlPath))) {
        failures.push({
          page: path.relative(DIST_DIR, htmlFile),
          href,
          resolved: urlPath,
        });
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      `check-links: ${failures.length} broken internal link(s) in ${checked} checked`,
    );
    for (const failure of failures) {
      console.error(
        `  ${failure.page}: href="${failure.href}" -> ${failure.resolved}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `check-links: ${checked} internal links OK across ${htmlFiles.length} HTML files`,
  );
}

await main();
