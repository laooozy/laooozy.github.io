import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Cluster from "./Cluster";
import Container from "./Container";
import Grid from "./Grid";
import Stack from "./Stack";

describe("layout primitives", () => {
  it("renders the default vertical stack with the token gap", () => {
    const html = renderToStaticMarkup(<Stack gap={4}>body</Stack>);

    expect(html).toContain("<div");
    expect(html).toContain("stack");
    expect(html).toContain("flex-col");
    expect(html).toContain("gap-(--space-4)");
    expect(html).toContain("items-stretch");
    expect(html).not.toContain("style=");
  });

  it("renders a cluster with justify=between and the token gap", () => {
    const html = renderToStaticMarkup(
      <Cluster gap={4} justify="between">
        <span>left</span>
        <span>right</span>
      </Cluster>,
    );

    expect(html).toContain("cluster");
    expect(html).toContain("flex-wrap");
    expect(html).toContain("gap-(--space-4)");
    expect(html).toContain("justify-between");
    expect(html).toContain("items-center");
  });

  it("renders columns=3 as the exact three-column track", () => {
    const html = renderToStaticMarkup(
      <Grid gap={5} columns={3}>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </Grid>,
    );

    expect(html).toContain("<div");
    expect(html).toContain("grid");
    expect(html).toContain("gap-(--space-5)");
    expect(html).toContain("grid-cols-3");
  });

  it("renders the fluid auto-fit track for a min width", () => {
    const html = renderToStaticMarkup(<Grid min="19rem">card</Grid>);

    expect(html).toContain(
      "grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))]",
    );
  });

  it("renders the requested semantic tags", () => {
    expect(renderToStaticMarkup(<Stack as="section">x</Stack>)).toContain(
      "<section",
    );
    expect(renderToStaticMarkup(<Stack as="ul">x</Stack>)).toContain("<ul");
    expect(renderToStaticMarkup(<Cluster as="p">x</Cluster>)).toContain("<p");
    expect(renderToStaticMarkup(<Grid as="ol">x</Grid>)).toContain("<ol");
    expect(renderToStaticMarkup(<Container as="main">x</Container>)).toContain(
      "<main",
    );
  });

  it("renders data-count for the card-grid recipe", () => {
    const html = renderToStaticMarkup(
      <Grid count={5} gap={5} className="grid--cards">
        card
      </Grid>,
    );

    expect(html).toContain('data-count="5"');
    expect(html).toContain("grid--cards");
  });

  it("adds the 44px coarse-pointer target when interactive", () => {
    const html = renderToStaticMarkup(
      <Cluster as="a" href="/blog/" interactive>
        reading
      </Cluster>,
    );

    expect(html).toContain("<a");
    expect(html).toContain("pointer-coarse:min-h-11");
    expect(html).toContain("pointer-coarse:min-w-11");
  });

  it("supports the Base UI render prop", () => {
    const html = renderToStaticMarkup(
      <Stack render={<nav aria-label="probe" />}>links</Stack>,
    );

    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="probe"');
  });

  it("rejects a gap outside the typed scale", () => {
    // @ts-expect-error gap={99} is not a step on the 1-12 scale
    const invalidGap = <Stack gap={99}>body</Stack>;

    expect(renderToStaticMarkup(invalidGap)).toContain("stack");
  });
});
