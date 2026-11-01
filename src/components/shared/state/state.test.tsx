import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Heading from "@/components/shared/typography/Heading";

import AlertState from "./AlertState";
import EmptyState from "./EmptyState";
import { Kbd, KbdGroup } from "./Kbd";
import SkeletonState from "./SkeletonState";
import SpinnerState from "./SpinnerState";
import TooltipState from "./TooltipState";

describe("state primitives", () => {
  describe("EmptyState", () => {
    it("renders the generated empty slots with caller copy", () => {
      const html = renderToStaticMarkup(
        <EmptyState
          title={<Heading level={2}>Nothing here</Heading>}
          description="No posts yet."
          action={<a href="/">Home</a>}
        />,
      );

      expect(html).toContain('data-slot="empty"');
      expect(html).toContain('data-slot="empty-title"');
      expect(html).toContain('data-slot="empty-description"');
      expect(html).toContain('data-slot="empty-content"');
      expect(html).toContain("<h2");
      expect(html).toContain("Nothing here");
      expect(html).toContain("No posts yet.");
      expect(html).toContain("Home");
    });

    it("omits the content slot when there is no action or children", () => {
      const html = renderToStaticMarkup(<EmptyState description="Empty." />);

      expect(html).not.toContain('data-slot="empty-content"');
      expect(html).toContain("Empty.");
    });
  });

  describe("AlertState", () => {
    it("renders a generated alert with role=alert and caller copy", () => {
      const html = renderToStaticMarkup(
        <AlertState
          variant="destructive"
          title="Load failed"
          description="The playlist could not be loaded."
          action={<button type="button">Retry</button>}
        >
          <a href="/fallback">Open fallback</a>
        </AlertState>,
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('data-slot="alert"');
      expect(html).toContain('data-slot="alert-title"');
      expect(html).toContain('data-slot="alert-description"');
      expect(html).toContain('data-slot="alert-action"');
      expect(html).toContain('data-slot="alert-children"');
      expect(html).toContain("Load failed");
      expect(html).toContain("The playlist could not be loaded.");
      expect(html).toContain("Retry");
    });
  });

  describe("SpinnerState", () => {
    it("is a polite, atomic live region with caller-owned copy", () => {
      const html = renderToStaticMarkup(
        <SpinnerState label="Loading the playlist…" />,
      );

      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-atomic="true"');
      expect(html).toContain("Loading the playlist…");
      // The generated spinner's hard-coded English label is suppressed.
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain('aria-label="Loading"');
    });

    it("shows the label and skips the glyph for a quiet status", () => {
      const html = renderToStaticMarkup(
        <SpinnerState label="12 songs" spinner={false} showLabel />,
      );

      expect(html).toContain("12 songs");
      expect(html).not.toContain('data-slot="spinner"');
      expect(html).not.toContain("sr-only");
    });
  });

  describe("SkeletonState", () => {
    it("renders a decorative generated skeleton", () => {
      const html = renderToStaticMarkup(<SkeletonState className="h-16" />);

      expect(html).toContain('data-slot="skeleton"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("h-16");
    });
  });

  describe("Kbd", () => {
    it("renders a keyboard element on the mono face", () => {
      const html = renderToStaticMarkup(<Kbd>Ctrl K</Kbd>);

      expect(html).toContain("<kbd");
      expect(html).toContain('data-slot="kbd"');
      expect(html).toContain("font-mono");
      expect(html).toContain("Ctrl K");
    });

    it("groups keys", () => {
      const html = renderToStaticMarkup(
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>,
      );

      expect(html).toContain('data-slot="kbd-group"');
      expect(html).toContain("<kbd");
    });
  });

  describe("TooltipState", () => {
    it("composes the provider and keeps the caller's trigger control", () => {
      const html = renderToStaticMarkup(
        <TooltipState
          trigger={<button type="button">More</button>}
          content="Open the playlist"
        />,
      );

      expect(html).toContain("<button");
      expect(html).toContain("More");
      expect(html).toContain('data-slot="tooltip-trigger"');
    });
  });
});
