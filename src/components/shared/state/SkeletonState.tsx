import type { ComponentPropsWithRef, ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export interface SkeletonStateProps extends ComponentPropsWithRef<"div"> {
  /** Optional content; without it the block is a single shimmer bar. */
  children?: ReactNode;
}

/**
 * SkeletonState — a decorative loading placeholder over the generated shadcn
 * `Skeleton`.
 *
 * A skeleton is never the accessible status by itself: it is hidden from the
 * accessibility tree and the caller pairs it with `SpinnerState` (or another
 * live region) that carries the loading copy. `className` controls its box, so
 * a list row passes the row height instead of inventing a second skeleton.
 */
export default function SkeletonState({
  className,
  children,
  ...props
}: SkeletonStateProps) {
  return (
    <Skeleton className={className} aria-hidden="true" {...props}>
      {children}
    </Skeleton>
  );
}
