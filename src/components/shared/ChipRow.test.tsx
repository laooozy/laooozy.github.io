import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChipRow from "./ChipRow";

describe("ChipRow", () => {
  it("renders a tag as a non-interactive span", () => {
    const html = renderToStaticMarkup(
      <ChipRow items={[{ label: "Hades" }, { label: "Muse Dash" }]} />,
    );

    expect(html).toContain("<span");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("aria-pressed");
  });

  it("renders a tag with an href as a quiet link", () => {
    const html = renderToStaticMarkup(
      <ChipRow items={[{ label: "隨筆", href: "/blog/tag/隨筆" }]} />,
    );

    expect(html).toContain('<a href="/blog/tag/隨筆"');
    expect(html).not.toContain("<button");
  });

  it("renders a filter link with aria-current only when active", () => {
    const inactive = renderToStaticMarkup(
      <ChipRow
        variant="filter"
        items={[{ label: "2026", href: "/blog/2026/" }]}
      />,
    );
    const active = renderToStaticMarkup(
      <ChipRow
        variant="filter"
        items={[{ label: "2026", href: "/blog/2026/", active: true }]}
      />,
    );

    expect(inactive).toContain("<a ");
    expect(inactive).not.toContain("aria-current");
    expect(active).toContain('aria-current="page"');
  });

  it("renders a filter button with aria-pressed true and false", () => {
    const on = renderToStaticMarkup(
      <ChipRow variant="filter" items={[{ label: "全部", active: true }]} />,
    );
    const off = renderToStaticMarkup(
      <ChipRow variant="filter" items={[{ label: "全部" }]} />,
    );

    expect(on).toContain("<button");
    expect(on).toContain('type="button"');
    expect(on).toContain('aria-pressed="true"');
    expect(off).toContain('aria-pressed="false"');
  });

  it("renders nothing for an empty item list", () => {
    expect(renderToStaticMarkup(<ChipRow items={[]} />)).toBe("");
  });

  it("distinguishes active from inactive control classes", () => {
    const active = renderToStaticMarkup(
      <ChipRow variant="filter" items={[{ label: "全部", active: true }]} />,
    );
    const inactive = renderToStaticMarkup(
      <ChipRow variant="filter" items={[{ label: "全部" }]} />,
    );

    expect(active).toContain("bg-primary");
    expect(inactive).toContain("border-border");
    expect(active).not.toBe(inactive);
  });

  it("exposes the coarse-pointer touch floor on filter controls", () => {
    const html = renderToStaticMarkup(
      <ChipRow
        variant="filter"
        items={[{ label: "2026", href: "/blog/2026/", active: true }]}
      />,
    );

    expect(html).toContain("pointer-coarse:min-h-11");
    expect(html).toContain("pointer-coarse:min-w-11");
  });
});
