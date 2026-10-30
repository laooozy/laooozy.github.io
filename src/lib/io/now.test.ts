import { describe, expect, it } from "vitest";

import rawNow from "../../data/now.json";
import { parseNowItems } from "../domain/now";

describe("now.json schema", () => {
  it("accepts the shipped seed and preserves the owner's copy", () => {
    const items = parseNowItems(rawNow);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ text: "讀書，練跑，拍照。" });
  });

  it("accepts multiple items and optional links", () => {
    const items = parseNowItems([
      { text: "one" },
      { text: "two", href: "/blog/" },
    ]);

    expect(items).toEqual([{ text: "one" }, { text: "two", href: "/blog/" }]);
  });

  it("accepts an empty array (the ticker then hides)", () => {
    expect(parseNowItems([])).toEqual([]);
  });

  it("names a missing field in the error", () => {
    expect(() => parseNowItems([{ href: "/blog/" }])).toThrow("0.text");
  });

  it("names a malformed field in the error", () => {
    expect(() => parseNowItems([{ text: "one", href: 42 }])).toThrow("0.href");
  });

  it("names an empty text value in the error", () => {
    expect(() => parseNowItems([{ text: "" }])).toThrow("0.text");
  });

  it("rejects a non-array root", () => {
    expect(() => parseNowItems({ text: "one" })).toThrow("(root)");
  });

  it("rejects unknown fields", () => {
    expect(() => parseNowItems([{ text: "one", when: "today" }])).toThrow(
      "when",
    );
  });
});
