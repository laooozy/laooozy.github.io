import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { hasRenderableChildren } from "./compositions/utils";
import Heading from "./typography/Heading";
import Text from "./typography/Text";

export interface SectionProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title" | "hidden"
> {
  /** Anchor id; also the source of the heading id (`<id>-heading`). */
  id?: string;
  /** Section heading, rendered as an `<h2>` and wired with aria-labelledby. */
  heading?: string;
  /** Supporting paragraph under the heading. */
  lead?: string;
  /** Top-right control beside the heading (a link or button group). */
  actions?: ReactNode;
  /**
   * Server-rendered action markup. Only the Astro compatibility shim uses it:
   * named slots cannot cross the Astro/React boundary as React nodes, so the
   * shim flattens its `actions` slot to HTML and hands it over here.
   */
  actionsHtml?: string;
  /**
   * `true` renders nothing at all; `"empty"` renders nothing while the body
   * has no visible children. Never make the reveal default invisible.
   */
  hidden?: boolean | "empty";
  className?: string;
  children?: ReactNode;
}

/**
 * Section — one page band with a heading, an optional lead and an action slot.
 *
 * The component owns its INTERNAL rhythm only; the page wrapper (`.home` /
 * `.photography`) owns the gap between sections.
 */
export default function Section({
  id,
  heading,
  lead,
  actions,
  actionsHtml,
  hidden = false,
  className,
  children,
  ...props
}: SectionProps) {
  if (hidden === true) return null;
  if (hidden === "empty" && !hasRenderableChildren(children)) return null;

  const headingId = id ? `${id}-heading` : undefined;
  const hasHead = Boolean(heading) || actions != null || Boolean(actionsHtml);

  return (
    <section
      id={id}
      aria-labelledby={heading && headingId ? headingId : undefined}
      className={className}
      {...props}
    >
      {hasHead ? (
        <div className="mb-[var(--space-5)] flex flex-wrap items-baseline justify-between gap-x-[var(--space-5)] gap-y-[var(--space-3)]">
          {heading ? (
            <Heading level={2} id={headingId} className="section__title">
              {heading}
            </Heading>
          ) : null}
          {actions != null || actionsHtml ? (
            <div className="section__actions flex flex-wrap items-center gap-[var(--space-3)] [&_p]:m-0 [&_p]:inline">
              {actions}
              {actionsHtml ? (
                <span dangerouslySetInnerHTML={{ __html: actionsHtml }} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {lead ? (
        <Text
          as="p"
          tone="muted"
          measure
          className={cn(
            "section__lead mb-[var(--space-6)]",
            hasHead ? "mt-[calc(var(--space-1)*-1)]" : "mt-0",
          )}
        >
          {lead}
        </Text>
      ) : null}
      <div className="section__body">{children}</div>
    </section>
  );
}
