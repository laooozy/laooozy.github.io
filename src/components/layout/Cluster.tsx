import type { CSSProperties, JSX, ReactNode } from "react";

/**
 * Cluster — 1D horizontal flow that wraps, with a token gap.
 *
 * Props
 *  - gap?: 1..12        default: 3
 *  - align?: "start" | "center" | "end" | "baseline"   default: "center"
 *  - justify?: "start" | "center" | "end" | "between"   default: "start"
 *  - as?: keyof JSX.IntrinsicElements   element tag, default: "div"
 *  - className?: string
 *
 * Ideal for tag rows, meta rails and link rows. Use `justify="between"` for a
 * heading + action pair. Prefer this over Grid when the layout is one line that
 * simply needs to wrap on small screens.
 */
interface ClusterProps {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  align?: "start" | "center" | "end" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children?: ReactNode;
}

export default function Cluster({
  gap = 3,
  align = "center",
  justify = "start",
  as: Tag = "div",
  className,
  children,
}: ClusterProps) {
  const justifyValue =
    justify === "between"
      ? "space-between"
      : justify === "center"
        ? "center"
        : justify === "end"
          ? "flex-end"
          : "flex-start";

  return (
    <Tag
      className={["cluster", className].filter(Boolean).join(" ")}
      style={
        {
          "--cluster-gap": `var(--space-${gap})`,
          "--cluster-align": align,
          "--cluster-justify": justifyValue,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
