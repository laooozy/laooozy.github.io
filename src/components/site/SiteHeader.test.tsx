// @vitest-environment happy-dom
/**
 * Behaviour of the hydrated header: nav labels, the current-page marker, the
 * compact disclosure, and the hydration-safe locale swap. Every browser effect
 * goes through the injected DOM port, so the suite drives the seams rather
 * than the real document.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import { createFakeDeps } from "@/test/client-deps";

import SiteHeader from "./SiteHeader";

function renderHeader(
  options: Parameters<typeof createFakeDeps>[0] = {},
  currentPath = "/",
) {
  const fake = createFakeDeps(options);
  const view = render(
    <ClientDepsProvider deps={fake.deps}>
      <SiteHeader currentPath={currentPath} />
    </ClientDepsProvider>,
  );
  return { ...fake, ...view };
}

function detailsFor(summary: HTMLElement): HTMLDetailsElement {
  const details = summary.closest("details");
  if (details === null) throw new Error("summary is not inside a details");
  return details;
}

describe("SiteHeader nav", () => {
  it("renders the four nav items with their hrefs in both desktop and compact navs", () => {
    renderHeader();

    expect(screen.getAllByText("關於")).toHaveLength(2);
    expect(screen.getAllByText("聯絡")).toHaveLength(2);

    const blogLinks = screen.getAllByRole("link", { name: "文章" });
    expect(blogLinks).toHaveLength(2);
    expect(blogLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/blog/",
      "/blog/",
    ]);

    const usefulLinks = screen.getAllByRole("link", { name: "連結" });
    expect(usefulLinks[0]?.getAttribute("href")).toBe("/links/");
  });

  it("marks the blog listing and every post path as the current page", () => {
    const { unmount } = renderHeader({}, "/blog/tags/隨筆/");

    const blogLinks = screen.getAllByRole("link", { name: "文章" });
    expect(
      blogLinks.every((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    unmount();

    renderHeader({}, "/links/");
    const usefulLinks = screen.getAllByRole("link", { name: "連結" });
    expect(
      usefulLinks.every((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "文章" })
        .every((link) => link.getAttribute("aria-current") === null),
    ).toBe(true);
  });

  it("never marks a home anchor as current", () => {
    renderHeader({}, "/");

    for (const name of ["關於", "聯絡"]) {
      const links = screen.getAllByRole("link", { name });
      expect(
        links.every((link) => link.getAttribute("aria-current") === null),
      ).toBe(true);
    }
  });
});

describe("SiteHeader compact disclosure", () => {
  it("opens and closes, publishing the state to the store", () => {
    const { store, dom, container } = renderHeader();
    const summary = screen.getByLabelText("選單");
    const details = detailsFor(summary);

    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(store.getState().headerMenuOpen).toBe(false);
    expect(dom.keyDownListenerCount()).toBe(0);

    fireEvent.click(summary);

    expect(summary.getAttribute("aria-expanded")).toBe("true");
    expect(details.open).toBe(true);
    expect(store.getState().headerMenuOpen).toBe(true);

    fireEvent.keyDown(details, { key: "Escape" });

    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(details.open).toBe(false);
    expect(store.getState().headerMenuOpen).toBe(false);
    expect(container.ownerDocument.activeElement).toBe(summary);
  });

  it("closes on a same-page hash jump and on a route change", () => {
    const { store, dom, rerender, deps } = renderHeader();
    const summary = screen.getByLabelText("選單");
    const details = detailsFor(summary);

    fireEvent.click(summary);
    expect(details.open).toBe(true);
    expect(dom.hashChangeListenerCount()).toBe(1);

    act(() => dom.emitHashChange("#about"));
    expect(details.open).toBe(false);
    expect(store.getState().headerMenuOpen).toBe(false);

    fireEvent.click(summary);
    expect(details.open).toBe(true);
    rerender(
      <ClientDepsProvider deps={deps}>
        <SiteHeader currentPath="/blog/" />
      </ClientDepsProvider>,
    );
    expect(details.open).toBe(false);
  });

  it("closes rather than leaving the panel open when the bar is hidden", () => {
    const { store } = renderHeader();
    const summary = screen.getByLabelText("選單");

    fireEvent.click(summary);
    expect(summary.getAttribute("aria-expanded")).toBe("true");

    act(() => store.getState().setHeaderHidden(true));

    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(store.getState().headerMenuOpen).toBe(false);
  });
});

describe("SiteHeader controls", () => {
  it("keeps the focus-visible and coarse-pointer touch classes on every control", () => {
    renderHeader();

    const summary = screen.getByLabelText("選單");
    expect(summary.className).toContain("size-11");
    expect(summary.className).toContain("focus-visible:outline-2");

    const desktopBlog = screen.getAllByRole("link", { name: "文章" })[0];
    expect(desktopBlog?.className).toContain("pointer-coarse:min-h-11");
    expect(desktopBlog?.className).toContain("focus-visible:outline-2");

    const panelBlog = screen.getAllByRole("link", { name: "文章" })[1];
    expect(panelBlog?.className).toContain("min-h-11");
    expect(panelBlog?.className).toContain("focus-visible:outline-2");
  });

  it("opens the search palette through the store, not a local overlay", () => {
    const { store } = renderHeader();
    const trigger = screen.getByRole("button", { name: /搜尋/ });

    fireEvent.click(trigger);

    expect(store.getState().search.open).toBe(true);
  });

  it("adopts the injected locale after mount", () => {
    renderHeader({ locale: "en" });

    expect(screen.getAllByRole("link", { name: "Blog" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Search/ })).not.toBeNull();
    expect(screen.queryAllByText("關於")).toHaveLength(0);
  });
});
