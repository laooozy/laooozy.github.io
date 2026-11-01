import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { BlogListItem } from "@/lib/domain/posts";

import BlogEmptyView from "./BlogEmptyView";
import BlogFilters from "./BlogFilters";
import BlogList from "./BlogList";
import PostCardView from "./PostCardView";

const POST = {
  href: "/blog/2026-10-20_bootstrap-blog/",
  title: "創世文",
  description: "歡迎來到我的空間。",
  date: "2026-10-20",
  readingMinutes: 3,
  tags: ["隨筆"],
} satisfies BlogListItem;

const POSTS = Array.from({ length: 4 }, (_, index) => ({
  ...POST,
  href: `/blog/2026-10-2${index}_post-${index}/`,
  title: `文章 ${index + 1}`,
}));

describe("PostCardView", () => {
  it("defaults the card variant to h3 and honours headingLevel", () => {
    const card = renderToStaticMarkup(
      <PostCardView
        href={POST.href}
        title={POST.title}
        description={POST.description}
        dateLabel="2026年10月20日"
        datetime={POST.date}
        readLabel="閱讀文章"
      />,
    );
    const overridden = renderToStaticMarkup(
      <PostCardView
        href={POST.href}
        title={POST.title}
        description={POST.description}
        headingLevel={2}
        readLabel="閱讀文章"
      />,
    );

    expect(card).toContain("<h3");
    expect(card).not.toContain("<h2");
    expect(overridden).toContain("<h2");
    expect(overridden).not.toContain("<h3");
  });

  it("defaults the row variant to h2 and honours headingLevel", () => {
    const row = renderToStaticMarkup(
      <PostCardView
        href={POST.href}
        title={POST.title}
        description={POST.description}
        variant="row"
        readLabel="閱讀文章"
      />,
    );
    const overridden = renderToStaticMarkup(
      <PostCardView
        href={POST.href}
        title={POST.title}
        description={POST.description}
        variant="row"
        headingLevel={3}
        readLabel="閱讀文章"
      />,
    );

    expect(row).toContain("<h2");
    expect(row).not.toContain("<h3");
    expect(overridden).toContain("<h3");
    expect(overridden).not.toContain("<h2");
  });

  it("renders one labelled action linked to the title", () => {
    const html = renderToStaticMarkup(
      <PostCardView
        href={POST.href}
        title={POST.title}
        description={POST.description}
        dateLabel="2026年10月20日"
        datetime={POST.date}
        readLabel="閱讀文章"
      />,
    );

    expect(html).toContain("data-post-card");
    expect(html).toContain('data-variant="card"');
    expect(html).toContain('href="/blog/2026-10-20_bootstrap-blog/"');
    expect(html).toContain("閱讀文章");
    expect(html).toContain(
      'aria-describedby="post-title-2026-10-20_bootstrap-blog"',
    );
    expect(html).toContain("min-h-11");
  });

  it("renders tags as non-interactive badges", () => {
    const html = renderToStaticMarkup(
      <PostCardView
        href={POST.href}
        title={POST.title}
        description={POST.description}
        tags={POST.tags}
        readLabel="閱讀文章"
      />,
    );

    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("隨筆");
    expect(html).not.toContain('href="/blog/tags/');
  });
});

describe("BlogFilters", () => {
  it("renders the period filters and reset when there are no tags", () => {
    const html = renderToStaticMarkup(
      <BlogFilters
        tags={[]}
        periods={[
          {
            label: "2026",
            href: "/blog/archive/2026/",
            active: true,
          },
        ]}
      />,
    );

    expect(html).toContain("data-blog-filters");
    expect(html).toContain('data-blog-filter="period"');
    expect(html).toContain('href="/blog/archive/2026/"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("依時間");
    expect(html).not.toContain("依標籤");
    expect(html).toContain('data-blog-filter="all"');
    expect(html).toContain('href="/blog/"');
  });

  it("marks the reset when nothing is filtered", () => {
    const html = renderToStaticMarkup(
      <BlogFilters
        tags={[{ label: "隨筆", href: "/blog/tags/%E9%9A%A8%E7%AD%86/" }]}
        periods={[{ label: "2026", href: "/blog/archive/2026/" }]}
      />,
    );

    expect(html).toContain('data-blog-filter="all"');
    expect(html).toContain('data-blog-filter="tag"');
    expect(html).toContain('data-blog-filter="period"');
    expect(html.match(/aria-current="page"/gu)).toHaveLength(1);
    expect(html).toContain("所有文章");
  });
});

describe("BlogList", () => {
  it("renders the empty panel with the blog heading", () => {
    const html = renderToStaticMarkup(
      <BlogList posts={[]} heading={{ kind: "index" }} />,
    );

    expect(html).toContain("data-blog-empty");
    expect(html).toContain("這裡還沒有文章。");
    expect(html.match(/最新文章/gu)?.length).toBeGreaterThanOrEqual(1);
    expect(html).toContain("<h2");
  });

  it("renders pagination links and the localised status", () => {
    const html = renderToStaticMarkup(
      <BlogList
        posts={POSTS}
        heading={{ kind: "index" }}
        pagination={{
          currentPage: 2,
          lastPage: 3,
          url: { prev: "/blog/", next: "/blog/3/" },
        }}
      />,
    );

    expect(html).toContain("data-blog-pagination");
    expect(html).toContain('href="/blog/"');
    expect(html).toContain('href="/blog/3/"');
    expect(html).toContain("第 2 / 3 頁");
    expect(html).toContain("上一頁");
    expect(html).toContain("下一頁");
  });

  it("omits pagination on a single page", () => {
    const html = renderToStaticMarkup(
      <BlogList
        posts={POSTS}
        heading={{ kind: "index" }}
        pagination={{ currentPage: 1, lastPage: 1, url: {} }}
      />,
    );

    expect(html).not.toContain("data-blog-pagination");
  });

  it("renders row cards with h2 titles under the page h1", () => {
    const html = renderToStaticMarkup(
      <BlogList posts={[POST]} heading={{ kind: "index" }} />,
    );

    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain('data-variant="row"');
  });
});

describe("BlogEmptyView", () => {
  it("uses the supplied heading and one primary action", () => {
    const html = renderToStaticMarkup(
      <BlogEmptyView
        heading="最新文章"
        message="這裡還沒有文章。"
        homeLabel="回到首頁"
        secondaryLabel="攝影"
      />,
    );

    expect(html).toContain("data-blog-empty");
    expect(html).toContain("最新文章");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/photographer/"');
    expect(html.match(/min-h-11/gu)?.length).toBeGreaterThanOrEqual(2);
  });
});
