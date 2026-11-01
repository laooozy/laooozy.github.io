// @vitest-environment happy-dom
/**
 * Contract for the hydration-safe translation hook.
 *
 * The build emits the default locale, while the pre-paint boot can seed the
 * store with a different locale before React's first client render. The hook
 * must therefore render the BUILD locale until the mount effect flips
 * `isHydrated`, then adopt the store locale — exactly the sequence pinned by
 * the render log below.
 */
import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import type { Locale } from "@/i18n";
import { createFakeDeps } from "@/test/client-deps";

import {
  type HydrationSafeTranslation,
  useHydrationSafeT,
} from "./useHydrationSafeT";

interface RenderRecord {
  locale: HydrationSafeTranslation["locale"];
  isHydrated: boolean;
  label: string;
}

const records: RenderRecord[] = [];

function Probe() {
  const { t, locale, isHydrated } = useHydrationSafeT();
  const label = t("nav.about");
  records.push({ locale, isHydrated, label });
  return (
    <span data-locale={locale} data-hydrated={String(isHydrated)}>
      {label}
    </span>
  );
}

function renderDeps(locale: Locale) {
  return createFakeDeps({ locale });
}

beforeEach(() => {
  records.length = 0;
});

describe("useHydrationSafeT", () => {
  it("renders the build locale on the server even when the store holds another", () => {
    const { deps } = renderDeps("en");

    const html = renderToStaticMarkup(
      <ClientDepsProvider deps={deps}>
        <Probe />
      </ClientDepsProvider>,
    );

    expect(html).toContain('data-locale="zh-hant"');
    expect(html).toContain('data-hydrated="false"');
    expect(html).toContain("關於");
    expect(html).not.toContain("About");
  });

  it("adopts a non-default injected store locale after mount", () => {
    const { deps } = renderDeps("en");

    const { container } = render(
      <ClientDepsProvider deps={deps}>
        <Probe />
      </ClientDepsProvider>,
    );

    // First client render is byte-identical to the SSR output ...
    expect(records[0]).toEqual({
      locale: "zh-hant",
      isHydrated: false,
      label: "關於",
    });
    // ... then the store locale is adopted without a reload.
    const last = records.at(-1);
    expect(last).toEqual({ locale: "en", isHydrated: true, label: "About" });
    expect(
      container.querySelector("[data-locale]")?.getAttribute("data-locale"),
    ).toBe("en");
    expect(screen.getByText("About")).not.toBeNull();

    // A later switch re-renders in place; `isHydrated` never flips back.
    act(() => deps.store.getState().setLocale("zh-hans"));
    expect(screen.getByText("关于")).not.toBeNull();
    expect(records.at(-1)).toMatchObject({
      locale: "zh-hans",
      isHydrated: true,
    });
  });

  it("flips isHydrated from false to true exactly once", () => {
    const { deps } = renderDeps("zh-hant");

    render(
      <ClientDepsProvider deps={deps}>
        <Probe />
      </ClientDepsProvider>,
    );

    const flags = records.map((record) => record.isHydrated);
    expect(flags[0]).toBe(false);
    expect(flags.slice(1).every(Boolean)).toBe(true);
    // One transition only: every record after the first already hydrated.
    expect(flags.filter((flag) => !flag)).toHaveLength(1);
  });
});
