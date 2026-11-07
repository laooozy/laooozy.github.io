/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      // Measure the pure/port/state layers that carry the site's logic. The
      // generated shadcn kit under `src/components/ui/**` is intentionally not
      // included: it is vendored output, not code this repository authors.
      include: [
        "src/lib/domain/**/*.ts",
        "src/adapters/**/*.ts",
        "src/store/**/*.ts",
        "src/hooks/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
      reporter: ["text", "lcov"],
      // `lcov` also emits an HTML tree. Keep the whole report inside the
      // ignored dependency cache so lint, format and type checks never scan
      // generated markup.
      reportsDirectory: "./node_modules/.cache/coverage",
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
