import type { ReactElement, ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface TooltipStateProps {
  /**
   * The trigger element. Base UI's `render` prop merges the tooltip wiring
   * into it, so pass the caller's real control (usually a `<button>`).
   */
  trigger: ReactElement<Record<string, unknown>>;
  /** The caller-owned tooltip copy. */
  content: ReactNode;
  /** Preferred side; Base UI flips it when there is no room. */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Delay before opening, in milliseconds. Default `0`. */
  delay?: number;
  className?: string;
  /** Extra content after the tooltip copy, e.g. a `Kbd`. */
  children?: ReactNode;
}

/**
 * TooltipState — the complete tooltip composition over the generated shadcn
 * primitives, including the required `TooltipProvider`.
 *
 * A tooltip never replaces a visible label: the trigger still needs its own
 * accessible name, because the popup is not exposed as the name. The provider
 * is mounted here so a lone tooltip cannot throw for a missing ancestor, and
 * the trigger renders through `render` so the caller keeps its real control.
 */
export default function TooltipState({
  trigger,
  content,
  side,
  align,
  delay = 0,
  className,
  children,
}: TooltipStateProps) {
  return (
    <TooltipProvider delay={delay}>
      <Tooltip>
        <TooltipTrigger render={trigger} />
        <TooltipContent side={side} align={align} className={cn(className)}>
          {content}
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
