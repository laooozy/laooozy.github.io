import type { APIRoute } from "astro";

import { robotsFor } from "../lib/robots";
import { SITE_INDEXABLE } from "../lib/seo";

/**
 * Build-time `robots.txt` endpoint.
 *
 * This is the only source of the file: there is no static `public/robots.txt`
 * to drift out of sync with `SITE_INDEXABLE`. Astro writes the response to
 * `dist/robots.txt` during the static build.
 */
export const GET: APIRoute = () =>
  new Response(robotsFor(SITE_INDEXABLE), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
