/**
 * Unit tests for the pure blog filename convention - no I/O, no DOM, no regex
 * in the assertions' subject. Every case drives `parsePostFilename` directly.
 */
import { describe, expect, it } from "vitest";
import { parsePostFilename } from "./filename";

/** A valid filename for `date` split into parts, with the given slug. */
function nameOf(
  year: number,
  month: number,
  day: number,
  slug: string,
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}_${slug}.md`;
}

describe("parsePostFilename - valid", () => {
  it("parses a basic filename into its date and slug", () => {
    expect(parsePostFilename("2026-07-09_reasoning-one-book.md")).toEqual({
      ok: true,
      date: "2026-07-09",
      slug: "reasoning-one-book",
    });
  });

  it("accepts a slug that contains digits", () => {
    expect(parsePostFilename("2026-07-09_top-10.md")).toEqual({
      ok: true,
      date: "2026-07-09",
      slug: "top-10",
    });
  });

  it("accepts a slug that is a single letter plus digits", () => {
    expect(parsePostFilename("2026-07-09_v2.md")).toEqual({
      ok: true,
      date: "2026-07-09",
      slug: "v2",
    });
  });

  it("accepts 2024-02-29 (a real leap day)", () => {
    expect(parsePostFilename(nameOf(2024, 2, 29, "leap"))).toEqual({
      ok: true,
      date: "2024-02-29",
      slug: "leap",
    });
  });

  it("accepts 2000-02-29 (a real leap day)", () => {
    expect(parsePostFilename(nameOf(2000, 2, 29, "leap"))).toEqual({
      ok: true,
      date: "2000-02-29",
      slug: "leap",
    });
  });
});

describe("parsePostFilename - extension", () => {
  it("rejects a file that does not end in .md", () => {
    const result = parsePostFilename("2026-07-09_reasoning-one-book.txt");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain(".md");
  });

  it("rejects a file with no extension at all", () => {
    expect(parsePostFilename("2026-07-09_reasoning-one-book").ok).toBe(false);
  });
});

describe("parsePostFilename - separators", () => {
  it("rejects a slash where the first hyphen should be", () => {
    expect(parsePostFilename("2026/07/09_reasoning-one-book.md").ok).toBe(
      false,
    );
  });

  it("rejects an underscore where the second hyphen should be", () => {
    expect(parsePostFilename("2026-07_09_reasoning-one-book.md").ok).toBe(
      false,
    );
  });

  it("rejects a hyphen where the underscore should be", () => {
    expect(parsePostFilename("2026-07-09-reasoning-one-book.md").ok).toBe(
      false,
    );
  });

  it("rejects a compact date with no separators", () => {
    expect(parsePostFilename("20260709_reasoning-one-book.md").ok).toBe(false);
  });
});

describe("parsePostFilename - calendar", () => {
  it("rejects 2026-02-29 (2026 is not a leap year)", () => {
    const result = parsePostFilename(nameOf(2026, 2, 29, "bad"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("real calendar date");
  });

  it("rejects 1900-02-29 (1900 is not a leap year)", () => {
    expect(parsePostFilename(nameOf(1900, 2, 29, "bad")).ok).toBe(false);
  });

  it("rejects 2026-04-31 (April has 30 days)", () => {
    expect(parsePostFilename(nameOf(2026, 4, 31, "bad")).ok).toBe(false);
  });

  it("rejects month 00", () => {
    expect(parsePostFilename("2026-00-09_reasoning-one-book.md").ok).toBe(
      false,
    );
  });

  it("rejects month 13", () => {
    expect(parsePostFilename("2026-13-09_reasoning-one-book.md").ok).toBe(
      false,
    );
  });

  it("rejects day 00", () => {
    expect(parsePostFilename("2026-07-00_reasoning-one-book.md").ok).toBe(
      false,
    );
  });

  it("rejects day 32", () => {
    expect(parsePostFilename("2026-07-32_reasoning-one-book.md").ok).toBe(
      false,
    );
  });

  it("rejects a non-numeric month", () => {
    expect(parsePostFilename("2026-ab-09_reasoning-one-book.md").ok).toBe(
      false,
    );
  });

  it("rejects a year far outside 1000..2999", () => {
    expect(parsePostFilename("0000-07-09_reasoning-one-book.md").ok).toBe(
      false,
    );
  });
});

describe("parsePostFilename - slug", () => {
  it("rejects an uppercase slug", () => {
    expect(parsePostFilename("2026-07-09_Reasoning.md").ok).toBe(false);
  });

  it("rejects a slug with an internal underscore", () => {
    expect(parsePostFilename("2026-07-09_reasoning_one.md").ok).toBe(false);
  });

  it("rejects a slug with a slash", () => {
    expect(parsePostFilename("2026-07-09_reasoning/one.md").ok).toBe(false);
  });

  it("rejects a slug with a space", () => {
    expect(parsePostFilename("2026-07-09_reasoning one.md").ok).toBe(false);
  });

  it("rejects a leading hyphen in the slug", () => {
    expect(parsePostFilename("2026-07-09_-reasoning.md").ok).toBe(false);
  });

  it("rejects a trailing hyphen in the slug", () => {
    expect(parsePostFilename("2026-07-09_reasoning-.md").ok).toBe(false);
  });

  it("rejects a double hyphen in the slug", () => {
    expect(parsePostFilename("2026-07-09_reasoning--one.md").ok).toBe(false);
  });

  it("accepts a single-character slug", () => {
    expect(parsePostFilename("2026-07-09_a.md")).toEqual({
      ok: true,
      date: "2026-07-09",
      slug: "a",
    });
  });
});
