import type { ComponentPropsWithRef } from "react";

import {
  Kbd as KbdPrimitive,
  KbdGroup as KbdGroupPrimitive,
} from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface KbdProps extends ComponentPropsWithRef<"kbd"> {
  className?: string;
}

/**
 * Kbd — a keyboard keycap over the generated shadcn `Kbd`.
 *
 * The generated component already owns the token styles; this wrapper only
 * pins the brand mono face (the keycap is a keyboard token, not body copy) and
 * keeps one shared import for the state family.
 */
export function Kbd({ className, ...props }: KbdProps) {
  return <KbdPrimitive className={cn("font-mono", className)} {...props} />;
}

/** A row of keys, e.g. `Cmd` + `K`; re-exported for one call site. */
export function KbdGroup({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return <KbdGroupPrimitive className={cn(className)} {...props} />;
}
