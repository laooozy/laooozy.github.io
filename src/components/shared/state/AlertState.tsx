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
      {children}
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  );
}
