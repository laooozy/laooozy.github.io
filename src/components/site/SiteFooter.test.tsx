// @vitest-environment happy-dom
/**
 * Render contract for the footer island.
 *
 * The footer must consume build-time data, never the clock: `year` and the
 * update stamp arrive as props from `BaseLayout.astro`. The failure case below
 * moves the system clock a year forward and proves the rendered copyright year
 * still equals the build-time prop.
 */
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { appStore } from "@/store/app-store";

import SiteFooter, { type SiteUpdatedStamp } from "./SiteFooter";

const STAMP: SiteUpdatedStamp = {
  iso: "2026-11-01T15:00",
  display: "2026-11-01 15:00",
};

afterEach(() => {
  vi.useRealTimers();
  appStore.setState({ locale: "zh-hant" });
});

describe("SiteFooter", () => {
  it("renders the build year prop, not the system clock year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2032-06-01T00:00:00Z"));

    render(<SiteFooter year={2031} siteUpdated={STAMP} />);

    expect(screen.getByText("© 2031 laooozy · 版權所有")).not.toBeNull();
  });

  it("renders the validated stamp verbatim in a machine-readable <time>", () => {
    render(<SiteFooter year={2026} siteUpdated={STAMP} />);

    const stamp = screen.getByText("2026-11-01 15:00");
    expect(stamp.tagName).toBe("TIME");
    expect(stamp.getAttribute("datetime")).toBe("2026-11-01T15:00");
  });

  it("routes the copy and stamp through the generated shadcn Separator", () => {
    const { container } = render(
      <SiteFooter year={2026} siteUpdated={STAMP} />,
    );

    expect(container.querySelector('[data-slot="separator"]')).not.toBeNull();
  });

  it("adopts the store locale after mount without changing the build data", () => {
    render(<SiteFooter year={2026} siteUpdated={STAMP} />);

    act(() => appStore.getState().setLocale("en"));

    expect(
      screen.getByText("© 2026 laooozy · All rights reserved"),
    ).not.toBeNull();
    expect(screen.getByText("2026-11-01 15:00")).not.toBeNull();
  });
});
