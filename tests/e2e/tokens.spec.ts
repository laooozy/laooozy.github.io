import { expect, test } from "@playwright/test";

const PROBE_SOURCE = (id: string, className: string) => ({ id, className });

/**
 * Proves the brand `@utility` rules and the `@theme` animation entries reach a
 * real browser and compute to the token values. `glass` and `surface` are
 * mutually exclusive surfaces, so they are probed separately; the combined
 * probe only proves every class name resolves.
 */
test("brand tokens and utilities render in the browser", async ({ page }) => {
  await page.goto("/");

  const computed = await page.evaluate(
    ({ probes }) => {
      const host = document.createElement("div");
      host.id = "token-probe-host";
      host.style.cssText =
        "position:absolute;top:0;left:0;width:56.25rem;padding:0;z-index:-2";

      const elements = probes.map(({ id, className }) => {
        const element = document.createElement("div");
        element.id = id;
        element.className = className;
        element.textContent = "probe";
        host.append(element);
        return { id, element };
      });

      document.body.append(host);

      const read = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return {
          animationName: style.animationName,
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          backdropFilter: style.backdropFilter,
          borderTopColor: style.borderTopColor,
          borderTopStyle: style.borderTopStyle,
          borderTopWidth: style.borderTopWidth,
          boxShadow: style.boxShadow,
          maxWidth: style.maxWidth,
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      };

      const result: Record<
        string,
        ReturnType<typeof read>
      > = Object.fromEntries(
        elements.map(({ id, element }) => [id, read(element)]),
      );

      return {
        probes: result,
        measureToken: getComputedStyle(document.documentElement)
          .getPropertyValue("--measure")
          .trim(),
        accentToken: getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim(),
      };
    },
    {
      probes: [
        PROBE_SOURCE("probe-glass", "glass measure focus-ring"),
        PROBE_SOURCE("probe-surface", "surface measure focus-ring"),
        PROBE_SOURCE("probe-combined", "glass surface measure focus-ring"),
        PROBE_SOURCE("probe-marquee", "animate-marquee"),
        PROBE_SOURCE("probe-shimmer", "animate-shimmer"),
      ],
    },
  );

  expect(computed.measureToken).toBe("68ch");
  expect(computed.accentToken).toMatch(/^oklch\(/);

  for (const id of ["probe-glass", "probe-surface", "probe-combined"]) {
    const probe = computed.probes[id];

    expect(probe.backgroundColor).not.toBe("");
    expect(probe.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(probe.backgroundColor).not.toBe("transparent");
    expect(probe.borderTopWidth).toBe("1px");
    expect(probe.borderTopStyle).toBe("solid");
    expect(probe.borderTopColor).not.toBe("transparent");
    expect(probe.boxShadow).not.toBe("none");
    expect(probe.maxWidth).toMatch(/^\d+(\.\d+)?px$/);
    expect(probe.outlineWidth).toBe("2px");
    expect(probe.outlineStyle).toBe("solid");
    expect(probe.outlineOffset).toBe("3px");
    expect(probe.outlineColor).not.toBe("transparent");
  }

  expect(computed.probes["probe-glass"].backdropFilter).toContain("blur");
  expect(computed.probes["probe-glass"].backgroundImage).toContain("gradient");
  expect(computed.probes["probe-surface"].backdropFilter).toBe("none");

  expect(computed.probes["probe-marquee"].animationName).toBe("marquee");
  expect(computed.probes["probe-shimmer"].animationName).toBe("shimmer");
});
