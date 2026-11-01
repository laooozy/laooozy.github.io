/**
 * LanguageSwitcher — store-driven, zero-redirect locale dropdown.
 *
 * Built on the generated shadcn `DropdownMenu` (base-nova, Base UI under the
 * hood): the trigger is `DropdownMenuTrigger`, the list is
 * `DropdownMenuRadioGroup` + `DropdownMenuRadioItem`. The primitive owns the
 * menu semantics — arrow-key navigation, typeahead, Escape/outside close and
 * focus return to the trigger — so this component holds no document listener.
 *
 * Hydration safety
 * ----------------
 * The trigger's label is rendered as three constant, locale-independent names
 * (`繁體中文`, `简体中文`, `English`), each in its own `[data-l]` span toggled by
 * CSS from `html[data-locale="…"]` (see `global.css`). No React value is read
 * at render time, so the server-rendered markup is identical to the first
 * client render: no hydration mismatch and no `zh-hant` flash in this control.
 * The menu itself is portal-mounted only while open, so the store-backed
 * radio selection never takes part in hydration either.
 *
 * The accessible name uses the all-locale `<T>` component (the same
 * `[data-l]` CSS toggle), so it is mismatch-free as well and the current
 * language is announced in its own `lang`.
 *
 * z-index
 * -------
 * The generated `DropdownMenuContent` hard-codes `z-50` on its Positioner,
 * which would sit under the sticky header (`--z-sticky`, 200). The content is
 * therefore composed from the same Base UI parts with the Positioner raised to
 * `--z-popover` (250); every other primitive stays the generated export.
 */

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ChevronDown, Globe } from "lucide-react";

import T from "@/components/site/T";
import {
  DropdownMenu,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/hooks/useLocale";
import { langAttr, languages, type Locale } from "@/i18n";

/** Every locale, for the CSS-toggled trigger label (order is irrelevant). */
const ALL_LOCALES: readonly Locale[] = ["zh-hant", "zh-hans", "en"];

/** Menu order, as specified: English · 繁體中文 · 簡體中文. */
const MENU_ORDER: readonly Locale[] = ["en", "zh-hant", "zh-hans"];

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/** Compact header (≤621px) makes the trigger a 44x44 icon-only control. */
const TRIGGER_CLASS =
  "inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--control-border)] bg-[var(--surface)] px-3 py-1 text-sm whitespace-nowrap text-muted-foreground backdrop-blur-[var(--glass-blur)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--control-border-strong)] hover:bg-[var(--surface-hover)] hover:text-foreground data-[popup-open]:border-[var(--control-border-strong)] data-[popup-open]:bg-[var(--accent-soft)] data-[popup-open]:text-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11 max-[621px]:size-11 max-[621px]:justify-center max-[621px]:gap-0 max-[621px]:p-0 " +
  FOCUS_RING;

const RADIO_ITEM_CLASS =
  "relative flex min-h-11 cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-3 text-sm outline-hidden select-none data-highlighted:bg-[var(--surface-hover)] data-highlighted:text-foreground data-checked:bg-[var(--accent-soft)] data-checked:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/**
 * The generated content's Positioner is fixed at `z-50`; this mirrors the
 * generated Popup styling but lifts the Positioner to the brand popover layer
 * so the menu clears the sticky header. `align="end"` keeps the menu inside
 * the viewport on the compact 320/390 layouts.
 */
function LanguageMenuContent({ children }: { children: React.ReactNode }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align="end"
        side="bottom"
        sideOffset={8}
        className="isolate z-[var(--z-popover)] outline-none"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          data-language-menu=""
          className="max-h-(--available-height) w-(--anchor-width) min-w-40 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <nav
      className="language-switcher inline-flex items-center"
      aria-labelledby="language-switcher-label"
      data-language-switcher=""
    >
      <span id="language-switcher-label" className="sr-only">
        <T k="a11y.language" />
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger className={TRIGGER_CLASS} data-language-trigger="">
          <Globe
            className="flex-none text-[var(--accent)]"
            aria-hidden="true"
            size={16}
          />
          {/* Static all-locale context: "Language" + the visible locale name is
              the trigger's accessible name, including when the label is
              visually clipped on compact screens. */}
          <span className="sr-only">
            <T k="a11y.language" />
          </span>
          <span className="max-[621px]:sr-only" data-language-label="">
            {ALL_LOCALES.map((code) => (
              <span key={code} data-l={code} lang={langAttr[code]}>
                {languages[code]}
              </span>
            ))}
          </span>
          <ChevronDown
            className="flex-none transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] data-[popup-open]:rotate-180 max-[621px]:hidden"
            aria-hidden="true"
            size={16}
          />
        </DropdownMenuTrigger>
        <LanguageMenuContent>
          <DropdownMenuRadioGroup
            value={locale}
            aria-labelledby="language-switcher-label"
            onValueChange={(next) => {
              const code = next as Locale;
              // Choosing the current locale is a no-op — no redundant writes.
              if (code !== locale) setLocale(code);
            }}
          >
            {MENU_ORDER.map((code) => (
              <DropdownMenuRadioItem
                key={code}
                value={code}
                closeOnClick
                className={RADIO_ITEM_CLASS}
                lang={langAttr[code]}
              >
                <span lang={langAttr[code]}>{languages[code]}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </LanguageMenuContent>
      </DropdownMenu>
    </nav>
  );
}
