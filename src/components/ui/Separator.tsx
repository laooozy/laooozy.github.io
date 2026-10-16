/**
 * Separator — a hairline rule.
 *
 * Props
 *  - orientation?: "horizontal" | "vertical"   default: "horizontal"
 *  - className?: string
 *
 * Horizontal renders an <hr>; vertical renders a full-height 1px divider for
 * use inside a flex row.
 */
interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export default function Separator({
  orientation = "horizontal",
  className,
}: SeparatorProps) {
  if (orientation === "horizontal") {
    return (
      <hr
        className={["separator", "separator--horizontal", className]
          .filter(Boolean)
          .join(" ")}
      />
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={["separator", "separator--vertical", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
