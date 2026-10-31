#!/usr/bin/env node
// One-time install: points core.hooksPath at the committed .githooks directory.
// Outside a git repository this is a no-op, not an error.
import { execFileSync } from "node:child_process";

let inRepo = true;
try {
  execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
} catch {
  inRepo = false;
}

if (!inRepo) {
  console.log("install-hooks: not a git repository, nothing to do");
  process.exit(0);
}

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "inherit",
  });
  console.log("install-hooks: core.hooksPath set to .githooks");
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`install-hooks: failed to set core.hooksPath: ${message}`);
  process.exit(1);
}
