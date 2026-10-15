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
    // Optional: content is language-agnostic now, so a post need not declare a
    // locale. Existing posts keep their value; it is simply not used to filter.
    lang: z.enum(["zh-hant", "zh-hans", "en"]).optional(),
    draft: z.boolean().default(false),
    translationKey: z.string(),
  }),
});

export const collections = { blog };
