// @vitest-environment happy-dom
/**
 * Render tests for the generated shadcn primitives.
 *
 * These pin the contract the shared components rely on: a `Button` is a real
 * `<button>` (or the caller's replacement element), a `Card` keeps its slot
 * markers, and a `Badge` can become a quiet link. Assertions are behavioural
 * (roles, tags, click handling, variant classes) rather than DOM snapshots.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

describe("generated Button", () => {
  it("renders a real button with the default variant and size", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("data-slot")).toBe("button");
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("h-8");
  });

  it("applies the requested variant and size classes", () => {
    render(
      <Button variant="outline" size="sm">
        Cancel
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.className).toContain("border-border");
    expect(button.className).not.toContain(
      "bg-primary text-primary-foreground",
    );
    expect(button.className).toContain("h-7");
  });

  it("keeps the caller's onClick handler", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders through the Base UI render prop as a link", () => {
    render(<Button render={<a href="/blog/">Read the blog</a>} />);

    const link = screen.getByRole("link", { name: "Read the blog" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/blog/");
    expect(link.getAttribute("data-slot")).toBe("button");
  });
});

describe("generated Card", () => {
  it("renders the card and its content slots", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Night loop</CardTitle>
          <CardDescription>Twelve tracks.</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    const card = container.querySelector('[data-slot="card"]');
    expect(card?.getAttribute("data-size")).toBe("default");
    for (const slot of [
      "card-header",
      "card-title",
      "card-description",
      "card-content",
      "card-footer",
    ]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
  });

  it("exposes the compact size through data-size", () => {
    const { container } = render(<Card size="sm">Compact</Card>);

    const card = container.querySelector('[data-slot="card"]');
    expect(card?.getAttribute("data-size")).toBe("sm");
    expect(card?.className).toContain("data-[size=sm]:");
  });
});

describe("generated Badge", () => {
  it("renders a span by default with the variant class", () => {
    render(<Badge variant="destructive">Failed</Badge>);

    const badge = screen.getByText("Failed");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.getAttribute("data-slot")).toBe("badge");
    expect(badge.className).toContain("bg-destructive/10");
  });

  it("can render as a link without losing the badge styling", () => {
    render(
      <Badge variant="outline" render={<a href="/blog/tag/test" />}>
        Topic
      </Badge>,
    );

    const link = screen.getByRole("link", { name: "Topic" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/blog/tag/test");
    expect(link.className).toContain("border-border");
  });
});
