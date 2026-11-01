import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Heading from "./Heading";
import Prose from "./Prose";
import Text from "./Text";

describe("typography primitives", () => {
  it("renders level 1 and 2 as h1/h2", () => {
    expect(renderToStaticMarkup(<Heading level={1}>Title</Heading>)).toContain(
      "<h1",
    );
    expect(renderToStaticMarkup(<Heading level={2}>Title</Heading>)).toContain(
      "<h2",
    );
  });

  it("renders Text as span and as p by default", () => {
    expect(renderToStaticMarkup(<Text as="span">copy</Text>)).toContain(
      "<span",
    );
    expect(renderToStaticMarkup(<Text>copy</Text>)).toContain("<p");
  });

  it("includes the muted tone class on both primitives", () => {
    expect(renderToStaticMarkup(<Text tone="muted">copy</Text>)).toContain(
      "text-muted-foreground",
    );
    expect(
      renderToStaticMarkup(<Heading tone="muted">title</Heading>),
    ).toContain("text-muted-foreground");
  });

  it("wraps Prose in the brand prose classes", () => {
    const html = renderToStaticMarkup(<Prose>body</Prose>);

    expect(html).toContain("prose ");
    expect(html).toContain("prose-invert");
    expect(html).toContain("prose-brand");
  });

  it("honours as and render overrides", () => {
    expect(
      renderToStaticMarkup(
        <Heading level={1} as="div">
          title
        </Heading>,
      ),
    ).toContain("<div");
    expect(
      renderToStaticMarkup(
        <Heading level={1} render={<section />}>
          title
        </Heading>,
      ),
    ).toContain("<section");
  });

  it("keeps sizes on the brand token scale", () => {
    expect(
      renderToStaticMarkup(<Heading size="hero">title</Heading>),
    ).toContain("text-[length:var(--text-hero)]");
    expect(renderToStaticMarkup(<Text size="lg">copy</Text>)).toContain(
      "text-[length:var(--text-lg)]",
    );
    expect(renderToStaticMarkup(<Text measure>copy</Text>)).toContain(
      "max-w-[var(--measure)]",
    );
  });

  it("rejects a fifth heading level at the type level", () => {
    // @ts-expect-error level is restricted to the four semantic levels.
    renderToStaticMarkup(<Heading level={5}>title</Heading>);
  });
});
