/**
 * MusicLibrary — the `/music/` playlist as a hydrated React island.
 *
 * The payload is fetched through the INJECTED music port
 * (`clientDeps.adapters.music.load()`), never a direct `fetch`, so the network
 * seam stays swappable and testable. Filtering is the pure `filterSongs` from
 * `@/lib/domain/music`; the artist and organisation options come from
 * `collectArtists` / `collectOrgs`, and organisation labels are read from the
 * payload map so the UI never invents text.
 *
 * Layout: one sticky toolbar (search always visible, artist/organisation
 * selects behind a `Collapsible` disclosure on phones and inline from `md` up,
 * plus the result count), then the full list. Every song stays rendered — no
 * pagination, no hiding, no virtualizer. Off-screen rows instead opt into
 * `content-visibility: auto` with an intrinsic size, so the browser skips
 * their layout/paint while the DOM keeps the whole playlist addressable
 * (browser find, screen readers, and the Playwright row-count contract).
 *
 * Hydration safety mirrors `SiteFooter`: the store locale may differ from the
 * build-time locale on the first client render, so labels render in the default
 * locale until `mounted` flips. The data state starts `idle`, which renders the
 * loading skeleton on the server AND on the first client render — never an
 * empty or error flash — so the hydration render matches the SSR HTML.
 *
 * Every label is fixed chrome (`music.*`); song titles and artist names come
 * from the payload and are never translated. The whole section is
 * `data-pagefind-ignore` because its rows are client-rendered; the loading text
 * must never leak into the search index.
 */

import { ExternalLink, ListFilter, Music } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { useClientDeps } from "@/components/shared/ClientDepsContext";
import Cluster from "@/components/shared/layout/Cluster";
import AlertState from "@/components/shared/state/AlertState";
import EmptyState from "@/components/shared/state/EmptyState";
import SkeletonState from "@/components/shared/state/SkeletonState";
import SpinnerState from "@/components/shared/state/SpinnerState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useLocale } from "@/hooks/useLocale";
import { type Translate, useT } from "@/hooks/useT";
import { defaultLang, langAttr, t as translate } from "@/i18n";
import {
  collectArtists,
  collectOrgs,
  filterSongs,
  type MusicPayload,
  type Song,
} from "@/lib/domain/music";
import { cn } from "@/lib/utils";

import playlist from "../../../scripts/music/playlist.json";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

/** Stable empty list so the memoised option derivation never re-runs. */
const EMPTY_SONGS: readonly Song[] = [];

/** Six placeholder rows stand in for the list while the payload loads. */
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5] as const;

/** 44px hit area floor on every control, regardless of pointer. */
const CONTROL_HEIGHT = "h-11 min-h-11";

/** Shared focus treatment; the generated primitives already carry ring styles. */
const FIELD_LABEL =
  "text-[length:var(--text-xs)] font-medium text-muted-foreground";

/** Mobile-only disclosure trigger: full width, 44px tall, icon left. */
const FILTER_TRIGGER_CLASS = cn(
  "col-start-1 row-start-2 w-full justify-start gap-2 rounded-lg md:hidden",
  CONTROL_HEIGHT,
  "focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

/** One result row: a full-width anchor with a media thumb and a badge. */
const ROW_CLASS = cn(
  "song-row min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 text-foreground!",
  "hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

type Status = "idle" | "loading" | "ready" | "error";

interface FieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

/** One labelled toolbar field; the label is always visible and associated. */
function Field({ id, label, children }: FieldProps) {
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </Label>
      {children}
    </div>
  );
}

interface FilterFieldsProps {
  /** Unique id prefix: the mobile and desktop copies must not collide. */
  idPrefix: string;
  labels: { artist: string; organisation: string; all: string };
  artists: { id: string; name: string }[];
  orgs: { id: string; label: string }[];
  artistId: string;
  organisation: string;
  onArtistChange: (value: string) => void;
  onOrganisationChange: (value: string) => void;
}

/**
 * The artist and organisation selects. Rendered twice on purpose: once inside
 * the mobile `Collapsible` and once in the always-visible desktop toolbar.
 * Only one copy is displayed at a time, so the duplicate ids are prefixed and
 * the hidden copy is out of the tab order.
 */
function FilterFields({
  idPrefix,
  labels,
  artists,
  orgs,
  artistId,
  organisation,
  onArtistChange,
  onOrganisationChange,
}: FilterFieldsProps) {
  return (
    <>
      <Field id={`${idPrefix}-artist`} label={labels.artist}>
        <NativeSelect
          id={`${idPrefix}-artist`}
          data-music-artist
          value={artistId}
          onChange={(event) => onArtistChange(event.target.value)}
          className="w-full [&_select]:h-11 [&_select]:text-base md:[&_select]:text-sm"
        >
          <NativeSelectOption value="">{labels.all}</NativeSelectOption>
          {artists.map((artist) => (
            <NativeSelectOption key={artist.id} value={artist.id}>
              {artist.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field id={`${idPrefix}-org`} label={labels.organisation}>
        <NativeSelect
          id={`${idPrefix}-org`}
          data-music-org
          value={organisation}
          onChange={(event) => onOrganisationChange(event.target.value)}
          className="w-full [&_select]:h-11 [&_select]:text-base md:[&_select]:text-sm"
        >
          <NativeSelectOption value="">{labels.all}</NativeSelectOption>
          {orgs.map((org) => (
            <NativeSelectOption key={org.id} value={org.id}>
              {org.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </>
  );
}

export default function MusicLibrary() {
  const deps = useClientDeps();
  const t = useT();
  const { locale } = useLocale();
  // The toolbar sticks directly under the site header while it is visible, and
  // to the viewport top once the header has scrolled away. Both are read from
  // the one store the scroll-header client writes.
  const headerHidden = useStore(deps.store, (state) => state.headerHidden);
  const errorRef = useRef<HTMLDivElement>(null);
  // `false` on the server AND on the first client render, so the SSR HTML and
  // the hydration render are byte-identical.
  const [mounted, setMounted] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [payload, setPayload] = useState<MusicPayload | null>(null);
  const [query, setQuery] = useState("");
  const [artistId, setArtistId] = useState("");
  const [organisation, setOrganisation] = useState("");
  // Mobile-first filter disclosure. `false` on the server AND on the first
  // client render; CSS hides the trigger and shows the panel inline at `md`.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Bumping `attempt` re-runs the load effect (the retry button).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    deps.adapters.music
      .load()
      .then((next) => {
        if (cancelled) return;
        setPayload(next);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, deps]);

  const tr = mounted ? t : defaultTranslate;
  const lang = mounted ? langAttr[locale] : langAttr[defaultLang];

  const songs = payload?.songs ?? EMPTY_SONGS;
  const artists = collectArtists([...songs]);
  const orgs = payload ? collectOrgs(payload.songs, payload.organisations) : [];
  const visible = filterSongs([...songs], {
    query,
    artistId,
    org: organisation,
  });
  const orgLabels = payload?.organisations ?? {};

  const isReady = status === "ready" && payload !== null;
  const activeFilterCount =
    Number(Boolean(artistId)) + Number(Boolean(organisation));
  const countText = isReady ? tr("music.count", { count: visible.length }) : "";

  const clearFilters = () => {
    setQuery("");
    setArtistId("");
    setOrganisation("");
  };

  return (
    <section
      className="grid min-w-0 gap-(--space-4)"
      data-music-library
      data-pagefind-ignore
      lang={lang}
    >
      {/* Sticky toolbar: one band, search + filters + count. It sits under the
          sticky site header (`--z-sticky`), so it only shows at the top once
          the header has scrolled away. */}
      <div
        data-music-toolbar
        data-sticky-toolbar
        style={{ top: headerHidden ? 0 : "var(--header-height)" }}
        className={cn(
          "sticky z-[calc(var(--z-sticky)-1)] -mx-[clamp(var(--space-4),4vw,var(--space-6))]",
          "border-b border-border/60 bg-[var(--bg-base)]",
          "px-[clamp(var(--space-4),4vw,var(--space-6))] py-3",
        )}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1fr)_15rem_15rem_auto] md:items-end">
          <div className="col-span-2 min-w-0 md:col-span-1">
            <Field id="music-search" label={tr("music.searchLabel")}>
              <Input
                id="music-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tr("music.searchPlaceholder")}
                autoComplete="off"
                className={CONTROL_HEIGHT}
              />
            </Field>
          </div>

          <Collapsible
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            className="contents md:contents"
          >
            <CollapsibleTrigger
              data-music-filter-trigger
              render={
                <Button variant="outline" className={FILTER_TRIGGER_CLASS} />
              }
            >
              <ListFilter aria-hidden="true" />
              <span>{tr("music.filters")}</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {activeFilterCount}
                </Badge>
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="col-span-2 row-start-3 md:hidden">
              <div className="grid gap-3">
                <FilterFields
                  idPrefix="music-mobile"
                  labels={{
                    artist: tr("music.artistLabel"),
                    organisation: tr("music.organisationLabel"),
                    all: tr("music.all"),
                  }}
                  artists={artists}
                  orgs={orgs}
                  artistId={artistId}
                  organisation={organisation}
                  onArtistChange={setArtistId}
                  onOrganisationChange={setOrganisation}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="hidden min-w-0 md:contents">
            <FilterFields
              idPrefix="music-desktop"
              labels={{
                artist: tr("music.artistLabel"),
                organisation: tr("music.organisationLabel"),
                all: tr("music.all"),
              }}
              artists={artists}
              orgs={orgs}
              artistId={artistId}
              organisation={organisation}
              onArtistChange={setArtistId}
              onOrganisationChange={setOrganisation}
            />
          </div>

          <div className="col-start-2 row-start-2 justify-self-end md:col-start-4 md:row-start-1 md:self-end">
            {isReady && (
              <SpinnerState
                label={countText}
                data-music-count
                spinner={false}
                showLabel
                className="min-h-11 items-center font-mono text-[length:var(--text-xs)] text-muted-foreground"
              />
            )}
          </div>
        </div>
      </div>

      {status === "error" ? (
        <AlertState
          ref={errorRef}
          tabIndex={-1}
          variant="destructive"
          className="focus:outline-none"
          description={tr("music.error")}
        >
          <div className="mt-3">
            <Cluster gap={3} align="center">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 px-4"
                onClick={() => {
                  setAttempt((value) => value + 1);
                  errorRef.current?.focus();
                }}
              >
                {tr("music.retry")}
              </Button>
              <Button
                variant="link"
                className="min-h-11 px-0"
                render={
                  <a
                    href={playlist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tr("music.playlistLink")}
                    <ExternalLink data-icon="inline-end" aria-hidden="true" />
                  </a>
                }
              />
            </Cluster>
          </div>
        </AlertState>
      ) : (
        <>
          {(status === "idle" || status === "loading") && (
            <SpinnerState
              label={tr("music.loading")}
              showLabel
              className="min-h-5 text-[length:var(--text-sm)] text-muted-foreground"
            />
          )}

          {isReady && songs.length === 0 && (
            <EmptyState
              media={<Music aria-hidden="true" />}
              mediaVariant="icon"
              title={tr("music.empty")}
              action={
                <Button
                  variant="link"
                  className="min-h-11"
                  render={
                    <a
                      href={playlist.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tr("music.playlistLink")}
                      <ExternalLink data-icon="inline-end" aria-hidden="true" />
                    </a>
                  }
                />
              }
            />
          )}

          {isReady && songs.length > 0 && visible.length === 0 && (
            <EmptyState
              media={<ListFilter aria-hidden="true" />}
              mediaVariant="icon"
              title={tr("music.noResults")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 px-4"
                  onClick={clearFilters}
                >
                  {tr("music.all")}
                </Button>
              }
            />
          )}

          {isReady && visible.length > 0 && (
            <ul className="song-list m-0 grid list-none gap-(--space-2) p-0">
              {visible.map((song) => (
                <li
                  key={song.id}
                  data-music-row
                  className="song-row-item min-w-0 [contain-intrinsic-size:auto_4.5rem] [content-visibility:auto]"
                >
                  <Item
                    variant="outline"
                    className={ROW_CLASS}
                    render={
                      <a
                        href={song.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${song.title} — ${song.artist}`}
                      >
                        <ItemMedia
                          variant="image"
                          className="size-10 rounded-md"
                        >
                          <img
                            src={song.thumb}
                            alt=""
                            width="40"
                            height="40"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="size-full object-cover"
                          />
                        </ItemMedia>
                        <ItemContent className="min-w-0">
                          <ItemTitle className="max-w-full text-[length:var(--text-base)]">
                            <span className="min-w-0 truncate">
                              {song.title}
                            </span>
                          </ItemTitle>
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="min-w-0 truncate text-[length:var(--text-xs)] text-muted-foreground">
                              {song.artist}
                            </span>
                            {song.org !== null && (
                              <Badge
                                variant="outline"
                                className="max-w-full truncate text-[length:var(--text-xs)] font-normal"
                              >
                                {orgLabels[song.org] ?? song.org}
                              </Badge>
                            )}
                          </div>
                        </ItemContent>
                        <ExternalLink
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </a>
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          {status !== "ready" && (
            <ul className="song-list m-0 grid list-none gap-(--space-2) p-0">
              {SKELETON_ROWS.map((row) => (
                <li key={row} aria-hidden="true">
                  <SkeletonState className="h-[calc(3.5rem_+_2px)] rounded-xl" />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
