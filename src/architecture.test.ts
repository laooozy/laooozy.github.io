/**
 * Architecture boundary test.
 *
 * Executable form of the layering rules in `AGENTS.md`: the TypeScript
 * compiler API parses every shipped source file (and the frontmatter of every
 * `.astro` component), so comments are stripped naturally and no rule is a
 * regex guess. The exported `check*Source` helpers are pure: the real-tree
 * tests feed them committed files, and the synthetic tests feed them inline
 * violations to prove each rule fails with a distinct, actionable message.
 *
 * Rules enforced:
 *  1. `src/lib/domain/**` is pure: no Astro, DOM/browser globals, adapters,
 *     components, React, Node built-ins or other non-pure packages. Only
 *     `zod`, `i18n/locales` and sibling domain modules are allowed.
 *  2. Runtime adapter imports live only in `src/client/bootstrap.ts`.
 *     `src/adapters/**`, `src/test/**`, tests and type-only imports are exempt.
 *  3. Components use no `document` / `window` / `navigator` / `localStorage`.
 *     `.astro` files are parsed only in their frontmatter; the exact wrappers
 *     in `BUILD_WRAPPER_ALLOWLIST` may additionally use `Astro` / `process`.
 *  4. `astro:content` lives only in `src/lib/io/**` (plus the framework's
 *     `src/content.config.ts`), and network calls only in `src/lib/io/**` or
 *     `src/adapters/**`; those are the documented build/runtime edges.
 *  5. `src/store/**` imports neither components nor adapters.
 *
 * All violations are returned, never thrown, so a failing run names every
 * offender in one go.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/** Absolute `src/` directory. */
const SRC_DIR = fileURLToPath(new URL(".", import.meta.url));

/** Directories that are never part of the shipped source tree. */
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".astro",
  ".git",
  "coverage",
  "playwright-report",
  "test-results",
]);

/** Browser globals forbidden inside components and the pure domain. */
const BROWSER_GLOBALS = new Set([
  "document",
  "window",
  "navigator",
  "localStorage",
]);

/** Network entry points that belong only on the IO/adapters edge. */
const NETWORK_GLOBALS = new Set([
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
]);

/** Node built-ins that are never pure. `node:*` is checked separately. */
const NODE_BUILTINS = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "crypto",
  "dgram",
  "dns",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "net",
  "os",
  "path",
  "process",
  "readline",
  "stream",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
]);

/**
 * Exact `.astro` wrappers allowed to use Astro/process build globals in their
 * frontmatter. This is NOT a blanket `.astro` exemption: any other component
 * that reaches for `Astro` or `process` fails rule 3. Each entry is a thin
 * build-time wrapper:
 *  - BackLink / Hero read `Astro.props`;
 *  - InstagramWall reads `process.env.INSTAGRAM_OEMBED_FIXTURE` for the
 *    deterministic E2E build and owns the build-time oEmbed fetch.
 */
const BUILD_WRAPPER_ALLOWLIST = new Set([
  "components/site/BackLink.astro",
  "components/site/Hero.astro",
  "components/photography/InstagramWall.astro",
]);

/** Content edge: the only place `astro:content` may be imported. */
const CONTENT_EDGE = "lib/io";

/**
 * The content collection config is framework wiring, not an app module: Astro
 * requires `defineCollection` to be imported there. Kept explicit so the rule
 * stays absolute everywhere else.
 */
const CONTENT_CONFIG = "content.config.ts";

/** One boundary violation, with an actionable message. */
export interface Violation {
  rule: string;
  file: string;
  line: number;
  column: number;
  message: string;
}

interface ImportRecord {
  specifier: string;
  typeOnly: boolean;
  node: ts.Node;
}

interface ParsedSource {
  /** Path relative to `src/`, POSIX separators. */
  file: string;
  syntax: ts.SourceFile;
  /** Lines skipped when parsing a fragment (the `---` line of `.astro`). */
  lineOffset: number;
}

/** Normalize a caller-supplied path to `src/`-relative POSIX form. */
function toRelative(file: string): string {
  const normalized = file.replaceAll("\\", "/");
  return normalized.startsWith("src/") ? normalized.slice(4) : normalized;
}

/** Render a `src/`-relative path the way the repository names it. */
function displayPath(file: string): string {
  return `src/${file}`;
}

function isUnder(target: string, directory: string): boolean {
  return target === directory || target.startsWith(`${directory}/`);
}

/** Test files and fixtures are exempt from the production-tree rules. */
function isTestPath(file: string): boolean {
  return (
    isUnder(file, "test") ||
    /(?:^|\/)__tests__\//.test(file) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
  );
}

/** The `---`-delimited frontmatter of an Astro component, or `null`. */
export function extractAstroFrontmatter(source: string): string | null {
  const normalized = source.replace(/^\uFEFF/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(normalized);
  return match?.[1] ?? null;
}

function parseSource(file: string, source: string): ParsedSource {
  const rel = toRelative(file);

  if (rel.endsWith(".astro")) {
    const frontmatter = extractAstroFrontmatter(source);
    return {
      file: rel,
      syntax: ts.createSourceFile(
        rel,
        frontmatter ?? "",
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      ),
      lineOffset: 1,
    };
  }

  const scriptKind = rel.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  return {
    file: rel,
    syntax: ts.createSourceFile(
      rel,
      source,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    ),
    lineOffset: 0,
  };
}

function position(
  parsed: ParsedSource,
  node: ts.Node,
): { line: number; column: number } {
  const start = node.getStart(parsed.syntax);
  const { line, character } =
    parsed.syntax.getLineAndCharacterOfPosition(start);
  return {
    line: line + 1 + parsed.lineOffset,
    column: character + 1,
  };
}

function violation(
  parsed: ParsedSource,
  node: ts.Node,
  rule: string,
  detail: string,
): Violation {
  const { line, column } = position(parsed, node);
  const file = displayPath(parsed.file);
  return {
    rule,
    file,
    line,
    column,
    message: `${file}:${line}:${column} [${rule}] ${detail}`,
  };
}

/** True when every imported binding is erased at build time. */
function isTypeOnlyImport(declaration: ts.ImportDeclaration): boolean {
  const clause = declaration.importClause;
  if (!clause) return false;
  if (clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return true;

  const bindings = clause.namedBindings;
  return (
    bindings !== undefined &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly)
  );
}

function isTypeOnlyExport(declaration: ts.ExportDeclaration): boolean {
  if (declaration.isTypeOnly) return true;

  const clause = declaration.exportClause;
  return (
    clause !== undefined &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly)
  );
}

/** Static imports, re-exports and dynamic `import("...")` calls. */
function collectImports(syntax: ts.SourceFile): ImportRecord[] {
  const imports: ImportRecord[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({
        specifier: node.moduleSpecifier.text,
        typeOnly: isTypeOnlyImport(node),
        node,
      });
      return;
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({
        specifier: node.moduleSpecifier.text,
        typeOnly: isTypeOnlyExport(node),
        node,
      });
      return;
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [argument] = node.arguments;
      if (argument !== undefined && ts.isStringLiteral(argument)) {
        imports.push({
          specifier: argument.text,
          typeOnly: false,
          node,
        });
      }
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(syntax);
  return imports;
}

/** Resolve alias/relative specifiers to `src/`-relative targets. */
function resolveTarget(file: string, specifier: string): string {
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (specifier.startsWith(".")) {
    return posix.normalize(posix.join(posix.dirname(file), specifier));
  }
  return specifier;
}

/** True when an identifier names a global rather than a property/declaration. */
function isGlobalReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (parent === undefined) return true;

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }
  if (ts.isQualifiedName(parent) && parent.right === node) {
    return false;
  }
  if (ts.isJsxAttribute(parent) && parent.name === node) {
    return false;
  }

  if (
    ts.isPropertyAssignment(parent) ||
    ts.isPropertyDeclaration(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent) ||
    ts.isGetAccessorDeclaration(parent) ||
    ts.isSetAccessorDeclaration(parent) ||
    ts.isVariableDeclaration(parent) ||
    ts.isParameter(parent) ||
    ts.isBindingElement(parent) ||
    ts.isFunctionDeclaration(parent) ||
    ts.isClassDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isEnumDeclaration(parent) ||
    ts.isModuleDeclaration(parent) ||
    ts.isImportSpecifier(parent) ||
    ts.isExportSpecifier(parent)
  ) {
    return parent.name !== node;
  }

  return true;
}

function identifiersNamed(
  parsed: ParsedSource,
  names: ReadonlySet<string>,
): Array<{ node: ts.Identifier; name: string }> {
  const found: Array<{ node: ts.Identifier; name: string }> = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isIdentifier(node) &&
      names.has(node.text) &&
      isGlobalReference(node)
    ) {
      found.push({ node, name: node.text });
    }
    ts.forEachChild(node, visit);
  };

  visit(parsed.syntax);
  return found;
}

function browserGlobalViolations(
  parsed: ParsedSource,
  rule: string,
): Violation[] {
  return identifiersNamed(parsed, BROWSER_GLOBALS).map(({ node, name }) =>
    violation(
      parsed,
      node,
      rule,
      `uses browser global \`${name}\`; move the effect behind a port in src/adapters/** and inject it through ClientDeps`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Rule 1 — pure domain.
// ---------------------------------------------------------------------------

function classifyDomainImport(
  target: string,
  specifier: string,
): { rule: string; detail: string } | null {
  if (target === "zod" || target.startsWith("zod/")) return null;
  if (isUnder(target, "lib/domain")) return null;
  if (target === "i18n/locales" || target === "i18n/locales.ts") return null;

  if (
    target === "astro" ||
    target.startsWith("astro:") ||
    target.startsWith("astro/")
  ) {
    return {
      rule: "domain/astro-import",
      detail: `imports \`${specifier}\`; the pure domain must not depend on Astro (content reads belong in src/lib/io/**)`,
    };
  }

  if (
    target === "react" ||
    target.startsWith("react/") ||
    target === "react-dom" ||
    target.startsWith("react-dom/")
  ) {
    return {
      rule: "domain/react-import",
      detail: `imports \`${specifier}\`; the pure domain is framework-free`,
    };
  }

  const packageName = target.split("/")[0] ?? target;
  if (target.startsWith("node:") || NODE_BUILTINS.has(packageName)) {
    return {
      rule: "domain/node-import",
      detail: `imports Node built-in \`${specifier}\`; the pure domain performs no I/O`,
    };
  }

  if (isUnder(target, "adapters")) {
    return {
      rule: "domain/adapter-import",
      detail: `imports adapter \`${specifier}\`; the pure domain must not bind browser/network ports`,
    };
  }

  if (isUnder(target, "components")) {
    return {
      rule: "domain/component-import",
      detail: `imports component module \`${specifier}\`; the pure domain must not depend on UI`,
    };
  }

  if (
    isUnder(target, "lib/io") ||
    isUnder(target, "store") ||
    isUnder(target, "hooks") ||
    isUnder(target, "client") ||
    isUnder(target, "layouts") ||
    isUnder(target, "pages")
  ) {
    return {
      rule: "domain/layer-import",
      detail: `imports \`${specifier}\`; the pure domain may only import zod, i18n/locales and sibling domain modules`,
    };
  }

  return {
    rule: "domain/external-import",
    detail: `imports \`${specifier}\`; the pure domain may only import zod, i18n/locales and sibling domain modules`,
  };
}

/** Pure AST check for `src/lib/domain/**` sources. */
export function checkDomainSource(file: string, source: string): Violation[] {
  const parsed = parseSource(file, source);
  const violations: Violation[] = [];

  for (const imported of collectImports(parsed.syntax)) {
    const target = resolveTarget(parsed.file, imported.specifier);
    const classified = classifyDomainImport(target, imported.specifier);
    if (classified !== null) {
      violations.push(
        violation(parsed, imported.node, classified.rule, classified.detail),
      );
    }
  }

  violations.push(...browserGlobalViolations(parsed, "domain/browser-global"));
  return violations;
}

// ---------------------------------------------------------------------------
// Rule 2 — runtime adapters only in the composition root.
// ---------------------------------------------------------------------------

/** Pure AST check for runtime adapter imports outside the composition root. */
export function checkAdapterImportSource(
  file: string,
  source: string,
): Violation[] {
  const parsed = parseSource(file, source);

  if (
    isTestPath(parsed.file) ||
    isUnder(parsed.file, "adapters") ||
    parsed.file === "client/bootstrap.ts"
  ) {
    return [];
  }

  const violations: Violation[] = [];
  for (const imported of collectImports(parsed.syntax)) {
    if (imported.typeOnly) continue;
    const target = resolveTarget(parsed.file, imported.specifier);
    if (!isUnder(target, "adapters")) continue;

    violations.push(
      violation(
        parsed,
        imported.node,
        "adapters/runtime-import",
        `imports runtime adapter \`${imported.specifier}\`; only src/client/bootstrap.ts may bind runtime adapters (type-only imports are allowed)`,
      ),
    );
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Rule 3 — no browser globals in components.
// ---------------------------------------------------------------------------

/** Pure AST check for component sources (`.ts`, `.tsx`, `.astro` frontmatter). */
export function checkComponentSource(
  file: string,
  source: string,
): Violation[] {
  const parsed = parseSource(file, source);
  const violations = browserGlobalViolations(
    parsed,
    "components/browser-global",
  );

  if (
    parsed.file.endsWith(".astro") &&
    !BUILD_WRAPPER_ALLOWLIST.has(parsed.file)
  ) {
    for (const { node, name } of identifiersNamed(
      parsed,
      new Set(["Astro", "process"]),
    )) {
      violations.push(
        violation(
          parsed,
          node,
          "components/build-global",
          `uses build global \`${name}\`; only the explicit BUILD_WRAPPER_ALLOWLIST may use Astro/process frontmatter globals`,
        ),
      );
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Rule 4 — content and network edges.
// ---------------------------------------------------------------------------

/** Pure AST check for `astro:content` imports outside `src/lib/io/**`. */
export function checkContentImportSource(
  file: string,
  source: string,
): Violation[] {
  const parsed = parseSource(file, source);

  if (
    isTestPath(parsed.file) ||
    isUnder(parsed.file, CONTENT_EDGE) ||
    parsed.file === CONTENT_CONFIG
  ) {
    return [];
  }

  const violations: Violation[] = [];
  for (const imported of collectImports(parsed.syntax)) {
    if (
      imported.specifier !== "astro:content" &&
      !imported.specifier.startsWith("astro:content/")
    ) {
      continue;
    }

    violations.push(
      violation(
        parsed,
        imported.node,
        "io/astro-content",
        `imports \`${imported.specifier}\` outside the content edge; move the read into src/lib/io/** and return plain data`,
      ),
    );
  }

  return violations;
}

/** Pure AST check for network calls outside the IO/adapters edges. */
export function checkNetworkSource(file: string, source: string): Violation[] {
  const parsed = parseSource(file, source);

  if (
    isTestPath(parsed.file) ||
    isUnder(parsed.file, "lib/io") ||
    isUnder(parsed.file, "adapters")
  ) {
    return [];
  }

  return identifiersNamed(parsed, NETWORK_GLOBALS).map(({ node, name }) =>
    violation(
      parsed,
      node,
      "io/network",
      `calls network global \`${name}\`; network I/O belongs in src/lib/io/** (build) or src/adapters/** (runtime)`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Rule 5 — the store is framework- and adapter-free.
// ---------------------------------------------------------------------------

/** Pure AST check for store imports. */
export function checkStoreSource(file: string, source: string): Violation[] {
  const parsed = parseSource(file, source);
  const violations: Violation[] = [];

  for (const imported of collectImports(parsed.syntax)) {
    const target = resolveTarget(parsed.file, imported.specifier);

    if (isUnder(target, "components")) {
      violations.push(
        violation(
          parsed,
          imported.node,
          "store/component-import",
          `imports component module \`${imported.specifier}\`; the store is framework-free and must not import UI`,
        ),
      );
      continue;
    }

    if (isUnder(target, "adapters")) {
      violations.push(
        violation(
          parsed,
          imported.node,
          "store/adapter-import",
          `imports adapter \`${imported.specifier}\`; the store holds state only and must not import browser/network ports`,
        ),
      );
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Real tree.
// ---------------------------------------------------------------------------

/** Every shipped `.ts`, `.tsx` and `.astro` file under `src/`. */
function listSourceFiles(): string[] {
  const files: string[] = [];

  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(join(directory, entry.name));
        continue;
      }

      if (
        !entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".tsx") &&
        !entry.name.endsWith(".astro")
      ) {
        continue;
      }
      if (entry.name.endsWith(".d.ts")) continue;

      files.push(
        relative(SRC_DIR, join(directory, entry.name)).split(sep).join("/"),
      );
    }
  };

  walk(SRC_DIR);
  return files.sort();
}

const SOURCE_FILES = listSourceFiles();

function checkTree(
  select: (file: string) => boolean,
  check: (file: string, source: string) => Violation[],
): Violation[] {
  return SOURCE_FILES.filter(select).flatMap((file) =>
    check(file, readFileSync(join(SRC_DIR, file), "utf8")),
  );
}

function expectNoViolations(violations: Violation[]): void {
  expect(violations.map((item) => item.message)).toEqual([]);
}

describe("architecture boundaries", () => {
  it("finds the source tree to guard", () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(40);
    expect(SOURCE_FILES).toContain("client/bootstrap.ts");
    expect(SOURCE_FILES).toContain("architecture.test.ts");
  });

  it("src/lib/domain/** is pure (rule 1)", () => {
    expectNoViolations(
      checkTree(
        (file) => isUnder(file, "lib/domain") && !isTestPath(file),
        checkDomainSource,
      ),
    );
  });

  it("only src/client/bootstrap.ts imports runtime adapters (rule 2)", () => {
    expectNoViolations(checkTree(() => true, checkAdapterImportSource));
  });

  it("components use no browser globals (rule 3)", () => {
    expectNoViolations(
      checkTree(
        (file) => isUnder(file, "components") && !isTestPath(file),
        checkComponentSource,
      ),
    );
  });

  it("astro:content and network calls stay on their edges (rule 4)", () => {
    expectNoViolations(checkTree(() => true, checkContentImportSource));
    expectNoViolations(checkTree(() => true, checkNetworkSource));
  });

  it("src/store/** imports no components or adapters (rule 5)", () => {
    expectNoViolations(
      checkTree(
        (file) => isUnder(file, "store") && !isTestPath(file),
        checkStoreSource,
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Synthetic violations: prove each rule fails with a distinct message.
// ---------------------------------------------------------------------------

describe("synthetic boundary violations", () => {
  it("flags a browser global in a component with components/browser-global", () => {
    const violations = checkComponentSource(
      "src/components/Probe.tsx",
      "export const x = window.location;\n",
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("components/browser-global");
    expect(violations[0]?.message).toContain("window");
    expect(violations[0]?.message).toContain("src/components/Probe.tsx");
  });

  it("flags astro:content in the domain with domain/astro-import", () => {
    const violations = checkDomainSource(
      "src/lib/domain/Probe.ts",
      'import { getEntry } from "astro:content";\n',
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("domain/astro-import");
    expect(violations[0]?.message).toContain("astro:content");
  });

  it("flags a component import in the domain with domain/component-import", () => {
    const violations = checkDomainSource(
      "src/lib/domain/Probe.ts",
      'import X from "@/components/X";\n',
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("domain/component-import");
    expect(violations[0]?.message).toContain("@/components/X");
  });

  it("flags an adapter import in the store with store/adapter-import", () => {
    const violations = checkStoreSource(
      "src/store/Probe.ts",
      'import { domAdapter } from "@/adapters/dom";\n',
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("store/adapter-import");
    expect(violations[0]?.message).toContain("@/adapters/dom");
  });

  it("accepts a clean pure domain source", () => {
    const violations = checkDomainSource(
      "src/lib/domain/Probe.ts",
      [
        'import { z } from "zod";',
        'import type { Locale } from "@/i18n/locales";',
        'import { helper } from "./Probe-helper";',
        "export const schema = z.string();",
        "export type ProbeLocale = Locale;",
        "export const value = helper;",
        "",
      ].join("\n"),
    );

    expect(violations).toEqual([]);
  });

  it("accepts type-only adapter imports in hooks and mixed `type` specifiers", () => {
    expect(
      checkAdapterImportSource(
        "src/hooks/deps.ts",
        'import type { DomPort } from "@/adapters/dom";\n',
      ),
    ).toEqual([]);

    expect(
      checkAdapterImportSource(
        "src/hooks/deps.ts",
        'import { type DomPort } from "@/adapters/dom";\n',
      ),
    ).toEqual([]);
  });

  it("rejects a runtime adapter import outside the composition root", () => {
    const violations = checkAdapterImportSource(
      "src/hooks/probe.ts",
      'import { domAdapter } from "@/adapters/dom";\n',
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("adapters/runtime-import");
    expect(violations[0]?.message).toContain("src/client/bootstrap.ts");
  });

  it("ignores browser globals mentioned only in comments (AST, not regex)", () => {
    const violations = checkComponentSource(
      "src/components/Probe.tsx",
      [
        "// window and document are forbidden; this comment must not count.",
        "/* navigator.localStorage is also banned. */",
        "export const clean = 1;",
        "",
      ].join("\n"),
    );

    expect(violations).toEqual([]);
  });

  it("flags network calls outside the IO/adapters edges with io/network", () => {
    const violations = checkNetworkSource(
      "src/lib/domain/Probe.ts",
      "export async function probe() { return fetch('/x'); }\n",
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("io/network");
    expect(violations[0]?.message).toContain("fetch");
  });
});
