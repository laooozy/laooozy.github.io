import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
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

export const collections = { blog, links };
