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
 * Every non-draft post, regardless of its declared `lang`, newest first
 * (`date` desc, title tie-break). This is the single source for every locale's
 * blog index, tag, archive and post routes.
 */
export async function getAllPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return [...posts].sort(
    (a, b) =>
      b.data.date.getTime() - a.data.date.getTime() ||
      a.data.title.localeCompare(b.data.title),
  );
}
