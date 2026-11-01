// @vitest-environment happy-dom
/**
 * Behaviour of the article chrome island: the back action, the date/reading
 * rail, the tag links and the locale switch. The Markdown body is Astro-rendered
 * elsewhere, so this suite owns only the header contract.
 */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import { createFakeDeps } from "@/test/client-deps";

import PostHeader from "./PostHeader";

const TITLE = "深夜裡的觀察筆記";

function renderPost(
  props: Partial<Parameters<typeof PostHeader>[0]> = {},
  locale: "zh-hant" | "en" = "zh-hant",
) {
  const fake = createFakeDeps({ locale });
  const view = render(
    <ClientDepsProvider deps={fake.deps}>
      <PostHeader
        title={TITLE}
        date="2026-07-09"
        tags={["隨筆", "遊戲"]}
        readingMinutes={5}
        {...props}
      />
    </ClientDepsProvider>,
  );
  return { ...fake, ...view };
}

describe("PostHeader", () => {
  it("links back to the blog index", () => {
    renderPost();

    const back = screen.getByRole("link", { name: "回到文章列表" });
    expect(back.getAttribute("href")).toBe("/blog/");
  });

  it("renders the calendar date and reading time", () => {
    const { container } = renderPost();

    const time = container.querySelector("time");
    expect(time?.getAttribute("datetime")).toBe("2026-07-09");
    expect(time?.textContent).toBe("2026年7月9日");
    expect(screen.getByText("約 5 分鐘閱讀")).not.toBeNull();
  });

  it("omits the reading time when none is supplied", () => {
    renderPost({ readingMinutes: undefined });

    expect(screen.queryByText(/分鐘閱讀/)).toBeNull();
  });

  it("links every tag to its encoded tag archive", () => {
    renderPost();

    const tags = screen.getAllByRole("link");
    const tagLinks = tags.filter((link) =>
      link.getAttribute("href")?.startsWith("/blog/tags/"),
    );

    expect(tagLinks.map((link) => link.textContent)).toEqual(["隨筆", "遊戲"]);
    expect(tagLinks[0]?.getAttribute("href")).toBe(
      `/blog/tags/${encodeURIComponent("隨筆")}/`,
    );
  });

  it("uses a level-one heading and marks the title as Chinese content", () => {
    renderPost();

    const heading = screen.getByRole("heading", { level: 1, name: TITLE });
    expect(heading.getAttribute("lang")).toBe("zh-Hant");
  });

  it("switches the chrome to the store locale while the title stays Chinese", () => {
    const { store } = renderPost();

    act(() => store.getState().setLocale("en"));

    expect(screen.getByText("July 9, 2026")).not.toBeNull();
    expect(screen.getByText("5 min read")).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Back to all posts" }),
    ).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "Tags" })).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: TITLE }),
    ).not.toBeNull();
  });
});
