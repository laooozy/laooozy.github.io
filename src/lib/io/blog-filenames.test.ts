/**
 * Content guard: every file in `src/content/blog/` MUST follow the locked
 * filename convention `yyyy-mm-dd_<slug>.md`. The date now comes from the
 * filename (`post.id`), so there is no frontmatter `date:` to cross-check.
 *
 * This is the I/O edge, so `node:fs` is allowed here (the pure validator in
 * `../domain/filename.ts` stays free of it). The test collects ALL offenders and
 * fails once with a single message listing each offending file and why, rather
 * than stopping at the first problem.
 */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePostFilename } from "../domain/filename";

/** Absolute path to the blog content directory, relative to this test file. */
const BLOG_DIR = fileURLToPath(new URL("../../content/blog/", import.meta.url));

/** Every Markdown file currently in the blog collection directory. */
function blogFilenames(): string[] {
  return readdirSync(BLOG_DIR).filter((name) => name.endsWith(".md"));
}

describe("blog filename convention", () => {
  const files = blogFilenames();

  it("finds posts to guard", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every post is named yyyy-mm-dd_<slug>.md", () => {
    const offenders: string[] = [];

    for (const name of files) {
      const check = parsePostFilename(name);
      if (!check.ok) {
        offenders.push(`${name}: ${check.reason}`);
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `Blog filename guard failed (${offenders.length} offending file(s)):\n` +
          offenders.map((line) => `  - ${line}`).join("\n"),
      );
    }

    expect(offenders).toEqual([]);
  });
});
