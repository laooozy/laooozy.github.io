import type { CSSProperties, ReactNode } from "react";

/**
 * Container — the centered content column.
 *
 * Props
 *  - size?: "default" | "narrow" | "wide"   default: "default"
 *      default → var(--container) (72rem), narrow → var(--container-narrow)
 *      (46rem, for prose walls), wide → 84rem (for future full-bleed grids)
 *  - className?: string                          extra classes on the wrapper
 *
 * Renders a `div` that centres its content and owns the horizontal gutter.
 * BaseLayout wraps `<main>` in it, so pages inside a layout must NOT nest a
 * second Container (that would double the gutter).
 */
interface ContainerProps {
  size?: "default" | "narrow" | "wide";
  className?: string;
  children?: ReactNode;
}

export default function Container({
  size = "default",
  className,
  children,
}: ContainerProps) {
  const maxWidth =
    size === "narrow"
      ? "var(--container-narrow)"
      : size === "wide"
        ? "84rem"
        : "var(--container)";

  return (
    <div
      className={["container", className].filter(Boolean).join(" ")}
      style={{ "--container-max": maxWidth } as CSSProperties}
    >
      {children}
    </div>
  );
}
