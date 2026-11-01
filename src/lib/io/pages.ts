/**
 * MDX page I/O edge.
 *
 * The ONE place the page route shells reach `astro:content` (together with
 * `posts.ts` for the blog collection). Route shells under `src/pages/` stay
 * thin: they hand an id to `renderPage` (or take the already-loaded blog entry
 * and hand it to `renderPost`) and receive plain rendered content plus the
 * entry frontmatter. Keeping the content module behind this edge is what makes
 * the architecture test's "`astro:content` only in `src/lib/io/**`" rule
 * absolute instead of carving out route-shell exceptions.
 *
 * This module runs at BUILD time only. It must never be imported from a
 * hydrated island (the existing `client-io-guard` test enforces that).
 */
import type { CollectionEntry } from "astro:content";
import { getEntry, render } from "astro:content";

import type { Post } from "../domain/posts";

/** The whole-page MDX entries authored in `src/content/pages/*.mdx`. */
export type PageId = "home" | "photographer" | "music";

/** A rendered MDX page: frontmatter for the shell/metadata plus its body. */
export interface RenderedPage {
  entry: CollectionEntry<"pages">;
  Content: Awaited<ReturnType<typeof render>>["Content"];
}

/**
 * Load and render one MDX page entry. A missing entry is a build-time error:
 * the route names the exact file the author must create.
 */
export async function renderPage(id: PageId): Promise<RenderedPage> {
  const entry = await getEntry("pages", id);
  if (!entry) {
    throw new Error(`Missing pages entry: src/content/pages/${id}.mdx`);
  }
  const { Content } = await render(entry);
  return { entry, Content };
}

/** Load the single hand-authored links entry (`src/content/links/index.md`). */
export async function getLinksEntry(): Promise<CollectionEntry<"links">> {
  const entry = await getEntry("links", "index");
  if (!entry) {
    throw new Error("Missing links entry: src/content/links/index.md");
  }
  return entry;
}

/** Render an already-loaded blog post body at build time. */
export async function renderPost(
  post: Post,
): Promise<Awaited<ReturnType<typeof render>>["Content"]> {
  const { Content } = await render(post);
  return Content;
}
