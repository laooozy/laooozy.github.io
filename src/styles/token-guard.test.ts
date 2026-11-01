import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const TOKENS_CSS_URL = new URL("./tokens.css", import.meta.url);
const GLOBAL_CSS_URL = new URL("./global.css", import.meta.url);

interface Declaration {
  value: string;
  index: number;
}

function readCss(url: URL): string {
  return readFileSync(url, "utf8");
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function declarations(css: string, property: string): Declaration[] {
  const pattern = new RegExp(`--${property}\\s*:\\s*([^;]+);`, "g");
  return [...stripComments(css).matchAll(pattern)].map((match) => ({
    value: (match[1] ?? "").trim().replace(/\s+/g, " "),
    index: match.index ?? 0,
  }));
}

const tokensCss = readCss(TOKENS_CSS_URL);
const globalCss = readCss(GLOBAL_CSS_URL);

const OWNER_VALUES = {
  "radius-md": "10px",
  "text-base": "1rem",
} as const;

describe("token owner guard", () => {
  it("keeps --bg-base in tokens.css for the build-time theme-color read", () => {
    expect(declarations(tokensCss, "bg-base")).toHaveLength(1);
  });

  it.each(Object.entries(OWNER_VALUES))(
    "declares --%s once, in tokens.css, with the intended value",
    (property, expected) => {
      expect(declarations(tokensCss, property)).toEqual([
        { value: expected, index: expect.any(Number) },
      ]);
      expect(declarations(globalCss, property)).toHaveLength(0);
    },
  );

  it.each(Object.entries(OWNER_VALUES))(
    "has no later declaration that shadows --%s",
    (property, expected) => {
      const cascade = [
        ...declarations(tokensCss, property),
        ...declarations(globalCss, property),
      ];

      expect(cascade[0]?.value).toBe(expected);
      expect(cascade.slice(1)).toEqual([]);
    },
  );
});
