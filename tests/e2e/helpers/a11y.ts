import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Shared accessibility probes for the page-content audit (Task 47).
 *
 * `auditVisiblePage` runs axe over the whole rendered document. Hidden nodes
 * (the consent-gated Instagram layer, closed dialogs) are outside the
 * accessibility tree, so axe skips them without a rule-level suppression —
 * the only exclusion in here is a deliberate one, and it is never used to
 * silence a rule.
 *
 * `measureTokenContrast` reads the LIVE computed token values from the browser,
 * normalises each one to sRGB through a 2D canvas (the browser is the colour
 * authority, so an `oklch()` retune cannot drift from the measured value), and
 * returns the WCAG 2.x contrast ratio. No hex value is duplicated here.
 */

/** axe impacts that fail the gate; moderate/minor stay advisory. */
export const SERIOUS_IMPACTS = new Set(["serious", "critical"]);

export interface AxeViolationSummary {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: string[];
}

export interface AxeAudit {
  /** All violations that fail the gate (serious or critical). */
  serious: AxeViolationSummary[];
  /** Every violation id, so the output keeps its audit trail. */
  advisory: { id: string; impact: string | null; nodes: number }[];
  /** Rules axe could not decide (e.g. text over a gradient or glass blur). */
  incomplete: { id: string; impact: string | null; nodes: number }[];
}

/**
 * Wait for the loaded fonts and every FINITE animation before sampling, and
 * pin reduced motion so entrance reveals cannot paint mid-flight. Infinite
 * ambient loops are skipped: their `endTime` is not finite and waiting on them
 * would hang the suite.
 */
export async function settlePage(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.evaluate(async () => {
    await document.fonts?.ready;
  });

  await page.evaluate(async () => {
    const finite = document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getComputedTiming();
      return timing?.endTime !== undefined && Number.isFinite(timing.endTime);
    });
    await Promise.all(
      finite.map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

/** Run axe over the visible document and split serious from advisory findings. */
export async function auditVisiblePage(page: Page): Promise<AxeAudit> {
  const results = await new AxeBuilder({ page }).analyze();

  const toSummary = (violation: (typeof results.violations)[number]) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map(
      (node) =>
        `${node.target.join(" ")}${node.failureSummary ? ` — ${node.failureSummary.replace(/\s+/g, " ")}` : ""}`,
    ),
  });

  const serious = results.violations
    .filter((violation) => SERIOUS_IMPACTS.has(violation.impact ?? ""))
    .map(toSummary);

  const advisory = results.violations
    .filter((violation) => !SERIOUS_IMPACTS.has(violation.impact ?? ""))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      nodes: violation.nodes.length,
    }));

  const incomplete = results.incomplete.map((result) => ({
    id: result.id,
    impact: result.impact ?? null,
    nodes: result.nodes.length,
  }));

  if (advisory.length > 0) {
    console.log(
      `axe advisory (non-blocking): ${advisory
        .map(
          ({ id, impact, nodes: count }) =>
            `${id} (${impact}, ${count} node(s))`,
        )
        .join(", ")}`,
    );
  }
  if (incomplete.length > 0) {
    console.log(
      `axe incomplete (needs manual review): ${incomplete
        .map(({ id, nodes: count }) => `${id} (${count} node(s))`)
        .join(", ")}`,
    );
  }

  return { serious, advisory, incomplete };
}

/** Assert zero serious/critical violations with an actionable failure body. */
export function expectNoSeriousViolations(
  audit: AxeAudit,
  context: string,
): void {
  expect(
    audit.serious,
    `${context}: ${audit.serious.length} serious/critical axe violation(s)\n${audit.serious
      .map(
        (violation) =>
          `- ${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.helpUrl}\n  nodes:\n    ${violation.nodes.join("\n    ")}`,
      )
      .join("\n")}`,
  ).toEqual([]);
}

/** Percent-encoded round trip of one sRGB channel triplet. */
export interface SrgbColor {
  r: number;
  g: number;
  b: number;
  alpha: number;
  /** `#rrggbb` when fully opaque, else `rgba(...)` for the audit trail. */
  css: string;
}

export interface TokenContrast {
  foreground: string;
  background: string;
  foregroundColor: SrgbColor;
  backgroundColor: SrgbColor;
  ratio: number;
  required: number;
  passes: boolean;
}

/** Resolve every named custom property to sRGB inside the browser. */
async function readTokenSrgb(
  page: Page,
  tokenNames: string[],
): Promise<Record<string, SrgbColor>> {
  return page.evaluate((names) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("a11y contrast probe: 2D canvas unavailable");

    const toSrgb = (value: string): SrgbColor => {
      // The canvas is the normaliser: it accepts the computed CSS colour
      // (`oklch(...)`, `color(display-p3 ...)`, `rgb(...)`) and gives back the
      // sRGB bytes Chrome actually paints.
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
      if (r === 0 && g === 0 && b === 0 && alpha === 0) {
        throw new Error(
          `a11y contrast probe: could not parse colour "${value}"`,
        );
      }
      const hex = (channel: number) => channel.toString(16).padStart(2, "0");
      return {
        r,
        g,
        b,
        alpha,
        css:
          alpha === 255
            ? `#${hex(r)}${hex(g)}${hex(b)}`
            : `rgba(${r}, ${g}, ${b}, ${(alpha / 255).toFixed(3)})`,
      };
    };

    const root = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      names.map((name) => {
        const value = root.getPropertyValue(name).trim();
        if (!value) {
          throw new Error(
            `a11y contrast probe: token ${name} is not declared on :root`,
          );
        }
        return [name, toSrgb(value)];
      }),
    );
  }, tokenNames);
}

/** WCAG 2.x relative luminance from 8-bit sRGB channels. */
function relativeLuminance({ r, g, b }: SrgbColor): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, always >= 1. */
function contrastRatio(a: SrgbColor, b: SrgbColor): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Measure the WCAG ratio between two CSS custom properties by reading their
 * live computed values from the page. `required` defaults to 4.5 (AA normal
 * text).
 */
export async function measureTokenContrast(
  page: Page,
  foregroundToken: string,
  backgroundToken: string,
  required = 4.5,
): Promise<TokenContrast> {
  const colors = await readTokenSrgb(page, [foregroundToken, backgroundToken]);
  const foregroundColor = colors[foregroundToken];
  const backgroundColor = colors[backgroundToken];
  const ratio = contrastRatio(foregroundColor, backgroundColor);

  return {
    foreground: foregroundToken,
    background: backgroundToken,
    foregroundColor,
    backgroundColor,
    ratio: Math.round(ratio * 100) / 100,
    required,
    passes: ratio >= required,
  };
}

/** Human-readable evidence line for the test output. */
export function contrastSummary(measurement: TokenContrast): string {
  return (
    `${measurement.foreground} (${measurement.foregroundColor.css}) on ` +
    `${measurement.background} (${measurement.backgroundColor.css}) = ` +
    `${measurement.ratio.toFixed(2)}:1 (required ${measurement.required}:1) — ` +
    `${measurement.passes ? "PASS" : "FAIL"}`
  );
}

/** Assert one measured pair clears its WCAG floor with the ratio in the body. */
export function expectTokenContrast(
  measurement: TokenContrast,
  context: string,
): void {
  expect(
    measurement.passes,
    `${context}: ${contrastSummary(measurement)}`,
  ).toBe(true);
}

/**
 * Overwrite a token for one page so a deliberately bad colour can prove the
 * measurement (and therefore the gate) can fail. Test-only: nothing in the
 * shipped stylesheet calls this.
 */
export async function overrideToken(
  page: Page,
  token: string,
  value: string,
): Promise<void> {
  await page.evaluate(
    ({ name, colour }) => {
      document.documentElement.style.setProperty(name, colour);
    },
    { name: token, colour: value },
  );
}
