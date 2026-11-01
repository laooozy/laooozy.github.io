import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface CtaProps {
  href: string;
  /** Visible one-line text. Omit it to use the authored Markdown children. */
  label?: string;
  /** `link` is the quiet pill; `photo` is the accent pill. */
  variant?: "link" | "photo";
  /** External target; adds `target="_blank" rel="noopener"`. */
  external?: boolean;
  className?: string;
  children?: ReactNode;
}

const BASE_CLASSES =
  "cjk-label group inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-pill)] text-[length:var(--text-sm)] no-underline pointer-coarse:min-h-11";

const VARIANT_CLASSES = {
  link: "border border-[var(--control-border)] bg-[var(--surface)] px-[var(--space-4)] py-[var(--space-2)] font-medium text-foreground transition-[background-color,border-color] duration-[var(--dur-fast)] ease-brand hover:border-[var(--control-border-strong)] hover:bg-[var(--accent-surface)] hover:text-foreground",
  photo:
    "border border-[var(--glass-border)] bg-[var(--accent)] px-[var(--space-5)] py-[var(--space-3)] font-semibold text-[var(--text-on-accent)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:text-[var(--text-on-accent)] hover:shadow-[var(--shadow-lift)] focus-visible:-translate-y-0.5 focus-visible:shadow-[var(--shadow-lift)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
} as const;

const ARROW_CLASSES = {
  link: "text-[var(--accent)]",
  photo: "",
} as const;

/**
 * Cta — the two call-to-action pills already on the site.
 *
 * The link variant is the quiet About-card pill; the photo variant is the
 * accent Photography pill. Both keep the trailing arrow, the same hover
 * translation and a 44px coarse-pointer hit area.
 */
export default function Cta({
  href,
  label,
  variant = "link",
  external = false,
  className,
  children,
}: CtaProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener" : undefined}
      className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
    >
      <span className="[&_p]:m-0 [&_p]:inline">{label ?? children}</span>
      <span
        aria-hidden="true"
        className={cn(
          "transition-transform group-hover:translate-x-[3px]",
          ARROW_CLASSES[variant],
        )}
      >
        →
      </span>
    </a>
  );
}
