/**
 * Unit tests for the DOM port and its no-op double.
 *
 * `domAdapter` is a module-scope singleton whose methods read the environment
 * lazily, so each scenario installs exactly the globals it needs and the
 * `afterEach` restores them. The contract pinned here: every method is total
 * (never throws) and degrades to a no-op / `null` when the platform lacks the
 * API; `startLoop` is the ONE animation loop (schedules a follow-up frame and
 * cancels on stop); `onVisibilityChange` reports the current state then changes;
 * and `createIntersectionObserver` wraps the native observer behind a small
 * surface.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { domAdapter, noopDomAdapter } from "@/adapters/dom";

type StubbedGlobal = "window" | "document" | "IntersectionObserver";

const originals = new Map<StubbedGlobal, PropertyDescriptor | undefined>([
  ["window", Object.getOwnPropertyDescriptor(globalThis, "window")],
  ["document", Object.getOwnPropertyDescriptor(globalThis, "document")],
  [
    "IntersectionObserver",
    Object.getOwnPropertyDescriptor(globalThis, "IntersectionObserver"),
  ],
]);

function defineGlobal(key: StubbedGlobal, value: unknown): void {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  });
}

afterEach(() => {
  for (const [key, original] of originals) {
    if (original) Object.defineProperty(globalThis, key, original);
    else Reflect.deleteProperty(globalThis, key);
  }
  vi.restoreAllMocks();
});

describe("noopDomAdapter", () => {
  it("satisfies the port and stays inert", () => {
    expect(noopDomAdapter.prefersReducedMotion()).toBe(false);

    const stopLoop = noopDomAdapter.startLoop(() => {});
    const stopVisibility = noopDomAdapter.onVisibilityChange(() => {});
    const stopScroll = noopDomAdapter.onScroll(() => {});

    expect(typeof stopLoop).toBe("function");
    expect(typeof stopVisibility).toBe("function");
    expect(() => {
      stopLoop();
      stopVisibility();
      stopScroll();
    }).not.toThrow();

    expect(noopDomAdapter.createIntersectionObserver(() => {})).toBeNull();
    expect(() => noopDomAdapter.setHeaderHidden(true)).not.toThrow();
    expect(() => noopDomAdapter.applyLocale("en")).not.toThrow();
  });
});

describe("domAdapter without a DOM", () => {
  it("degrades the new surface to a no-op / null", () => {
    expect(domAdapter.prefersReducedMotion()).toBe(false);

    const stopLoop = domAdapter.startLoop(() => {});
    const stopVisibility = domAdapter.onVisibilityChange(() => {});

    expect(() => {
      stopLoop();
      stopVisibility();
    }).not.toThrow();
    expect(domAdapter.createIntersectionObserver(() => {})).toBeNull();
  });
});

describe("domAdapter prefersReducedMotion", () => {
  it("reads the reduce media query", () => {
    defineGlobal("window", {
      matchMedia: (query: string) => ({ matches: query.includes("reduce") }),
    });

    expect(domAdapter.prefersReducedMotion()).toBe(true);
  });

  it("returns false when matchMedia throws", () => {
    defineGlobal("window", {
      matchMedia: () => {
        throw new Error("boom");
      },
    });

    expect(domAdapter.prefersReducedMotion()).toBe(false);
  });
});

describe("domAdapter startLoop", () => {
  it("drives one frame per rAF tick and cancels on stop", () => {
    const frames = new Map<number, (time: number) => void>();
    let nextId = 0;
    const cancel = vi.fn<(id: number) => void>();
    defineGlobal("window", {
      requestAnimationFrame: (cb: (time: number) => void) => {
        nextId += 1;
        frames.set(nextId, cb);
        return nextId;
      },
      cancelAnimationFrame: cancel,
    });

    const seen: number[] = [];
    const stop = domAdapter.startLoop((time) => seen.push(time));

    expect(frames.size).toBe(1);
    const [firstId, firstTick] = [...frames.entries()][0];
    frames.delete(firstId);
    firstTick(16);

    expect(seen).toEqual([16]);
    expect(frames.size).toBe(1);

    stop();
    expect(cancel).toHaveBeenCalled();

    const [lateId, lateTick] = [...frames.entries()][0];
    frames.delete(lateId);
    lateTick(32);

    expect(seen).toEqual([16]);
  });
});

describe("domAdapter onVisibilityChange", () => {
  it("reports the current visibility then every change", () => {
    const listeners = new Set<() => void>();
    const doc = {
      hidden: false,
      addEventListener: (_type: string, cb: () => void) => {
        listeners.add(cb);
      },
      removeEventListener: (_type: string, cb: () => void) => {
        listeners.delete(cb);
      },
    };
    defineGlobal("document", doc);

    const seen: boolean[] = [];
    const off = domAdapter.onVisibilityChange((hidden) => seen.push(hidden));

    expect(seen).toEqual([false]);

    doc.hidden = true;
    for (const cb of listeners) cb();

    expect(seen).toEqual([false, true]);

    off();
    expect(listeners.size).toBe(0);
  });
});

describe("domAdapter createIntersectionObserver", () => {
  it("returns null when the platform lacks IntersectionObserver", () => {
    defineGlobal("IntersectionObserver", undefined);

    expect(domAdapter.createIntersectionObserver(() => {})).toBeNull();
  });

  it("wraps the native observer behind the small surface", () => {
    const observed: Element[] = [];
    const unobserved: Element[] = [];
    let disconnectCount = 0;
    const captured: Array<(entries: DomEntry[]) => void> = [];

    interface DomEntry {
      target: Element;
      isIntersecting: boolean;
    }

    class FakeIntersectionObserver {
      constructor(cb: (entries: DomEntry[]) => void, _options?: unknown) {
        captured.push(cb);
      }
      observe(target: Element): void {
        observed.push(target);
      }
      unobserve(target: Element): void {
        unobserved.push(target);
      }
      disconnect(): void {
        disconnectCount += 1;
      }
    }
    defineGlobal("IntersectionObserver", FakeIntersectionObserver);

    const element = {} as Element;
    const seen: DomEntry[] = [];
    const observer = domAdapter.createIntersectionObserver(
      (entries) => seen.push(...entries),
      { threshold: 0.1 },
    );

    expect(observer).not.toBeNull();
    observer?.observe(element);
    expect(observed).toEqual([element]);

    captured[0]([{ target: element, isIntersecting: true }]);
    expect(seen).toEqual([{ target: element, isIntersecting: true }]);

    observer?.unobserve(element);
    expect(unobserved).toEqual([element]);

    observer?.disconnect();
    expect(disconnectCount).toBe(1);
  });
});
