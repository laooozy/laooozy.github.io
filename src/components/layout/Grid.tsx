import type { CSSProperties, JSX, ReactNode } from "react";

/**
 * Grid — responsive 2D flow.
 *
 * Props
 *  - min?: string       minimum track width, default: "16rem". Produces
 *                       `repeat(auto-fit, minmax(min(100%, <min>), 1fr))` so
 *                       the grid reflows with NO breakpoints.
 *  - gap?: 1..12        default: 5
 *  - columns?: number   force an exact column count (skips auto-fit)
 *  - as?: string        element tag, default: "div"
 *  - className?: string
 *
 * Use for card collections. For one wrapping line, reach for Cluster instead.
 */
interface GridProps {
  min?: string;
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  columns?: number;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children?: ReactNode;
}

export default function Grid({
  min = "16rem",
  gap = 5,
  columns,
  as: Tag = "div",
  className,
  children,
}: GridProps) {
  const template = columns
    ? `repeat(${columns}, minmax(0, 1fr))`
    : `repeat(auto-fit, minmax(min(100%, ${min}), 1fr))`;

  return (
    <Tag
      className={["grid", className].filter(Boolean).join(" ")}
      style={
        {
          "--grid-gap": `var(--space-${gap})`,
          "--grid-template": template,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
