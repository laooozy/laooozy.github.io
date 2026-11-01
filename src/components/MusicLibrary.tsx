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

import { useEffect, useRef, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import AlertState from "@/components/shared/state/AlertState";
import SkeletonState from "@/components/shared/state/SkeletonState";
import SpinnerState from "@/components/shared/state/SpinnerState";
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

import playlist from "../../scripts/music/playlist.json";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

/** Stable empty list so the memoised option derivation never re-runs. */
const EMPTY_SONGS: readonly Song[] = [];

/** Six placeholder rows stand in for the list while the payload loads. */
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5] as const;

type Status = "idle" | "loading" | "ready" | "error";

const MUSIC_CSS = `
.music-library {
	display: grid;
	gap: var(--space-5);
	color-scheme: dark;
}

.music-toolbar {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: var(--space-3);
	align-items: end;
}

.music-field {
	display: grid;
	gap: var(--space-1);
	min-inline-size: 0;
}

.music-filter-toggle {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	min-block-size: 44px;
	padding: var(--space-2) var(--space-3);
	border: 1px solid var(--control-border);
	border-radius: var(--radius-md);
	background-color: var(--surface);
	color: var(--text);
	font-family: var(--font-body);
	font-size: var(--text-sm);
	font-weight: 500;
	cursor: pointer;
	transition:
		background-color var(--dur-fast) var(--ease-out),
		border-color var(--dur-fast) var(--ease-out);
}

.music-filter-toggle:hover {
	background: var(--accent-surface);
	border-color: var(--control-border-strong);
}

.music-filter-toggle:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.music-filter-count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-inline-size: 1.25rem;
	padding-inline: var(--space-1);
	border-radius: var(--radius-pill);
	background: var(--accent-surface);
	color: var(--accent-text);
	font-size: var(--text-xs);
	line-height: 1.5;
}

.music-filters {
	display: none;
	grid-template-columns: minmax(0, 1fr);
	gap: var(--space-3);
	min-inline-size: 0;
}

.music-filters[data-open="true"] {
	display: grid;
}

.music-select-wrap {
	position: relative;
	display: block;
	min-inline-size: 0;
}

.music-select-wrap::after {
	content: "▾";
	position: absolute;
	inset-inline-end: var(--space-3);
	inset-block-start: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	color: var(--text-muted);
	font-size: var(--text-xs);
}

.music-field__label {
	font-size: var(--text-xs);
	color: var(--text-muted);
	font-weight: 500;
}

.music-input,
.music-select {
	inline-size: 100%;
	max-inline-size: 100%;
	min-inline-size: 0;
	min-block-size: 44px;
	padding: var(--space-2) var(--space-3);
	border: 1px solid var(--control-border);
	border-radius: var(--radius-md);
	background-color: var(--surface);
	color: var(--text);
	font-family: var(--font-body);
	font-size: var(--text-sm);
}

.music-select {
	appearance: none;
	-webkit-appearance: none;
	padding-inline-end: calc(var(--space-6) + var(--space-2));
}

.music-select option {
	background-color: var(--surface);
	color: var(--text);
}

.music-input::placeholder {
	color: var(--text-muted);
}

.music-input:focus-visible,
.music-select:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.music-status {
	margin: 0;
	min-block-size: 1.5em;
	color: var(--text-muted);
	font-size: var(--text-sm);
}

/* Programmatic, non-interactive focus target: never draw a focus ring. */
.music-status:focus {
	outline: none;
}

.music-error-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-3);
}

.music-retry {
	min-block-size: 44px;
	padding: var(--space-2) var(--space-4);
	border: 1px solid var(--control-border);
	border-radius: var(--radius-pill);
	background: var(--surface);
	color: var(--text);
	font-family: var(--font-body);
	font-size: var(--text-sm);
	font-weight: 500;
	cursor: pointer;
	transition:
		background-color var(--dur-fast) var(--ease-out),
		border-color var(--dur-fast) var(--ease-out);
}

.music-retry:hover {
	background: var(--accent-surface);
	border-color: var(--control-border-strong);
}

.music-retry:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.music-playlist {
	color: var(--accent-text);
	font-size: var(--text-sm);
	text-decoration: underline;
	text-underline-offset: 3px;
}

.music-playlist:hover {
	color: var(--text);
}

.music-playlist:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.song-list {
	display: grid;
	gap: var(--space-2);
	margin: 0;
	padding: 0;
	list-style: none;
}

.song-row {
	position: relative;
	display: grid;
	grid-template-columns: 40px minmax(0, 1fr);
	align-items: center;
	gap: var(--space-3);
	padding: var(--space-3) var(--space-4);
	border: 1px solid var(--glass-border);
	border-radius: var(--radius-md);
	background-color: var(--surface);
	background-image: var(--card-bg);
	box-shadow: var(--card-inset), 0 0 18px -10px var(--accent);
	color: var(--text);
	text-decoration: none;
	transition:
		border-color var(--dur-fast) var(--ease-out),
		box-shadow var(--dur-fast) var(--ease-out);
}

.song-row::before,
.song-row::after {
	content: "";
	position: absolute;
	inline-size: 12px;
	block-size: 20px;
	background: var(--accent);
	clip-path: polygon(55% 0, 100% 0, 62% 42%, 92% 42%, 30% 100%, 44% 55%, 12% 55%);
	filter: drop-shadow(0 0 6px var(--accent));
	pointer-events: none;
}

.song-row::before {
	inset-block-start: -1px;
	inset-inline-start: -1px;
}

.song-row::after {
	inset-block-end: -1px;
	inset-inline-end: -1px;
	transform: rotate(180deg);
}

.song-row:hover,
.song-row:focus-visible {
	border-color: var(--accent);
	box-shadow: var(--card-inset), 0 0 24px -8px var(--accent);
}

.song-row:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

@keyframes song-scroll-fade {
	0% {
		opacity: 0;
	}
	16% {
		opacity: 1;
	}
	84% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

@media (prefers-reduced-motion: no-preference) {
	@supports (animation-timeline: view()) {
		.song-row {
			animation: song-scroll-fade linear both;
			animation-timeline: view();
			animation-range: cover 0% cover 100%;
		}
	}
}

.song-row__logo {
	inline-size: 40px;
	block-size: 40px;
	border-radius: var(--radius-sm);
	object-fit: cover;
}

.song-row__text {
	display: grid;
	gap: 2px;
	min-inline-size: 0;
}

.song-row__title {
	font-size: var(--text-base);
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.song-row__artist {
	font-size: var(--text-xs);
	color: var(--text-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
	.song-row {
		transition: none;
		animation: none;
	}
}

@media (min-width: 48rem) {
	.music-toolbar {
		grid-template-columns: minmax(0, 1fr) repeat(2, minmax(0, 15rem));
		align-items: end;
	}

	.music-filter-toggle {
		display: none;
	}

	.music-filters {
		display: contents;
	}
}

@media (max-width: 30rem) {
	.music-input,
	.music-select {
		font-size: 16px;
	}

	.song-row__title,
	.song-row__artist {
		overflow: visible;
		white-space: normal;
	}
}
`;

export default function MusicLibrary() {
  const t = useT(clientDeps);
  const { locale } = useLocale(clientDeps);
  const statusRef = useRef<HTMLParagraphElement>(null);
  // `false` on the server AND on the first client render, so the SSR HTML and
  // the hydration render are byte-identical.
  const [mounted, setMounted] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [payload, setPayload] = useState<MusicPayload | null>(null);
  const [query, setQuery] = useState("");
  const [artistId, setArtistId] = useState("");
  const [organisation, setOrganisation] = useState("");
  // Mobile-first filter panel. `false` on the server AND on the first client
  // render; CSS hides it below 48rem and shows it inline above.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Bumping `attempt` re-runs the load effect (the retry button).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    clientDeps.adapters.music
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
  }, [attempt]);

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

  const isReady = status === "ready" && payload !== null;
  const statusText = isReady
    ? songs.length === 0
      ? tr("music.empty")
      : visible.length === 0
        ? tr("music.noResults")
        : tr("music.count", { count: visible.length })
    : status === "error"
      ? tr("music.error")
      : "";

  return (
    <section className="music-library" data-pagefind-ignore lang={lang}>
      <style dangerouslySetInnerHTML={{ __html: MUSIC_CSS }} />

      <div className="music-toolbar">
        <div className="music-field">
          <label className="music-field__label" htmlFor="music-search">
            {tr("music.searchLabel")}
          </label>
          <input
            id="music-search"
            className="music-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr("music.searchPlaceholder")}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          className="music-filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls="music-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {tr("music.filters")}
          {artistId || organisation ? (
            <span className="music-filter-count">
              {Number(Boolean(artistId)) + Number(Boolean(organisation))}
            </span>
          ) : null}
        </button>
        <div
          id="music-filters"
          className="music-filters"
          data-open={filtersOpen}
        >
          <div className="music-field">
            <label className="music-field__label" htmlFor="music-artist">
              {tr("music.artistLabel")}
            </label>
            <span className="music-select-wrap">
              <select
                id="music-artist"
                className="music-select"
                value={artistId}
                onChange={(event) => setArtistId(event.target.value)}
              >
                <option value="">{tr("music.all")}</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </span>
          </div>
          <div className="music-field">
            <label className="music-field__label" htmlFor="music-org">
              {tr("music.organisationLabel")}
            </label>
            <span className="music-select-wrap">
              <select
                id="music-org"
                className="music-select"
                value={organisation}
                onChange={(event) => setOrganisation(event.target.value)}
              >
                <option value="">{tr("music.all")}</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.label}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>
      </div>

      <div className="music-status" ref={statusRef} tabIndex={-1}>
        {status === "error" ? (
          <AlertState variant="destructive" description={statusText} />
        ) : (
          <SpinnerState
            label={
              status === "idle" || status === "loading"
                ? tr("music.loading")
                : statusText
            }
            showLabel={status !== "idle" && status !== "loading"}
            spinner={status === "idle" || status === "loading"}
          />
        )}
      </div>

      {isReady && songs.length === 0 && (
        <p>
          <a
            className="music-playlist"
            href={playlist.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr("music.playlistLink")}
          </a>
        </p>
      )}

      {status === "error" && (
        <div className="music-error-actions">
          <button
            type="button"
            className="music-retry"
            onClick={() => {
              setAttempt((value) => value + 1);
              statusRef.current?.focus();
            }}
          >
            {tr("music.retry")}
          </button>
          <a
            className="music-playlist"
            href={playlist.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr("music.playlistLink")}
          </a>
        </div>
      )}

      {isReady ? (
        <ul className="song-list">
          {visible.map((song) => (
            <li key={song.id}>
              <a
                className="song-row"
                href={song.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  className="song-row__logo"
                  src={song.thumb}
                  alt=""
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <span className="song-row__text">
                  <span className="song-row__title">{song.title}</span>
                  <span className="song-row__artist">{song.artist}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : status === "error" ? null : (
        <ul className="song-list" aria-hidden="true">
          {SKELETON_ROWS.map((row) => (
            <li key={row}>
              <SkeletonState className="h-[calc(40px_+_2*var(--space-3)_+_2px)]" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
