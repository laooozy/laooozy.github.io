import { describe, expect, it } from "vitest";

import { parseLinksMarkdown } from "./links";

describe("parseLinksMarkdown", () => {
  it("reads the intro paragraphs and the bullet links", () => {
    const parsed = parseLinksMarkdown(
      [
        "一些我認為很酷的東西，快去看看吧！",
        "",
        "- [laooozy/laooozy.github.io](https://github.com/laooozy/laooozy.github.io) — 這個網站的源碼",
        "",
      ].join("\n"),
    );

    expect(parsed.intro).toEqual(["一些我認為很酷的東西，快去看看吧！"]);
    expect(parsed.links).toEqual([
      {
        label: "laooozy/laooozy.github.io",
        href: "https://github.com/laooozy/laooozy.github.io",
        note: "這個網站的源碼",
      },
    ]);
  });

  it("ignores the authoring template inside an HTML comment", () => {
    const parsed = parseLinksMarkdown(
      [
        "- [One](https://example.com/one)",
        "",
        "<!--",
        "- [顯示文字](https://example.com) — 一句簡短說明",
        "-->",
      ].join("\n"),
    );

    expect(parsed.links).toHaveLength(1);
    expect(parsed.links[0]?.label).toBe("One");
  });

  it("supports a bullet without a note and joins hard-wrapped intro lines", () => {
    const parsed = parseLinksMarkdown(
      [
        "A first line",
        "continued here.",
        "",
        "- [Two](http://example.com/two)",
      ].join("\n"),
    );

    expect(parsed.intro).toEqual(["A first line continued here."]);
    expect(parsed.links).toEqual([
      { label: "Two", href: "http://example.com/two" },
    ]);
  });

  it("keeps multiple paragraph blocks and links in document order", () => {
    const parsed = parseLinksMarkdown(
      [
        "First paragraph.",
        "",
        "Second paragraph.",
        "",
        "- [B](https://example.com/b) – en dash note",
        "- [A](https://example.com/a) - hyphen note",
      ].join("\n"),
    );

    expect(parsed.intro).toEqual(["First paragraph.", "Second paragraph."]);
    expect(parsed.links.map((link) => link.label)).toEqual(["B", "A"]);
    expect(parsed.links[0]?.note).toBe("en dash note");
    expect(parsed.links[1]?.note).toBe("hyphen note");
  });

  it("throws with the line number for a malformed bullet", () => {
    expect(() =>
      parseLinksMarkdown(
        ["intro", "", "- [Broken](https://example.com"].join("\n"),
      ),
    ).toThrow(/line 3/u);
  });

  it("rejects a non-absolute or non-http target", () => {
    expect(() => parseLinksMarkdown("- [X](/relative)")).toThrow(
      /line 1.*not absolute/u,
    );
    expect(() => parseLinksMarkdown("- [X](mailto:hi@example.com)")).toThrow(
      /line 1.*http\(s\)/u,
    );
  });

  it("returns empty results for an empty document", () => {
    expect(parseLinksMarkdown("")).toEqual({ intro: [], links: [] });
  });
});
