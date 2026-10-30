/**
 * Content guard: every post's frontmatter MUST be valid YAML. `astro:content`
 * parses frontmatter through `yaml` at build time, so a syntax slip (such as an
 * unindented block scalar) otherwise surfaces as an opaque build failure. This
 * test collects ALL offenders and fails once, naming each file and the parser's
 * reason.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const BLOG_DIR = fileURLToPath(new URL("../../content/blog/", import.meta.url));
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function blogFilenames(): string[] {
  return readdirSync(BLOG_DIR, { recursive: true, encoding: "utf8" }).filter(
    (name) => name.endsWith(".md"),
  );
}

describe("blog frontmatter is valid YAML", () => {
  const files = blogFilenames();

  it("finds posts to guard", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every post frontmatter parses", () => {
    const offenders: string[] = [];

    for (const name of files) {
      const source = readFileSync(resolve(BLOG_DIR, name), "utf8");
      const match = source.match(FRONTMATTER);
      if (!match) {
        offenders.push(`${name}: missing --- frontmatter block`);
        continue;
      }

      try {
        parseYaml(match[1]);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        offenders.push(`${name}: ${reason}`);
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `Blog frontmatter guard failed (${offenders.length} offending file(s)):\n` +
          offenders.map((line) => `  - ${line}`).join("\n"),
      );
    }

    expect(offenders).toEqual([]);
  });
});
