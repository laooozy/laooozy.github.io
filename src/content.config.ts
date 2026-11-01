import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: blogSchema,
});

/**
 * Useful links — ONE Markdown file (`index.md`) holding the whole bullet list,
 * not one entry per link. The schema is deliberately loose: the list is prose
 * the owner edits by hand, so only an optional title/description are typed.
 */
const links = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/links" }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

/**
 * Page bodies authored in MDX. Each entry is a whole page (`home`, `photographer`,
 * `music`) whose
 * prose and layout components live in `src/content/pages/*.mdx`; the route
 * files stay in `src/pages/` and decide when an entry is rendered.
 */
const pages = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, links, pages };
