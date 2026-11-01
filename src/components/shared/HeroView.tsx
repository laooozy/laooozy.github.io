import type { ReactNode } from "react";

import Heading from "./typography/Heading";
import Text from "./typography/Text";

export interface HeroViewProps {
  /** The wordmark. This is the home page's single `<h1>`. */
  title: string;
  /** Supporting one-line description under the wordmark. */
  lead?: string;
  children?: ReactNode;
}

/**
 * HeroView — the presentational half of the home masthead.
 *
 * The build-time "now" ticker is an Astro component with its own I/O and a
 * hydrated island, so it stays OUTSIDE this React tree in `site/Hero.astro`
 * and renders as a sibling before the identity block. This component owns only
 * the title, the lead and the authored Markdown that follows them.
 */
export default function HeroView({ title, lead, children }: HeroViewProps) {
  return (
    <>
      <Heading
        level={1}
        size="hero"
        className="hero__title leading-[1.02] text-[var(--text)]"
      >
        {title}
        <span className="hero__period text-primary" aria-hidden="true">
          .
        </span>
      </Heading>
      {lead ? (
        <Text as="p" size="xl" tone="muted" measure className="hero__tagline">
          {lead}
        </Text>
      ) : null}
      {children}
    </>
  );
}
