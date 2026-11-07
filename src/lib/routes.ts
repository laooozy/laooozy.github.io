/**
 * The one URL space's public paths, shared by the header nav and the command
 * palette's quick links. The locale is client state, never a path segment, so
 * every locale uses these same paths.
 */

export const routes = {
  home: "/",
  about: "/#about",
  contact: "/#contact",
  blog: "/blog/",
  music: "/music/",
  photographer: "/photographer/",
  links: "/links/",
} as const;

/** Drop trailing slashes so `/blog` and `/blog/` compare equal. */
export function normalisePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** True for the blog listing and every `/blog/*` tag, archive or post path. */
export function isBlogPath(pathname: string): boolean {
  const path = normalisePath(pathname);
  return path === "/blog" || path.startsWith("/blog/");
}

/** True for the music page. */
export function isMusicPath(pathname: string): boolean {
  const path = normalisePath(pathname);
  return path === "/music" || path.startsWith("/music/");
}

/** True for the links page. */
export function isLinksPath(pathname: string): boolean {
  return normalisePath(pathname) === "/links";
}
