import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    // Optional and informational only. Content is language-agnostic, so a post
    // need not declare a locale and `lang` never filters, hides or routes a
    // post: every locale shows every post. The field is kept for provenance.
    lang: z.enum(["zh-hant", "zh-hans", "en"]).optional(),
    draft: z.boolean().default(false),
    translationKey: z.string(),
  }),
});

export const collections = { blog };
