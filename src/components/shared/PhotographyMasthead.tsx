import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import Stack from "./layout/Stack";
import Heading from "./typography/Heading";
import Text from "./typography/Text";

export interface PhotographyMastheadProps {
  /** The page identity, rendered as the single `<h1>` of the page. */
  title: string;
  /** Supporting intro copy under the identity. */
  lead?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * PhotographyMasthead — the Photography page intro.
 *
 * The identity line is the page's one `<h1>`; the intro `lead` and the authored
 * Markdown children stack under it on the shared spacing scale.
 */
export default function PhotographyMasthead({
  title,
  lead,
  className,
  children,
}: PhotographyMastheadProps) {
  return (
    <header
      className={cn(
        "photo-masthead relative flex flex-col items-start gap-[var(--space-5)] pb-[clamp(var(--space-2),3vw,var(--space-6))] [&>*]:relative [&>*]:z-[1]",
        className,
      )}
    >
      <Heading
        level={1}
        size="hero"
        className="photo-masthead__title max-w-[20ch]"
      >
        {title}
      </Heading>

      <Stack
        gap={4}
        className="photo-masthead__intro max-w-[var(--measure)] [&>ol]:m-0 [&>p]:m-0 [&>ul]:m-0"
      >
        {lead ? (
          <Text as="p" size="xl" tone="muted" measure>
            {lead}
          </Text>
        ) : null}
        {children}
      </Stack>
    </header>
  );
}
