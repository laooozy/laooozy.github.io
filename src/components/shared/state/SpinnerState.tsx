import type { ComponentPropsWithRef, ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface SpinnerStateProps extends ComponentPropsWithRef<"span"> {
  /** The caller-owned status copy; rendered as the live region's content. */
  label: string;
  /** Draw the generated spinner before the label. Default `true`. */
  spinner?: boolean;
  /** Show the label visually. Default `false` (screen-reader only). */
  showLabel?: boolean;
  /** Extra content after the label, e.g. a caller-owned retry link. */
  children?: ReactNode;
  className?: string;
  labelClassName?: string;
}

/**
 * SpinnerState — the one live status region.
 *
 * It owns `role="status"`, `aria-live="polite"` and `aria-atomic`, so a caller
 * never repeats the status ARIA markup. The generated `Spinner` carries a
 * hard-coded English `aria-label`; it is always hidden here and the caller's
 * `label` is the only announced copy. Pass `spinner={false}` for a quiet status
 * line (result counts) and `showLabel` when the copy should also be visible.
 */
export default function SpinnerState({
  label,
  spinner = true,
  showLabel = false,
  children,
  className,
  labelClassName,
  ...props
}: SpinnerStateProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn("inline-flex items-center gap-(--space-2)", className)}
      {...props}
    >
      {spinner ? (
        <Spinner
          aria-hidden="true"
          aria-label={undefined}
          role={undefined}
          className="shrink-0"
        />
      ) : null}
      {label ? (
        <span className={cn(showLabel ? undefined : "sr-only", labelClassName)}>
          {label}
        </span>
      ) : null}
      {children}
    </span>
  );
}
