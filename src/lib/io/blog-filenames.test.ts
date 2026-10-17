/**
 * Content guard: every file in `src/content/blog/` MUST follow the locked
 * filename convention `yyyy-mm-dd_<slug>.md`, and the date embedded in the
 * filename MUST equal the post's frontmatter `date:`.
 *
 * This is the I/O edge, so `node:fs` is allowed here (the pure validator in
 * `../domain/filename.ts` stays free of it). The test collects ALL offenders and
 * fails once with a single message listing each offending file and why, rather
 * than stopping at the first problem.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePostFilename } from "../domain/filename";

/** Absolute path to the blog content directory, relative to this test file. */
const BLOG_DIR = fileURLToPath(new URL("../../content/blog/", import.meta.url));

/** Every Markdown file currently in the blog collection directory. */
function blogFilenames(): string[] {
  return readdirSync(BLOG_DIR).filter((name) => name.endsWith(".md"));
}

/**
 * Read the frontmatter `date:` value and normalize it to `YYYY-MM-DD`.
 * Returns `null` when no readable date is found.
 */
function frontmatterDate(source: string): string | null {
  const match = source.match(/^date:\s*(.+?)\s*$/m);
  if (!match) return null;
  const token = match[1].split(/[T ]/)[0];
  const parts = token.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

describe("blog filename convention", () => {
  const files = blogFilenames();

  it("finds posts to guard", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every post is yyyy-mm-dd_<slug>.md with a matching frontmatter date", () => {
    const offenders: string[] = [];

    for (const name of files) {
      const check = parsePostFilename(name);
      if (!check.ok) {
        offenders.push(`${name}: ${check.reason}`);
        continue;
      }

      const source = readFileSync(path.join(BLOG_DIR, name), "utf8");
      const date = frontmatterDate(source);
      if (date === null) {
        offenders.push(
          `${name}: frontmatter is missing a readable "date:" field`,
        );
        continue;
      }
      if (date !== check.date) {
        offenders.push(
          `${name}: frontmatter date ${date} does not match filename date ${check.date}`,
        );
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
