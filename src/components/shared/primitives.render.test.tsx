// @vitest-environment happy-dom
/**
 * DOM-level tests for the shared presentational primitives.
 *
 * The sibling `*.test.tsx` files pin static markup through `react-dom/server`.
 * This file mounts the same components into happy-dom and queries them the way
 * a screen reader or a user would: by role, tag, link target and ARIA state.
 * No snapshots: every assertion names one behaviour.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { createStore } from "zustand/vanilla";

import { noopDomAdapter } from "@/adapters/dom";
import { fixedLocaleSource } from "@/adapters/locale-source";
import { fakeMusic } from "@/adapters/music";
import { fakePagefind } from "@/adapters/pagefind";
import { memoryStorageAdapter } from "@/adapters/storage";
import ChipRow from "@/components/shared/ChipRow";
import {
  ClientDepsProvider,
  useClientDeps,
} from "@/components/shared/ClientDepsContext";
import Cluster from "@/components/shared/layout/Cluster";
import Container from "@/components/shared/layout/Container";
import Grid from "@/components/shared/layout/Grid";
import Stack from "@/components/shared/layout/Stack";
import AlertState from "@/components/shared/state/AlertState";
import EmptyState from "@/components/shared/state/EmptyState";
import { Kbd } from "@/components/shared/state/Kbd";
import SkeletonState from "@/components/shared/state/SkeletonState";
import SpinnerState from "@/components/shared/state/SpinnerState";
import TooltipState from "@/components/shared/state/TooltipState";
import Heading from "@/components/shared/typography/Heading";
import Prose from "@/components/shared/typography/Prose";
import Text from "@/components/shared/typography/Text";
import type { ClientDeps } from "@/hooks/deps";
import type { MusicPayload } from "@/lib/domain/music";
import { appStore } from "@/store/app-store";
import type { AppStore } from "@/store/types";

const musicPayload: MusicPayload = {
  version: 1,
  generatedAt: "2026-10-31T00:00:00.000Z",
  playlist: {
    id: "PLtestFixture",
    title: "Night loop",
    url: "https://www.youtube.com/playlist?list=PLtestFixture",
  },
  organisations: {},
  songs: [],
};

function makeStore(locale: AppStore["locale"]): StoreApi<AppStore> {
  return createStore<AppStore>()((set) => ({
    ...appStore.getInitialState(),
    locale,
    setLocale: (next) => set({ locale: next }),
    setHeaderHidden: () => {},
    setHeaderMenuOpen: () => {},
    openSearch: () => {},
    closeSearch: () => {},
    setSearchQuery: () => {},
    setSearchStatus: () => {},
    setSearchResults: () => {},
  }));
}

function makeDeps(locale: AppStore["locale"]): ClientDeps {
  return {
    store: makeStore(locale),
    adapters: {
      storage: memoryStorageAdapter(),
      localeSource: fixedLocaleSource("en-US"),
      dom: noopDomAdapter,
      pagefind: fakePagefind([]),
      music: fakeMusic(musicPayload),
    },
  };
}

function LocaleProbe() {
  const deps = useClientDeps();
  return (
    <span data-locale={deps.store.getState().locale}>
      {deps.store.getState().locale}
    </span>
  );
}

beforeEach(() => {
  appStore.setState({ locale: "zh-hant" });
});

afterEach(() => {
  appStore.setState({ locale: "zh-hant" });
});

describe("shared layout primitives", () => {
  it("renders Stack as a vertical flex element with the token gap", () => {
    render(<Stack gap={4}>stack body</Stack>);

    const stack = screen.getByText("stack body");
    expect(stack.tagName).toBe("DIV");
    expect(stack.className).toContain("flex-col");
    expect(stack.className).toContain("gap-(--space-4)");
    expect(stack.className).toContain("items-stretch");
  });

  it("renders Cluster as a wrapping row with justify", () => {
    render(
      <Cluster justify="between">
        <span>left</span>
      </Cluster>,
    );

    const cluster = screen.getByText("left").parentElement;
    expect(cluster?.className).toContain("flex-wrap");
    expect(cluster?.className).toContain("justify-between");
    expect(cluster?.className).toContain("items-center");
  });

  it("renders Grid with an exact column track or a fluid auto-fit", () => {
    render(
      <Grid columns={3}>
        <span>cell</span>
      </Grid>,
    );
    const exact = screen.getByText("cell").parentElement;
    expect(exact?.className).toContain("grid");
    expect(exact?.className).toContain("grid-cols-3");

    render(<Grid min="19rem">fluid cell</Grid>);
    const fluid = screen.getByText("fluid cell");
    expect(fluid.className).toContain(
      "grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))]",
    );
  });

  it("renders the requested semantic tag and the container gutter", () => {
    render(
      <Container as="section" size="narrow">
        page column
      </Container>,
    );

    const section = screen.getByText("page column");
    expect(section.tagName).toBe("SECTION");
    expect(section.className).toContain("mx-auto");
    expect(section.className).toContain("max-w-(--container-narrow)");
  });

  it("grows an interactive element to the coarse-pointer touch floor", () => {
    render(
      <Stack as="a" href="/photographer/" interactive>
        Photography
      </Stack>,
    );

    const link = screen.getByRole("link", { name: "Photography" });
    expect(link.className).toContain("pointer-coarse:min-h-11");
    expect(link.className).toContain("pointer-coarse:min-w-11");
  });
});

describe("shared typography", () => {
  it("maps the heading level to the matching semantic tag", () => {
    render(<Heading level={1}>Wordmark</Heading>);

    const heading = screen.getByRole("heading", { level: 1, name: "Wordmark" });
    expect(heading.tagName).toBe("H1");
    expect(heading.className).toContain("font-heading");
  });

  it("applies tone and display-size classes without changing the tag", () => {
    render(
      <Heading level={2} size="hero" tone="muted">
        Display
      </Heading>,
    );

    const heading = screen.getByRole("heading", { level: 2, name: "Display" });
    expect(heading.className).toContain("text-muted-foreground");
    expect(heading.className).toContain("var(--text-hero)");
  });

  it("renders Text as a paragraph by default and as a span on request", () => {
    render(<Text>Body</Text>);
    render(<Text as="span">Inline</Text>);

    expect(screen.getByText("Body").tagName).toBe("P");
    expect(screen.getByText("Inline").tagName).toBe("SPAN");
  });

  it("caps a measured Text at the brand measure", () => {
    render(<Text measure>Prose line</Text>);

    expect(screen.getByText("Prose line").className).toContain(
      "max-w-[var(--measure)]",
    );
  });

  it("renders Prose on the brand article type system", () => {
    render(<Prose>Article body</Prose>);

    const prose = screen.getByText("Article body");
    expect(prose.tagName).toBe("DIV");
    expect(prose.className).toContain("prose");
    expect(prose.className).toContain("prose-brand");
  });
});

describe("ChipRow", () => {
  it("renders a plain tag as a non-interactive span", () => {
    render(<ChipRow items={[{ label: "Hades" }]} />);

    expect(screen.getByText("Hades").tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders a linked tag as a quiet link", () => {
    render(<ChipRow items={[{ label: "隨筆", href: "/blog/tag/隨筆" }]} />);

    const link = screen.getByRole("link", { name: "隨筆" });
    expect(link.getAttribute("href")).toBe("/blog/tag/隨筆");
  });

  it("renders a filter button with aria-pressed", () => {
    render(
      <ChipRow
        variant="filter"
        items={[{ label: "全部", active: true }, { label: "2026" }]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "全部" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "2026" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("renders a filter link with aria-current only when active", () => {
    render(
      <ChipRow
        variant="filter"
        items={[
          { label: "2026", href: "/blog/2026/", active: true },
          { label: "2025", href: "/blog/2025/" },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "2026" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "2025" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});

describe("shared state primitives", () => {
  it("renders AlertState as an assertive alert", () => {
    render(
      <AlertState
        variant="destructive"
        title="Load failed"
        description="Try again."
        action={<button type="button">Retry</button>}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Load failed");
    expect(alert.textContent).toContain("Try again.");
    expect(screen.getByRole("button", { name: "Retry" })).not.toBeNull();
  });

  it("renders EmptyState with the caller's heading and action", () => {
    const { container } = render(
      <EmptyState
        title={<Heading level={2}>Nothing here</Heading>}
        description="No posts yet."
        action={<a href="/">Home</a>}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Nothing here" }),
    ).not.toBeNull();
    expect(screen.getByText("No posts yet.")).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Home" }).getAttribute("href"),
    ).toBe("/");
    expect(
      container.querySelector('[data-slot="empty-content"]'),
    ).not.toBeNull();
  });

  it("makes SpinnerState one polite, atomic status region", () => {
    render(<SpinnerState label="Loading the playlist…" />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-atomic")).toBe("true");
    expect(status.textContent).toContain("Loading the playlist…");
  });

  it("hides SkeletonState from the accessibility tree", () => {
    const { container } = render(<SkeletonState className="h-16" />);

    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders Kbd as a keyboard element", () => {
    render(<Kbd>Ctrl K</Kbd>);

    const kbd = screen.getByText("Ctrl K");
    expect(kbd.tagName).toBe("KBD");
    expect(kbd.className).toContain("font-mono");
  });

  it("renders TooltipState with the caller's real trigger control", () => {
    render(
      <TooltipState
        trigger={<button type="button">More</button>}
        content="Open the playlist"
      />,
    );

    expect(screen.getByRole("button", { name: "More" })).not.toBeNull();
  });
});

describe("ClientDepsProvider", () => {
  it("injects the supplied bundle", () => {
    render(
      <ClientDepsProvider deps={makeDeps("en")}>
        <LocaleProbe />
      </ClientDepsProvider>,
    );

    expect(screen.getByText("en")).not.toBeNull();
  });

  it("falls back to the composition-root singleton without a provider", () => {
    render(
      <ClientDepsProvider>
        <LocaleProbe />
      </ClientDepsProvider>,
    );

    expect(screen.getByText("zh-hant")).not.toBeNull();
  });
});
