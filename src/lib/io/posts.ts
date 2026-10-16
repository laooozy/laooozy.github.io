/**
 * Blog post I/O edge.
 *
 * The only place the blog knows about `astro:content`. It loads the collection
 * and hands back plain domain data; all sorting/formatting/paths live in the
 * pure domain module (`../domain/posts`).
 */
import { getCollection } from "astro:content";
import type { Post } from "../domain/posts";

/**
 * Per-build memo of the in-flight collection promise. A module-level binding
 * (never `globalThis`) is correct here: Astro gives every build a fresh module
 * graph, so the cache is scoped to a single build and starts empty each time.
 * Caching the promise means concurrent callers share one `getCollection` call
 * and the same resolved array reference.
 */
let cached: Promise<Post[]> | undefined;

/**
 * Every non-draft post, regardless of its declared `lang`, newest first
 * (`date` desc, title tie-break). This is the single source for every locale's
 * blog index, tag, archive and post routes. Repeated calls within one build
 * resolve the collection once and return the same array.
 */
export function getAllPosts(): Promise<Post[]> {
  cached ??= getCollection("blog", ({ data }) => !data.draft).then((posts) =>
    [...posts].sort(
      (a, b) =>
        b.data.date.getTime() - a.data.date.getTime() ||
        a.data.title.localeCompare(b.data.title),
    ),
  );
  return cached;
}
