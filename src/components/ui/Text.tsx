import type { JSX, ReactNode } from "react";

/**
 * Text — body/label copy with token size and tone.
 *
 * Props
 *  - as?: string         element tag, default: "p"
 *  - size?: "xs" | "sm" | "base" | "lg" | "xl"   default: "base"
 *  - tone?: "default" | "muted"                  default: "default"
 *  - measure?: boolean   cap the line length at --measure (~68ch)
 *  - className?: string
 */
interface TextProps {
  as?: keyof JSX.IntrinsicElements;
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  tone?: "default" | "muted";
  measure?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function Text({
  as: Tag = "p",
  size = "base",
  tone = "default",
  measure = false,
  className,
  children,
}: TextProps) {
  return (
    <Tag
      className={[
        "text",
        `text--${size}`,
        tone === "muted" && "text--muted",
        measure && "text--measure",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
