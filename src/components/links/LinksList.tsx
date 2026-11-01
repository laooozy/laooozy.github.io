import { ArrowUpRight } from "lucide-react";

import { GRID_MIN_CLASSES } from "@/components/shared/layout/classes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UsefulLink } from "@/lib/domain/links";
import { cn } from "@/lib/utils";

export interface LinksListProps {
  links: readonly UsefulLink[];
  className?: string;
}

/** `github.com` from `https://github.com/…`, with `www.` dropped. */
function hostOf(href: string): string {
  return new URL(href).hostname.replace(/^www\./u, "");
}

/**
 * LinksList — the `/links/` card list.
 *
 * A server-rendered React view over the records parsed from the Markdown file;
 * it holds no state and never hydrates. Each card shows the authored label and
 * note and ONE action, the host button, so the card has a single tab stop and
 * there is no duplicate link target.
 *
 * Every text run uses `break-keep wrap-anywhere`: CJK compounds stay whole when
 * the line wraps at punctuation, while an unbroken URL or a very long run can
 * still break inside itself instead of overflowing at 320px.
 */
export default function LinksList({ links, className }: LinksListProps) {
  if (links.length === 0) return null;

  return (
    <ul
      data-links-list
      className={cn(
        "m-0 grid list-none gap-(--space-4) p-0",
        GRID_MIN_CLASSES["18rem"],
        className,
      )}
    >
      {links.map((link) => {
        const host = hostOf(link.href);

        return (
          <li key={`${link.href}-${link.label}`} className="min-w-0">
            <Card data-link-card className="h-full">
              <CardHeader>
                <CardTitle className="text-base leading-snug wrap-anywhere break-keep text-foreground">
                  {link.label}
                </CardTitle>
                {link.note ? (
                  <CardDescription className="wrap-anywhere break-keep">
                    {link.note}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardFooter className="mt-auto justify-end">
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-11 max-w-full rounded-full px-4"
                  render={
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="wrap-anywhere break-keep">{host}</span>
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  }
                />
              </CardFooter>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
