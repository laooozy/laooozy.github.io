/**
 * Vitest setup shared by every test file.
 *
 * React Testing Library mounts into a shared container per test. Unmounting
 * after each test keeps the happy-dom document clean and stops a leaked store
 * subscription from bleeding into the next case. Node-environment tests never
 * mount anything, so `cleanup()` is a no-op there.
 */
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
