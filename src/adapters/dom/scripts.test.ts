// @vitest-environment happy-dom
/**
 * Consent-boundary contract for the scripts slice.
 *
 * The provider HTML is authored inside a `<template>` at build time. Template
 * content is inert: it is a DocumentFragment outside the document tree, so no
 * image is fetched and no element is queryable as live markup. Only an explicit
 * materialisation clones it into the live embed target.
 */
import { afterEach, describe, expect, it } from "vitest";

import { createScriptsAdapter } from "./scripts";

const TEMPLATE = "template[data-ig-template]";
const TARGET = "[data-ig-embeds]";

afterEach(() => {
  document.body.innerHTML = "";
});

function installMarkup() {
  document.body.innerHTML = `
    <div data-ig-wall>
      <template data-ig-template data-pagefind-ignore>
        <figure class="ig-embed">
          <img src="https://scontent.cdninstagram.com/fixture.jpg" alt="" />
          <blockquote class="instagram-media"><a href="https://www.instagram.com/p/x/">post</a></blockquote>
        </figure>
        <a class="ig-fallback" href="https://www.instagram.com/p/y/">fallback</a>
      </template>
      <div data-ig-embeds data-pagefind-ignore hidden></div>
    </div>`;

  return {
    template: document.querySelector(TEMPLATE) as HTMLTemplateElement,
    target: document.querySelector(TARGET) as HTMLElement,
  };
}

describe("createScriptsAdapter template seam", () => {
  it("keeps provider media inert until the target is materialised", () => {
    const port = createScriptsAdapter();
    const { template, target } = installMarkup();

    expect(target.childElementCount).toBe(0);
    expect(
      document.querySelectorAll(
        "[data-ig-wall] img, [data-ig-wall] iframe, [data-ig-wall] script",
      ),
    ).toHaveLength(0);
    expect(
      template.content.querySelectorAll("figure, img, blockquote"),
    ).not.toHaveLength(0);

    expect(port.materializeTemplate(TEMPLATE, TARGET)).toBe(true);

    expect(target.querySelectorAll("figure img")).toHaveLength(1);
    expect(target.querySelectorAll("blockquote.instagram-media")).toHaveLength(
      1,
    );
    expect(template.content.querySelectorAll("figure")).toHaveLength(1);
  });

  it("returns false and mutates nothing when the template or target is missing", () => {
    const port = createScriptsAdapter();
    const { target } = installMarkup();

    expect(port.materializeTemplate("template[data-missing]", TARGET)).toBe(
      false,
    );
    expect(target.childElementCount).toBe(0);

    expect(port.materializeTemplate(TEMPLATE, "[data-missing]")).toBe(false);
  });

  it("clears the live target but leaves the template reusable", () => {
    const port = createScriptsAdapter();
    const { template, target } = installMarkup();

    expect(port.materializeTemplate(TEMPLATE, TARGET)).toBe(true);
    expect(target.childElementCount).toBeGreaterThan(0);

    port.clearElement(TARGET);

    expect(target.childElementCount).toBe(0);
    expect(template.content.querySelectorAll("figure")).toHaveLength(1);
  });

  it("never throws for missing selectors", () => {
    const port = createScriptsAdapter();
    installMarkup();

    expect(() => port.clearElement("[data-missing]")).not.toThrow();
    expect(() => port.materializeTemplate("x", "y")).not.toThrow();
  });
});
