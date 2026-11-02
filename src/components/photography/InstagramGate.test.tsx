// @vitest-environment happy-dom
/**
 * Consent-gate integration contract.
 *
 * The server markup under test mirrors `InstagramWall.astro`: provider HTML
 * lives only inside an inert `<template>`, the live target starts empty, and
 * the at-rest index is a sibling. The gate must materialise the template only
 * after consent, clear it on failure and materialise a fresh copy on retry.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DomPort } from "@/adapters/dom";
import { createLocaleAdapter } from "@/adapters/dom/locale";
import { createScriptsAdapter } from "@/adapters/dom/scripts";
import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import { createFakeDeps, createFakeDom } from "@/test/client-deps";

import InstagramGate from "./InstagramGate";

const TEMPLATE = "template[data-ig-template]";
const TARGET = "[data-ig-embeds]";
const INDEX = "[data-ig-gate]";
const SCRIPT_SRC = "https://www.instagram.com/embed.js";

function makeDom(loadScript: DomPort["loadScript"]) {
  return createFakeDom({
    ...createLocaleAdapter(),
    ...createScriptsAdapter(),
    loadScript,
  });
}

/** Append the server-equivalent wall markup to the RTL container. */
function installMarkup(container: HTMLElement) {
  const doc = container.ownerDocument;
  const wall = doc.createElement("div");
  wall.setAttribute("data-ig-wall", "");
  wall.innerHTML = `
    <template data-ig-template data-pagefind-ignore>
      <figure class="ig-embed">
        <img src="https://scontent.cdninstagram.com/fixture.jpg" alt="" />
        <blockquote class="instagram-media"><a href="https://www.instagram.com/p/x/">post</a></blockquote>
      </figure>
      <a class="ig-fallback" href="https://www.instagram.com/p/y/">fallback</a>
    </template>
    <div data-ig-embeds data-pagefind-ignore hidden></div>
    <ol data-ig-gate><li><a href="https://www.instagram.com/p/x/">card</a></li></ol>`;
  container.appendChild(wall);

  return {
    wall,
    template: wall.querySelector(TEMPLATE) as HTMLTemplateElement,
    target: wall.querySelector(TARGET) as HTMLElement,
    index: wall.querySelector(INDEX) as HTMLElement,
  };
}

function renderGate(loadScript: DomPort["loadScript"]) {
  const fake = createFakeDeps({ dom: makeDom(loadScript) });
  const view = render(
    <ClientDepsProvider deps={fake.deps}>
      <InstagramGate
        scriptSrc={SCRIPT_SRC}
        profileHref="https://instagram.com/acg.laoozy"
        handle="@acg.laoozy"
        postCount={1}
      />
    </ClientDepsProvider>,
  );
  return { ...fake, ...view, ...installMarkup(view.container) };
}

function consentButton() {
  return screen.getByRole("button", { name: "載入 Instagram 貼文" });
}

describe("InstagramGate consent boundary", () => {
  it("keeps provider media inert and requests nothing before consent", () => {
    const loadScript = vi.fn<DomPort["loadScript"]>(
      () => new Promise(() => {}),
    );

    const { wall, template, target } = renderGate(loadScript);

    expect(target.childElementCount).toBe(0);
    expect(target.hasAttribute("hidden")).toBe(true);
    expect(
      wall.querySelectorAll(
        "[data-ig-wall] img, [data-ig-wall] iframe, [data-ig-wall] script",
      ),
    ).toHaveLength(0);
    expect(template.content.querySelectorAll("figure, img")).not.toHaveLength(
      0,
    );
    expect(loadScript).not.toHaveBeenCalled();
    expect((consentButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("materialises the template, loads the script and retires the index", async () => {
    const loadScript = vi.fn<DomPort["loadScript"]>(async () => true);
    const { template, target, index } = renderGate(loadScript);

    fireEvent.click(consentButton());

    await screen.findByText("已載入 Instagram 貼文。");

    expect(target.querySelectorAll("figure img")).toHaveLength(1);
    expect(target.querySelectorAll("blockquote.instagram-media")).toHaveLength(
      1,
    );
    expect(target.hasAttribute("hidden")).toBe(false);
    expect(index.hasAttribute("hidden")).toBe(true);
    expect(template.content.querySelectorAll("figure")).toHaveLength(1);
    expect(loadScript).toHaveBeenCalledTimes(1);
    expect(loadScript).toHaveBeenCalledWith(
      SCRIPT_SRC,
      expect.objectContaining({ id: "instagram-embed" }),
    );
  });

  it("clears the live layer, keeps the index and re-enables retry on failure", async () => {
    const loadScript = vi.fn<DomPort["loadScript"]>(async () => false);
    const { template, target, index } = renderGate(loadScript);

    fireEvent.click(consentButton());

    await screen.findByText("無法載入 Instagram 貼文");

    expect(target.childElementCount).toBe(0);
    expect(target.hasAttribute("hidden")).toBe(true);
    expect(index.hasAttribute("hidden")).toBe(false);
    expect(
      (screen.getByRole("button", { name: "再試一次" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(template.content.querySelectorAll("figure")).toHaveLength(1);
  });

  it("materialises a fresh copy from the still-inert template on retry", async () => {
    const loadScript = vi
      .fn<DomPort["loadScript"]>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const { target } = renderGate(loadScript);

    fireEvent.click(consentButton());

    await screen.findByText("無法載入 Instagram 貼文");
    expect(target.childElementCount).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "再試一次" }));

    await screen.findByText("已載入 Instagram 貼文。");
    expect(target.querySelectorAll("blockquote.instagram-media")).toHaveLength(
      1,
    );
    expect(loadScript).toHaveBeenCalledTimes(2);
  });
});
