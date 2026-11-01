import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ContactRowProps {
  /** Muted field label, e.g. `Instagram（個人）`. */
  label: string;
  href: string;
  /** Visible link text for a one-line handle; omit to use children. */
  value?: string;
  /** Accessible name when the handle alone does not say which account it is. */
  ariaLabel?: string;
  /** External target; adds `target="_blank" rel="noopener"`. */
  external?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * ContactRow — one line of the home contact list.
 *
 * The `<li>` is part of the component so the authored list stays semantic
 * inside `<Stack as="ul">`.
 */
export default function ContactRow({
  label,
  href,
  value,
  ariaLabel,
  external = false,
  className,
  children,
}: ContactRowProps) {
  return (
    <li
      className={cn(
        "m-0 flex flex-wrap items-baseline gap-x-[var(--space-4)] gap-y-[var(--space-2)] pointer-coarse:items-center",
        className,
      )}
    >
      <span className="min-w-24 font-[family-name:var(--font-mono)] text-[length:var(--text-xs)] tracking-[var(--tracking-wide)] text-muted-foreground uppercase">
        {label}
      </span>
      <a
        href={href}
        aria-label={ariaLabel}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener" : undefined}
        className="text-[length:var(--text-lg)] font-medium no-underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center [&_p]:m-0 [&_p]:inline"
      >
        {value ?? children}
      </a>
    </li>
  );
}
