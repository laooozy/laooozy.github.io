import { Check, ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface LanguageItem {
  code: string;
  label: string;
  href: string;
  isCurrent: boolean;
  lang: string;
}

interface LanguageMenuProps {
  label: string;
  currentLabel: string;
  items: LanguageItem[];
}

export default function LanguageMenu({
  label,
  currentLabel,
  items,
}: LanguageMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground font-normal"
          />
        }
        aria-label={`${label}: ${currentLabel}`}
      >
        <Languages aria-hidden />
        <span>{currentLabel}</span>
        <ChevronDown aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.code}
            render={
              <a
                href={item.href}
                hrefLang={item.lang}
                lang={item.lang}
                aria-current={item.isCurrent ? "page" : undefined}
              />
            }
          >
            <span>{item.label}</span>
            {item.isCurrent && <Check className="ml-auto" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
