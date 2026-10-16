/**
 * Unit tests for the pure post domain — no DOM, no `astro:content`, no I/O.
 *
 * Fixtures are plain objects structurally identical to a `blog` collection
 * entry, built with `new Date(y, m, d)` (local construction + local getters)
 * so assertions stay deterministic regardless of the runner's timezone.
 */
import { describe, expect, it } from "vitest";
import {
  LOCALES,
  PAGE_SIZE,
  blogArchivePath,
  blogIndexPath,
  blogPostPath,
  blogTagPath,
  collectPeriods,
  collectTags,
  estimateReadingTime,
  formatPeriodLabel,
  formatPostDate,
  matchesPeriod,
} from "./posts";
import type { Post, PostData } from "./posts";

/** Minimal fake post; override only the `data` fields a test cares about. */
function makePost(overrides: Partial<PostData> = {}, id = "post"): Post {
  return {
    id,
    collection: "blog",
    data: {
      title: "Title",
      description: "Description",
      date: new Date(2026, 0, 1),
      tags: [],
      draft: false,
      translationKey: "key",
      ...overrides,
    },
  };
}

describe("constants", () => {
  it("paginates 4 posts per page", () => {
    expect(PAGE_SIZE).toBe(4);
  });

  it("lists the three locales in declaration order", () => {
    expect(LOCALES).toEqual(["zh-hant", "zh-hans", "en"]);
  });
});

describe("collectTags", () => {
  it("dedupes across posts and sorts", () => {
    const posts = [
      makePost({ tags: ["b", "a", "b"] }, "a"),
      makePost({ tags: ["c", "a"] }, "b"),
    ];
    expect(collectTags(posts)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for an empty post set", () => {
    expect(collectTags([])).toEqual([]);
  });

  it("returns an empty array when no post has tags", () => {
    expect(collectTags([makePost(), makePost()])).toEqual([]);
  });
});

describe("collectPeriods", () => {
  it("emits newest-first months, then newest-first years", () => {
    const dates = [
      new Date(2026, 1, 14), // 2026-02
      new Date(2026, 0, 5), // 2026-01
      new Date(2025, 11, 1), // 2025-12
      new Date(2026, 0, 20), // 2026-01 (duplicate month)
    ];
    const posts = dates.map((date, i) => makePost({ date }, `p${i}`));

    expect(collectPeriods(posts)).toEqual([
      "2026-02",
      "2026-01",
      "2025-12",
      "2026",
      "2025",
    ]);
  });

  it("dedupes identical month and year keys", () => {
    const posts = [
      makePost({ date: new Date(2026, 5, 1) }, "a"),
      makePost({ date: new Date(2026, 5, 30) }, "b"),
    ];
    expect(collectPeriods(posts)).toEqual(["2026-06", "2026"]);
  });

  it("returns an empty array for an empty post set", () => {
    expect(collectPeriods([])).toEqual([]);
  });
});

describe("matchesPeriod", () => {
  const post = makePost({ date: new Date(2026, 1, 14) }); // February 2026

  it("matches a YYYY period by year", () => {
    expect(matchesPeriod(post, "2026")).toBe(true);
  });

  it("matches a YYYY-MM period by zero-padded month", () => {
    expect(matchesPeriod(post, "2026-02")).toBe(true);
  });

  it("rejects a different year and a different month", () => {
    expect(matchesPeriod(post, "2025")).toBe(false);
    expect(matchesPeriod(post, "2026-01")).toBe(false);
  });

  it("zero-pads single-digit months", () => {
    const january = makePost({ date: new Date(2026, 0, 9) });
    expect(matchesPeriod(january, "2026-01")).toBe(true);
    expect(matchesPeriod(january, "2026-1")).toBe(false);
  });
});

describe("estimateReadingTime", () => {
  const cjk = (n: number) => "字".repeat(n);
  const latin = (n: number) => "word ".repeat(n);

  it("returns the 1-minute floor for a missing or empty body", () => {
    expect(estimateReadingTime(undefined)).toBe(1);
    expect(estimateReadingTime("")).toBe(1);
    expect(estimateReadingTime("   ")).toBe(1);
  });

  it("counts CJK glyphs at ~400/min", () => {
    expect(estimateReadingTime(cjk(400))).toBe(1);
    expect(estimateReadingTime(cjk(401))).toBe(2);
  });

  it("counts Latin words at ~200/min", () => {
    expect(estimateReadingTime(latin(200))).toBe(1);
    expect(estimateReadingTime(latin(201))).toBe(2);
  });

  it("sums the CJK and Latin budgets for mixed prose", () => {
    expect(estimateReadingTime(`${cjk(400)} ${latin(200)}`)).toBe(2);
    // 1 CJK glyph + 200 Latin words -> ceil(0.0025 + 1) = 2
    expect(estimateReadingTime(`字 ${latin(200)}`)).toBe(2);
  });
});

describe("formatPostDate", () => {
  const date = new Date(2026, 1, 5); // February 5, 2026

  it("formats English as `Month D, YYYY`", () => {
    expect(formatPostDate(date, "en")).toBe("February 5, 2026");
  });

  it("formats Chinese as `YYYY年M月D日` (no zero padding)", () => {
    expect(formatPostDate(date, "zh-hant")).toBe("2026年2月5日");
    expect(formatPostDate(date, "zh-hans")).toBe("2026年2月5日");
  });
});

describe("formatPeriodLabel", () => {
  it("formats a year period per locale", () => {
    expect(formatPeriodLabel("2026", "en")).toBe("2026");
    expect(formatPeriodLabel("2026", "zh-hant")).toBe("2026年");
    expect(formatPeriodLabel("2026", "zh-hans")).toBe("2026年");
  });

  it("formats a month period per locale", () => {
    expect(formatPeriodLabel("2026-02", "en")).toBe("February 2026");
    expect(formatPeriodLabel("2026-02", "zh-hant")).toBe("2026年2月");
    expect(formatPeriodLabel("2026-12", "en")).toBe("December 2026");
    expect(formatPeriodLabel("2026-12", "zh-hans")).toBe("2026年12月");
  });
});

describe("path builders", () => {
  it("builds the blog index path", () => {
    expect(blogIndexPath()).toBe("/blog/");
  });

  it("builds a tag path", () => {
    expect(blogTagPath("x")).toBe("/blog/tags/x/");
  });

  it("percent-encodes tag segments", () => {
    expect(blogTagPath("hello world")).toBe("/blog/tags/hello%20world/");
    expect(blogTagPath("隨筆")).toBe(
      `/blog/tags/${encodeURIComponent("隨筆")}/`,
    );
  });

  it("builds an archive path for year and month periods", () => {
    expect(blogArchivePath("2026")).toBe("/blog/archive/2026/");
    expect(blogArchivePath("2026-02")).toBe("/blog/archive/2026-02/");
  });

  it("builds a post path", () => {
    expect(blogPostPath("s")).toBe("/blog/s/");
    expect(blogPostPath("my-post")).toBe("/blog/my-post/");
  });
});
