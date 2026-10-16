import type { CSSProperties, JSX, ReactNode } from "react";

/**
 * Stack — 1D vertical flow with a token gap.
 *
 * Props
 *  - gap?: 1..12        default: 4  → gap: var(--space-N)
 *  - as?: string        element tag, default: "div" (e.g. "ul", "section")
 *  - align?: "stretch" | "start" | "center"   default: "stretch"
 *  - className?: string
 *
 * Default slot: the stacked children. Use it to set rhythm inside a card or a
 * section body without touching margins.
 */
interface StackProps {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  as?: keyof JSX.IntrinsicElements;
  align?: "stretch" | "start" | "center";
  className?: string;
  children?: ReactNode;
}

export default function Stack({
  gap = 4,
  as: Tag = "div",
  align = "stretch",
  className,
  children,
}: StackProps) {
  return (
    <Tag
      className={["stack", className].filter(Boolean).join(" ")}
      style={
        {
          "--stack-gap": `var(--space-${gap})`,
          "--stack-align": align,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
