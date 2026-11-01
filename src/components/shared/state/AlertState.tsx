import type { ComponentPropsWithRef, ReactNode } from "react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface AlertStateProps extends Omit<
  ComponentPropsWithRef<"div">,
  "title"
> {
  /** Headline copy; the caller owns the string. */
  title?: ReactNode;
  /** The full error or notice text; the caller owns the string. */
  description?: ReactNode;
  /** A trailing control, positioned in the generated action slot. */
  action?: ReactNode;
  /** Optional leading glyph. */
  icon?: ReactNode;
  variant?: "default" | "destructive";
  className?: string;
  /** Extra content rendered under the description. */
  children?: ReactNode;
}

/**
 * AlertState — a notice or error, composed from the generated shadcn `Alert`.
 *
 * The generated `Alert` already carries `role="alert"`, so an error is
 * announced assertively without the caller repeating ARIA markup. Copy and
 * controls stay in the caller.
 */
export default function AlertState({
  title,
  description,
  action,
  icon,
  variant = "default",
  className,
  children,
  ...props
}: AlertStateProps) {
  return (
    <Alert variant={variant} className={cn(className)} {...props}>
      {icon}
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {description ? <AlertDescription>{description}</AlertDescription> : null}
      {children ? (
        <div
          data-slot="alert-children"
          className={cn(
            "min-w-0",
            // The generated Alert switches to `auto 1fr` when it has a direct
            // svg icon. Without this, a wide child is auto-placed in the icon
            // column and pushes the title/description off-screen. Spanning the
            // full row keeps any caller-owned controls under the copy.
            "group-has-[>svg]/alert:col-span-full",
          )}
        >
          {children}
        </div>
      ) : null}
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  );
}
