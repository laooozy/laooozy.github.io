/**
 * SearchCommandDialog — the lazy-loaded `⌘K` command palette body.
 *
 * This module is only imported on first open (see `SearchCommand.tsx`), so
 * `cmdk`, the Base UI dialog primitives and the Pagefind hook stay out of the
 * initial bundle. It is a view over the single client store: `useSearch`
 * supplies the open/query/status/results slice and drives the debounced
 * Pagefind query loop through the injected port.
 *
 * Behaviour:
 *  - empty query -> recent searches (via the injected `StoragePort`) and quick
 *    links (`About`, `Blog`, `Music`, `Links`; never Photography);
 *  - a query -> Pagefind results grouped into Posts / Music / Pages, with an
 *    `aria-live` result count;
 *  - searching / empty / error states, the error offering a retry;
 *  - cmdk keyboard navigation (Arrow keys, Home/End, Enter), Base UI focus
 *    trap, Escape to close and focus returned to the last focused element;
 *  - a full-screen, 44px-target dialog at 390 and a centred panel from `sm`.
 *
 * Recents live in the single store and are persisted through the injected
 * `StoragePort` by `useSearch`; this view only reads the list and asks the hook
 * to record or clear it.
 *
 * The dialog is composed from Base UI's Dialog parts directly (not the generated
 * `DialogContent`) because that wrapper pins its overlay to `z-50`, which the
 * sticky header (`--z-sticky`) would cover. The parts let the backdrop and popup
 * use the brand's `--z-modal-backdrop` / `--z-modal` scale instead.
 */

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { History, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";

import { useClientDeps } from "@/components/shared/ClientDepsContext";
import AlertState from "@/components/shared/state/AlertState";
import SpinnerState from "@/components/shared/state/SpinnerState";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";
import {
  createSearchEngine,
  type SearchEngine,
  useSearch,
} from "@/hooks/useSearch";
import type { SearchResult } from "@/store/types";

type ResultGroup = "blog" | "music" | "pages";

const GROUP_ORDER: readonly ResultGroup[] = ["blog", "music", "pages"];

const GROUP_HEADING_KEY: Record<ResultGroup, string> = {
  blog: "search.group.blog",
  music: "search.group.music",
  pages: "search.group.pages",
};

/** Quick links shown for an empty query. Photography is deliberately absent. */
const QUICK_LINKS = [
  { href: "/#about", key: "nav.about" },
  { href: "/blog/", key: "nav.blog" },
  { href: "/music/", key: "search.group.music" },
  { href: "/links/", key: "nav.usefulLink" },
] as const;

/** Which result group a Pagefind URL belongs to. */
function groupFor(url: string): ResultGroup {
  let path = url;
  try {
    path = new URL(url, "https://site.invalid").pathname;
  } catch {
    // Not a parsable URL: fall back to the raw value.
  }
  if (path === "/blog" || path.startsWith("/blog/")) return "blog";
  if (path === "/music" || path.startsWith("/music/")) return "music";
  return "pages";
}

interface CommandLinkProps {
  href: string;
  value: string;
  onActivate: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * One navigable command row.
 *
 * `asChild` is not usable on the generated `CommandItem` (it appends a trailing
 * check icon, so Radix Slot sees two children), so the real anchor lives next to
 * the item, visually hidden. cmdk's Enter/click path fires `onSelect`, which
 * activates that anchor; a plain pointer click follows the same path, so mouse
 * and keyboard share one activation.
 */
function CommandLink({
  href,
  value,
  onActivate,
  className,
  children,
}: CommandLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const activate = () => {
    onActivate();
    linkRef.current?.click();
  };

  return (
    <>
      <a
        ref={linkRef}
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        data-search-navigation-target=""
      >
        {href}
      </a>
      <CommandItem
        value={value}
        onSelect={activate}
        className={className}
        data-search-result=""
      >
        {children}
      </CommandItem>
    </>
  );
}

interface SearchCommandDialogProps {
  /** Mirrors the store's `search.open` flag (owned by `SearchCommand`). */
  open: boolean;
}

export default function SearchCommandDialog({
  open,
}: SearchCommandDialogProps) {
  const deps = useClientDeps();
  const { t } = useHydrationSafeT();
  const {
    query,
    status,
    results,
    recent,
    closeSearch,
    setQuery,
    recordRecent,
    clearRecent,
  } = useSearch();

  const inputRef = useRef<HTMLInputElement>(null);
  const retryEngineRef = useRef<SearchEngine | null>(null);

  const isBlank = query.trim() === "";

  // The retry engine is separate from the hook's loop: a failed query leaves
  // the store in `error`, and re-running the same string needs a nudge.
  useEffect(
    () => () => {
      retryEngineRef.current?.dispose();
    },
    [],
  );

  const retry = useCallback(() => {
    if (retryEngineRef.current === null) {
      retryEngineRef.current = createSearchEngine(deps);
    }
    retryEngineRef.current.run(query);
  }, [deps, query]);

  const activateResult = useCallback(() => {
    recordRecent(query);
    closeSearch();
  }, [closeSearch, query, recordRecent]);

  const grouped: Record<ResultGroup, SearchResult[]> = {
    blog: [],
    music: [],
    pages: [],
  };
  for (const result of results) grouped[groupFor(result.url)].push(result);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) closeSearch();
    },
    [closeSearch],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="dialog-overlay"
          className="fixed inset-0 isolate z-[var(--z-modal-backdrop)] bg-black/55 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          data-slot="command-dialog"
          data-pagefind-ignore
          initialFocus={inputRef}
          finalFocus
          className="fixed top-0 right-0 left-0 z-[var(--z-modal)] grid h-dvh max-w-none translate-x-0 translate-y-0 gap-4 overflow-hidden rounded-none bg-popover p-0 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:top-1/3 sm:right-auto sm:left-1/2 sm:h-auto sm:max-h-[70vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:rounded-xl sm:pt-0 sm:pb-0 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <DialogPrimitive.Title className="sr-only">
            {t("search.title")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t("search.hint")}
          </DialogPrimitive.Description>

          <Command
            shouldFilter={false}
            label={t("search.title")}
            className="h-full rounded-none! bg-transparent p-0 sm:h-auto"
          >
            <div className="flex items-start gap-1 p-1 pb-0">
              <div className="min-w-0 flex-1 [&_[data-slot=input-group]]:h-11! sm:[&_[data-slot=input-group]]:h-9!">
                <CommandInput
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t("search.placeholder")}
                  aria-label={t("search.placeholder")}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="min-h-11 text-base sm:min-h-9 sm:text-sm"
                />
              </div>
              <DialogPrimitive.Close
                data-slot="dialog-close"
                aria-label={t("search.close")}
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-1 min-h-11 min-w-11 shrink-0 text-muted-foreground"
                  />
                }
              >
                <X aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>

            {status === "error" ? (
              <AlertState
                variant="destructive"
                className="mx-2 my-1"
                description={t("search.error")}
                action={
                  <Button variant="outline" size="sm" onClick={retry}>
                    {t("search.retry")}
                  </Button>
                }
              />
            ) : status === "searching" ? (
              <SpinnerState
                className="px-2 py-1 text-xs text-muted-foreground"
                label={t("search.searching")}
                showLabel
              />
            ) : status === "results" ? (
              <SpinnerState
                spinner={false}
                className="px-2 py-1 text-xs text-muted-foreground"
                label={t("search.resultCount", { count: results.length })}
                showLabel
              />
            ) : isBlank ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                {t("search.hint")}
              </p>
            ) : null}

            <CommandList
              label={t("search.results")}
              className="max-h-none min-h-0 flex-1 pb-2 sm:max-h-[min(60vh,32rem)] sm:flex-none"
            >
              {isBlank ? (
                <>
                  {recent.length > 0 ? (
                    <CommandGroup heading={t("search.recent")}>
                      {recent.map((entry) => (
                        <CommandItem
                          key={entry}
                          value={`recent:${entry}`}
                          onSelect={() => setQuery(entry)}
                          className="min-h-11"
                        >
                          <History aria-hidden="true" />
                          <span className="truncate">{entry}</span>
                        </CommandItem>
                      ))}
                      <CommandItem
                        value="recent:clear"
                        onSelect={clearRecent}
                        className="min-h-11 text-muted-foreground"
                      >
                        <X aria-hidden="true" />
                        <span>{t("search.clearRecent")}</span>
                      </CommandItem>
                    </CommandGroup>
                  ) : null}
                  <CommandGroup heading={t("search.quickLinks")}>
                    {QUICK_LINKS.map((link) => (
                      <CommandLink
                        key={link.href}
                        href={link.href}
                        value={`quick:${link.href}`}
                        onActivate={closeSearch}
                        className="min-h-11"
                      >
                        <span>{t(link.key)}</span>
                      </CommandLink>
                    ))}
                  </CommandGroup>
                </>
              ) : (
                <>
                  {status === "empty" ? (
                    <CommandEmpty className="py-8 text-sm text-muted-foreground">
                      {t("search.noResults")}
                    </CommandEmpty>
                  ) : null}
                  {GROUP_ORDER.map((group) => {
                    const items = grouped[group];
                    if (items.length === 0) return null;
                    return (
                      <CommandGroup
                        key={group}
                        heading={t(GROUP_HEADING_KEY[group])}
                      >
                        {items.map((item) => (
                          <CommandLink
                            key={item.url}
                            href={item.url}
                            value={`result:${item.url}`}
                            onActivate={activateResult}
                            className="min-h-11 items-start"
                          >
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate font-medium">
                                {item.title || item.url}
                              </span>
                              {item.excerpt ? (
                                <span
                                  className="line-clamp-1 text-xs text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-[var(--accent-soft)] [&_mark]:px-0.5 [&_mark]:text-[var(--text)]"
                                  // Pagefind only entity-encodes and wraps
                                  // matches in <mark>, so it is documented safe.
                                  dangerouslySetInnerHTML={{
                                    __html: item.excerpt,
                                  }}
                                />
                              ) : null}
                            </span>
                          </CommandLink>
                        ))}
                      </CommandGroup>
                    );
                  })}
                </>
              )}
            </CommandList>
          </Command>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
