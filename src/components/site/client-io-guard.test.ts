/**
 * Architecture guard: hydrated React islands must not import `src/lib/io/**`.
 *
 * The IO edge reads the filesystem or Astro content at BUILD time. Importing it
 * from a client island would either bundle build-only data into the browser or
 * make the SSR/client render disagree (the footer's old `new Date()` year was
 * the same class of bug). Build-time values cross the boundary as serializable
 * props from an Astro wrapper; the three existing wrappers
 * (`blog/LatestPosts.astro`, `site/NowTicker.astro`,
 * `photography/InstagramWall.astro`) are the only allowed readers.
 *
 * This test is the executable form of the grep proof: it scans every shipped
 * `.tsx` island, collects ALL offenders, and fails once with their names.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = fileURLToPath(new URL("..", import.meta.url));
const SRC_DIR = fileURLToPath(new URL("../..", import.meta.url));

/** Import specifiers, static or dynamic, captured from the quoted module id. */
const IMPORT_SPECIFIER = /(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g;

/** Every shipped (non-test) component source file, recursively. */
function componentSources(): string[] {
  const files: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.name.endsWith(".tsx")) continue;
      if (entry.name.endsWith(".test.tsx")) continue;
      files.push(path);
    }
  };

  walk(COMPONENTS_DIR);
  return files;
}

/** True when an import specifier resolves into `src/lib/io/**`. */
function importsIoEdge(specifier: string): boolean {
  return /(?:^|\/)lib\/io(?:\/|$)/.test(specifier);
}

describe("client islands do not import the IO edge", () => {
  const sources = componentSources();

  it("finds the component tree to guard", () => {
    expect(sources.length).toBeGreaterThan(20);
  });

  it("no shipped .tsx island imports lib/io (alias or relative)", () => {
    const offenders: string[] = [];

    for (const path of sources) {
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(IMPORT_SPECIFIER)) {
        const specifier = match[1] ?? "";
        if (importsIoEdge(specifier)) {
          offenders.push(`${relative(SRC_DIR, path)} imports "${specifier}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the footer island never reads the clock", () => {
    const footer = join(COMPONENTS_DIR, "site/SiteFooter.tsx");
    expect(readFileSync(footer, "utf8")).not.toContain("new Date(");
  });
});
