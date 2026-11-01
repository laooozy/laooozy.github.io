/**
 * Schema-mirror type test.
 *
 * `src/lib/domain/posts.ts` is pure and may not import `astro:content`, so
 * `PostData` restates the `blog` collection's frontmatter shape by hand. This
 * test makes that mirror load-bearing: `PostData` and `z.infer` of the real
 * `blogSchema` must extend each other, so adding, removing or retyping a field
 * in either place fails `bun run typecheck`.
 *
 * The import of `content.config.ts` is TYPE-ONLY on purpose: Vitest never
 * executes the module (which imports `astro:content`).
 */
import { describe, expect, expectTypeOf, it } from "vitest";

import type { blogSchema } from "@/content.config";

import type { PostData } from "./posts";

type BlogSchemaData = import("astro/zod").z.infer<typeof blogSchema>;

describe("PostData mirrors the blog content schema", () => {
  it("is mutually assignable with z.infer of the blog schema", () => {
    expectTypeOf<PostData>().toExtend<BlogSchemaData>();
    expectTypeOf<BlogSchemaData>().toExtend<PostData>();
    expect(true).toBe(true);
  });
});
