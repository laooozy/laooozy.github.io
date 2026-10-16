/**
 * Pagefind adapter — a port over the client-side search runtime.
 *
 * Pagefind emits `/pagefind/pagefind.js` as a post-build step (it is not in
 * `src/` or `public/`), so the runtime is imported lazily and cached. The import
 * specifier is a `string`-typed variable marked `@vite-ignore`, keeping Vite from
 * trying to resolve a file that does not exist at build time and keeping
 * TypeScript from attempting module resolution.
 *
 * Search is LANGUAGE-AGNOSTIC by design: the index is built once with
 * `pagefind --force-language zh-hant`, and Pagefind's single-index fallback
 * serves every UI locale. This adapter therefore never calls `options({ language })`
 * — Pagefind's JS `options()` has no documented `language` key.
 */

/** One search hit. Structurally identical to the store's `SearchResult`. */
export interface SearchResult {
  url: string;
  title: string;
  excerpt?: string;
}

/** Raw per-result shape returned by the Pagefind runtime. */
export interface PagefindResultData {
  url: string;
  excerpt?: string;
  meta?: { title?: string };
}

/** The minimal Pagefind runtime surface this port depends on. */
export interface PagefindModule {
  search(
    query: string,
  ): Promise<{ results: Array<{ data(): Promise<PagefindResultData> }> }>;
}

/** Search port consumed by hooks; the adapter choice is injected, not known. */
export interface PagefindPort {
  /** Load (once) and return the runtime module. */
  load(): Promise<PagefindModule>;
  /** Run a query, resolving to normalised search hits. */
  search(query: string): Promise<SearchResult[]>;
}

/** Absolute path to the runtime emitted by the post-build Pagefind step. */
const PAGEFIND_PATH: string = "/pagefind/pagefind.js";

let cachedModule: Promise<PagefindModule> | null = null;

function loadPagefindModule(): Promise<PagefindModule> {
  if (!cachedModule) {
    cachedModule = import(/* @vite-ignore */ PAGEFIND_PATH)
      .then((mod) => mod as PagefindModule)
      .catch((error: unknown) => {
        // Do not cache a failed load — a later call may retry.
        cachedModule = null;
        throw error;
      });
  }
  return cachedModule;
}

function toSearchResult(data: PagefindResultData): SearchResult {
  const result: SearchResult = {
    url: data.url,
    title: data.meta?.title ?? data.url,
  };
  if (data.excerpt !== undefined) result.excerpt = data.excerpt;
  return result;
}

function toResultData(result: SearchResult): PagefindResultData {
  const data: PagefindResultData = {
    url: result.url,
    meta: { title: result.title },
  };
  if (result.excerpt !== undefined) data.excerpt = result.excerpt;
  return data;
}

/** Real adapter over the lazily-imported Pagefind runtime. */
export const pagefindAdapter: PagefindPort = {
  load: loadPagefindModule,
  async search(query) {
    const pagefind = await loadPagefindModule();
    const { results } = await pagefind.search(query);
    const data = await Promise.all(results.map((item) => item.data()));
    return data.map(toSearchResult);
  },
};

/**
 * Deterministic test double. `search` returns the canned results for any query
 * (a shallow copy, so callers cannot mutate the fixture); `load` resolves to a
 * module built from the same fixtures.
 */
export function fakePagefind(results: SearchResult[]): PagefindPort {
  const module: PagefindModule = {
    async search() {
      return {
        results: results.map((result) => ({
          data: async () => toResultData(result),
        })),
      };
    },
  };

  return {
    load: () => Promise.resolve(module),
    search: () =>
      Promise.resolve(
        results.map((result) =>
          result.excerpt === undefined
            ? { url: result.url, title: result.title }
            : { url: result.url, title: result.title, excerpt: result.excerpt },
        ),
      ),
  };
}
