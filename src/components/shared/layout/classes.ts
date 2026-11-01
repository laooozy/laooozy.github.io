/**
 * Static Tailwind class maps for the shared layout primitives.
 *
 * Every value is a COMPLETE class string so Tailwind's scanner can see it at
 * build time. Never build a class with interpolation (`gap-${n}`): those never
 * reach the generated stylesheet.
 *
 * Gaps use the `gap-(--space-N)` form so the rendered spacing stays tied to
 * the one spacing scale in `tokens.css`; the hand-written `--space-N` values
 * are not the same as Tailwind's default numeric scale past step 4.
 */

export const GAP_CLASSES = {
  1: "gap-(--space-1)",
  2: "gap-(--space-2)",
  3: "gap-(--space-3)",
  4: "gap-(--space-4)",
  5: "gap-(--space-5)",
  6: "gap-(--space-6)",
  7: "gap-(--space-7)",
  8: "gap-(--space-8)",
  9: "gap-(--space-9)",
  10: "gap-(--space-10)",
  11: "gap-(--space-11)",
  12: "gap-(--space-12)",
} as const;

export type Gap = keyof typeof GAP_CLASSES;

export const STACK_ALIGN_CLASSES = {
  stretch: "items-stretch",
  start: "items-start",
  center: "items-center",
} as const;

export type StackAlign = keyof typeof STACK_ALIGN_CLASSES;

export const CLUSTER_ALIGN_CLASSES = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
} as const;

export type ClusterAlign = keyof typeof CLUSTER_ALIGN_CLASSES;

export const JUSTIFY_CLASSES = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

export type Justify = keyof typeof JUSTIFY_CLASSES;

export const COLUMN_CLASSES = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12",
} as const;

export type Columns = keyof typeof COLUMN_CLASSES;

/**
 * Fluid auto-fit tracks for a minimum card width. `minmax(min(100%, …), 1fr)`
 * keeps a single card from overflowing a 320px viewport while still reflowing
 * with no breakpoints. Tailwind has no utility for auto-fit, so each supported
 * width is a complete static arbitrary class.
 */
export const GRID_MIN_CLASSES = {
  "12rem": "grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]",
  "14rem": "grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]",
  "16rem": "grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))]",
  "17rem": "grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))]",
  "18rem": "grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]",
  "19rem": "grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))]",
  "20rem": "grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))]",
  "24rem": "grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))]",
} as const;

export type GridMin = keyof typeof GRID_MIN_CLASSES;

export const CONTAINER_SIZE_CLASSES = {
  default: "max-w-(--container)",
  narrow: "max-w-(--container-narrow)",
} as const;

export type ContainerSize = keyof typeof CONTAINER_SIZE_CLASSES;

/**
 * Coarse-pointer floor for an interactive primitive. The generated shadcn
 * Button sizes are 28-36px tall, so a layout primitive that IS the control
 * (an `a` or `button`) must grow its own hit area to the 44px WCAG target.
 */
export const INTERACTIVE_TOUCH_CLASSES =
  "pointer-coarse:min-h-11 pointer-coarse:min-w-11";
