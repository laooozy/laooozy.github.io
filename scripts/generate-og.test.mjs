import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { BRAND, buildSvg, DOMAIN } from "./generate-og.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
);
const astroConfigSource = readFileSync(
  join(REPO_ROOT, "astro.config.mjs"),
  "utf8",
);
const siteMatch = /\bsite:\s*["'](https?:\/\/[^"']+)["']/.exec(
  astroConfigSource,
);

describe("generate-og derived constants", () => {
  it("reads the brand from package.json", () => {
    expect(BRAND).toBe(packageJson.name);
  });

  it("reads the domain from the astro.config site URL", () => {
    expect(siteMatch).not.toBeNull();
    expect(DOMAIN).toBe(new URL(siteMatch[1]).hostname);
  });
});

describe("buildSvg", () => {
  it("renders the wordmark in solid ink with an accent rule, never gradient text", () => {
    const svg = buildSvg();

    expect(svg).not.toContain('id="wordmark"');
    expect(svg).not.toContain("url(#wordmark)");
    expect(svg).toContain('fill="url(#accent)"');
    expect(svg).toMatch(
      new RegExp(`<text[^>]*fill="#[0-9a-fA-F]{6}"[^>]*>${BRAND}</text>`),
    );
  });

  it("uses injected brand and domain values", () => {
    const svg = buildSvg({ brand: "probe-brand", domain: "probe.test" });

    expect(svg).toContain(">probe-brand</text>");
    expect(svg).toContain(">probe.test</text>");
  });
});
