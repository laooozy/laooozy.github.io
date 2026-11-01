/**
 * Unit tests for the DOM port and its no-op double.
 *
 * `domAdapter` is a module-scope singleton whose methods read the environment
 * lazily, so each scenario installs exactly the globals it needs and the
 * `afterEach` restores them. The contract pinned here: every method is total
 * (never throws) and degrades to a no-op / `false` when the platform lacks the
 * API; `startLoop` is the ONE animation loop (schedules a follow-up frame and
 * cancels on stop); `onVisibilityChange` reports the current state then changes;
 * the global event seams subscribe and unsubscribe cleanly; and the body scroll
 * lock is reversible without clobbering a pre-existing inline value.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { domAdapter, noopDomAdapter } from "@/adapters/dom";

type StubbedGlobal = "window" | "document" | "navigator";

const originals = new Map<StubbedGlobal, PropertyDescriptor | undefined>([
  ["window", Object.getOwnPropertyDescriptor(globalThis, "window")],
  ["document", Object.getOwnPropertyDescriptor(globalThis, "document")],
  ["navigator", Object.getOwnPropertyDescriptor(globalThis, "navigator")],
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
  it("satisfies the port and stays inert", async () => {
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

    expect(noopDomAdapter.scrollY()).toBe(0);
    expect(noopDomAdapter.distanceFromBottom()).toBe(0);
    expect(() => {
      noopDomAdapter.scrollToTop();
      noopDomAdapter.scrollToBottom();
    }).not.toThrow();

    const stopKeyDown = noopDomAdapter.onKeyDown(() => {});
    const stopPointerDown = noopDomAdapter.onPointerDown(() => {});
    expect(typeof stopKeyDown).toBe("function");
    expect(typeof stopPointerDown).toBe("function");
    expect(() => {
      stopKeyDown();
      stopPointerDown();
    }).not.toThrow();
    expect(() => noopDomAdapter.setBodyScrollLocked(true)).not.toThrow();
    expect(() => noopDomAdapter.setBodyScrollLocked(false)).not.toThrow();
    expect(noopDomAdapter.isApplePlatform()).toBe(false);
    expect(() => noopDomAdapter.setHeaderHidden(true)).not.toThrow();
    expect(noopDomAdapter.isHeaderFocusWithin()).toBe(false);
    expect(typeof noopDomAdapter.keepHeaderFocusStable()).toBe("function");
    expect(() => noopDomAdapter.keepHeaderFocusStable()()).not.toThrow();
    const stopHashChange = noopDomAdapter.onHashChange(() => {});
    expect(typeof stopHashChange).toBe("function");
    expect(() => stopHashChange()).not.toThrow();
    expect(() => noopDomAdapter.applyLocale("en")).not.toThrow();
    expect(() =>
      noopDomAdapter.setHidden("[data-ig-embeds]", false),
    ).not.toThrow();
    await expect(
      noopDomAdapter.loadScript("https://example.com/x.js"),
    ).resolves.toBe(false);
  });
});

describe("domAdapter without a DOM", () => {
  it("degrades the new surface to a no-op / null", async () => {
    expect(domAdapter.prefersReducedMotion()).toBe(false);

    const stopLoop = domAdapter.startLoop(() => {});
    const stopVisibility = domAdapter.onVisibilityChange(() => {});

    expect(() => {
      stopLoop();
      stopVisibility();
    }).not.toThrow();
    expect(domAdapter.scrollY()).toBe(0);
    expect(domAdapter.distanceFromBottom()).toBe(0);
    expect(() => {
      domAdapter.scrollToTop();
      domAdapter.scrollToBottom();
    }).not.toThrow();
    expect(() => domAdapter.setHidden("[data-ig-embeds]", false)).not.toThrow();
    const stopKeyDown = domAdapter.onKeyDown(() => {});
    const stopPointerDown = domAdapter.onPointerDown(() => {});
    expect(typeof stopKeyDown).toBe("function");
    expect(typeof stopPointerDown).toBe("function");
    expect(() => {
      stopKeyDown();
      stopPointerDown();
    }).not.toThrow();
    expect(() => domAdapter.setBodyScrollLocked(true)).not.toThrow();
    expect(() => domAdapter.setBodyScrollLocked(false)).not.toThrow();
    expect(domAdapter.isApplePlatform()).toBe(false);
    await expect(
      domAdapter.loadScript("https://example.com/x.js"),
    ).resolves.toBe(false);
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

describe("domAdapter scroll controls", () => {
  it("reads the offset and the distance left below the fold", () => {
    defineGlobal("window", { scrollY: 300, innerHeight: 700 });
    defineGlobal("document", { documentElement: { scrollHeight: 2000 } });

    expect(domAdapter.scrollY()).toBe(300);
    expect(domAdapter.distanceFromBottom()).toBe(1000);
  });

  it("never reports a negative distance from the bottom", () => {
    defineGlobal("window", { scrollY: 1500, innerHeight: 700 });
    defineGlobal("document", { documentElement: { scrollHeight: 2000 } });

    expect(domAdapter.distanceFromBottom()).toBe(0);
  });

  it("smooth-scrolls to both ends and jumps under reduced motion", () => {
    const scrollTo = vi.fn();
    defineGlobal("window", {
      scrollTo,
      matchMedia: () => ({ matches: false }),
    });
    defineGlobal("document", { documentElement: { scrollHeight: 2000 } });

    domAdapter.scrollToTop();
    domAdapter.scrollToBottom();

    expect(scrollTo).toHaveBeenNthCalledWith(1, {
      top: 0,
      behavior: "smooth",
    });
    expect(scrollTo).toHaveBeenNthCalledWith(2, {
      top: 2000,
      behavior: "smooth",
    });

    defineGlobal("window", {
      scrollTo,
      matchMedia: () => ({ matches: true }),
    });

    domAdapter.scrollToBottom();

    expect(scrollTo).toHaveBeenNthCalledWith(3, {
      top: 2000,
      behavior: "auto",
    });
  });
});

describe("domAdapter onHashChange", () => {
  it("subscribes to hashchange and unsubscribes", () => {
    const listeners = new Map<string, () => void>();
    defineGlobal("window", {
      location: { hash: "#about" },
      addEventListener: (type: string, callback: () => void) =>
        listeners.set(type, callback),
      removeEventListener: (type: string) => listeners.delete(type),
    });

    const callback = vi.fn();
    const stop = domAdapter.onHashChange(callback);

    expect([...listeners.keys()]).toEqual(["hashchange"]);
    listeners.get("hashchange")!();
    expect(callback).toHaveBeenCalledWith("#about");

    stop();
    expect(listeners.size).toBe(0);
  });

  it("is a no-op without a window", () => {
    const stop = domAdapter.onHashChange(() => {});
    expect(() => stop()).not.toThrow();
  });
});

describe("domAdapter header semantics", () => {
  it("adds and removes `data-hidden` and `inert` together", () => {
    const attrs = new Set<string>();
    const header = {
      setAttribute: (name: string) => attrs.add(name),
      removeAttribute: (name: string) => attrs.delete(name),
    };
    defineGlobal("document", { querySelector: () => header });

    domAdapter.setHeaderHidden(true);
    expect([...attrs]).toEqual(["data-hidden", "inert"]);

    domAdapter.setHeaderHidden(false);
    expect(attrs.size).toBe(0);
  });

  it("reports focus inside the header only", () => {
    const inside = { id: "nav-link" };
    const header = { contains: (node: unknown) => node === inside };

    defineGlobal("document", {
      querySelector: () => header,
      activeElement: inside,
    });
    expect(domAdapter.isHeaderFocusWithin()).toBe(true);

    defineGlobal("document", {
      querySelector: () => header,
      activeElement: { id: "page-body" },
    });
    expect(domAdapter.isHeaderFocusWithin()).toBe(false);
  });

  function installHeaderHarness(anchorHref: string | null) {
    const inside = {
      id: "nav-link",
      closest: () =>
        anchorHref === null
          ? null
          : {
              getAttribute: (name: string) =>
                name === "href" ? anchorHref : null,
            },
    };
    const listeners = new Map<
      string,
      (event: { target?: unknown; type?: string; key?: string }) => void
    >();
    const frames = new Map<number, (time: number) => void>();
    let nextId = 0;
    const scrollTo = vi.fn();
    const cancelAnimationFrame = vi.fn((id: number) => {
      frames.delete(id);
    });
    const header = {
      hasAttribute: () => false,
      contains: (node: unknown) => node === inside,
    };
    defineGlobal("document", {
      querySelector: () => header,
      activeElement: inside,
      addEventListener: (
        type: string,
        cb: (event: { target?: unknown; type?: string; key?: string }) => void,
      ) => listeners.set(type, cb),
      removeEventListener: (type: string) => listeners.delete(type),
    });
    defineGlobal("window", {
      scrollX: 3,
      scrollY: 900,
      scrollTo,
      location: {
        href: "https://example.com/",
        origin: "https://example.com",
        pathname: "/",
        search: "",
        hash: "",
      },
      requestAnimationFrame: (cb: (time: number) => void) => {
        nextId += 1;
        frames.set(nextId, cb);
        return nextId;
      },
      cancelAnimationFrame,
    });
    const runFrame = () => {
      const entry = [...frames.entries()][0];
      if (!entry) return;
      frames.delete(entry[0]);
      entry[1](16);
    };
    return {
      inside,
      listeners,
      frames,
      scrollTo,
      cancelAnimationFrame,
      runFrame,
    };
  }

  it("restores the scroll offset when focus lands in the shown header", () => {
    const h = installHeaderHarness(null);
    const stop = domAdapter.keepHeaderFocusStable();
    expect([...h.listeners.keys()].sort()).toEqual([
      "click",
      "focusin",
      "keydown",
    ]);

    h.listeners.get("focusin")!({ target: h.inside });
    h.runFrame();
    expect(h.scrollTo).toHaveBeenCalledWith(3, 900);

    stop();
    expect(h.listeners.size).toBe(0);
  });

  it("does not undo a fragment navigation that lands before the restore frame", () => {
    const h = installHeaderHarness(null);
    domAdapter.keepHeaderFocusStable();

    h.listeners.get("focusin")!({ target: h.inside });
    const win = (globalThis as { window: { location: { hash: string } } })
      .window;
    win.location.hash = "#about";
    h.runFrame();
    expect(h.scrollTo).not.toHaveBeenCalled();
  });

  it("cancels the restore when a fragment link is activated", () => {
    const h = installHeaderHarness("#about");
    const stop = domAdapter.keepHeaderFocusStable();

    h.listeners.get("focusin")!({ target: h.inside });
    expect(h.frames.size).toBe(1);
    h.listeners.get("click")!({ type: "click", target: h.inside });
    expect(h.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(h.frames.size).toBe(0);
    expect(h.scrollTo).not.toHaveBeenCalled();

    stop();
  });

  it("keeps the restore for a non-fragment header link activation", () => {
    const h = installHeaderHarness("/");
    domAdapter.keepHeaderFocusStable();

    h.listeners.get("focusin")!({ target: h.inside });
    h.listeners.get("click")!({ type: "click", target: h.inside });
    expect(h.cancelAnimationFrame).not.toHaveBeenCalled();
    h.runFrame();
    expect(h.scrollTo).toHaveBeenCalledWith(3, 900);
  });

  it("cancels the restore for keyboard Enter on a fragment link", () => {
    const h = installHeaderHarness("#contact");
    domAdapter.keepHeaderFocusStable();

    h.listeners.get("focusin")!({ target: h.inside });
    h.listeners.get("keydown")!({ type: "keydown", key: "Enter" });
    expect(h.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(h.frames.size).toBe(0);
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

describe("domAdapter event seams", () => {
  it("subscribes to document keydown and unsubscribes", () => {
    const listeners = new Map<string, (event: KeyboardEvent) => void>();
    defineGlobal("document", {
      addEventListener: (type: string, cb: (event: KeyboardEvent) => void) =>
        listeners.set(type, cb),
      removeEventListener: (type: string) => listeners.delete(type),
    });

    const callback = vi.fn();
    const stop = domAdapter.onKeyDown(callback);

    expect([...listeners.keys()]).toEqual(["keydown"]);
    const event = { key: "k" } as KeyboardEvent;
    listeners.get("keydown")!(event);
    expect(callback).toHaveBeenCalledWith(event);

    stop();
    expect(listeners.size).toBe(0);
  });

  it("subscribes to document pointerdown and unsubscribes", () => {
    const listeners = new Map<string, (event: PointerEvent) => void>();
    defineGlobal("document", {
      addEventListener: (type: string, cb: (event: PointerEvent) => void) =>
        listeners.set(type, cb),
      removeEventListener: (type: string) => listeners.delete(type),
    });

    const callback = vi.fn();
    const stop = domAdapter.onPointerDown(callback);

    expect([...listeners.keys()]).toEqual(["pointerdown"]);
    const event = { clientX: 1 } as PointerEvent;
    listeners.get("pointerdown")!(event);
    expect(callback).toHaveBeenCalledWith(event);

    stop();
    expect(listeners.size).toBe(0);
  });

  it("is a no-op without a document", () => {
    expect(() => domAdapter.onKeyDown(() => {})()).not.toThrow();
    expect(() => domAdapter.onPointerDown(() => {})()).not.toThrow();
  });
});

describe("domAdapter setBodyScrollLocked", () => {
  function installBody(overflow = "") {
    const body = { style: { overflow } };
    defineGlobal("document", { body });
    return body;
  }

  it("hides overflow and restores the prior inline value", () => {
    const body = installBody("scroll");

    domAdapter.setBodyScrollLocked(true);
    expect(body.style.overflow).toBe("hidden");

    domAdapter.setBodyScrollLocked(false);
    expect(body.style.overflow).toBe("scroll");
  });

  it("restores an absent inline override to absent", () => {
    const body = installBody("");

    domAdapter.setBodyScrollLocked(true);
    expect(body.style.overflow).toBe("hidden");

    domAdapter.setBodyScrollLocked(false);
    expect(body.style.overflow).toBe("");
  });

  it("keeps the first saved value across a repeated lock", () => {
    const body = installBody("");

    domAdapter.setBodyScrollLocked(true);
    body.style.overflow = "auto";
    domAdapter.setBodyScrollLocked(true);
    expect(body.style.overflow).toBe("hidden");

    domAdapter.setBodyScrollLocked(false);
    expect(body.style.overflow).toBe("");
  });

  it("ignores an unlock it did not issue", () => {
    const body = installBody("visible");

    domAdapter.setBodyScrollLocked(false);
    expect(body.style.overflow).toBe("visible");
  });

  it("stays silent without a body", () => {
    defineGlobal("document", {});

    expect(() => domAdapter.setBodyScrollLocked(true)).not.toThrow();
    expect(() => domAdapter.setBodyScrollLocked(false)).not.toThrow();
  });
});

describe("domAdapter isApplePlatform", () => {
  it("detects macOS and iOS from the platform string", () => {
    defineGlobal("navigator", { platform: "MacIntel", userAgent: "" });
    expect(domAdapter.isApplePlatform()).toBe(true);

    defineGlobal("navigator", { platform: "iPhone", userAgent: "" });
    expect(domAdapter.isApplePlatform()).toBe(true);
  });

  it("falls back to the user agent when the platform is absent", () => {
    defineGlobal("navigator", {
      platform: "",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
    });
    expect(domAdapter.isApplePlatform()).toBe(true);
  });

  it("reports false on other platforms and without a navigator", () => {
    defineGlobal("navigator", {
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    });
    expect(domAdapter.isApplePlatform()).toBe(false);

    defineGlobal("navigator", {});
    expect(domAdapter.isApplePlatform()).toBe(false);

    defineGlobal("navigator", undefined);
    expect(domAdapter.isApplePlatform()).toBe(false);
  });

  it("returns false when reading the platform throws", () => {
    defineGlobal("navigator", {
      get platform(): string {
        throw new Error("boom");
      },
      userAgent: "",
    });

    expect(domAdapter.isApplePlatform()).toBe(false);
  });
});

describe("domAdapter setHidden", () => {
  it("toggles the hidden attribute on every match", () => {
    const makeElement = () => {
      const attributes = new Set<string>();
      return {
        attributes,
        toggleAttribute: (name: string, force?: boolean) => {
          if (force) attributes.add(name);
          else attributes.delete(name);
          return attributes.has(name);
        },
      };
    };
    const first = makeElement();
    const second = makeElement();
    const selectors: string[] = [];
    defineGlobal("document", {
      querySelectorAll: (selector: string) => {
        selectors.push(selector);
        return [first, second];
      },
    });

    domAdapter.setHidden("[data-ig-embeds]", true);
    expect(selectors).toEqual(["[data-ig-embeds]"]);
    expect([...first.attributes]).toEqual(["hidden"]);
    expect([...second.attributes]).toEqual(["hidden"]);

    domAdapter.setHidden("[data-ig-embeds]", false);
    expect(first.attributes.size).toBe(0);
    expect(second.attributes.size).toBe(0);
  });

  it("stays silent when the document throws", () => {
    defineGlobal("document", {
      querySelectorAll: () => {
        throw new Error("boom");
      },
    });

    expect(() => domAdapter.setHidden("[data-ig-embeds]", false)).not.toThrow();
  });
});

interface FakeScript {
  id: string;
  src: string;
  async: boolean;
  removed: boolean;
  listeners: Map<string, () => void>;
  addEventListener(type: string, callback: () => void): void;
  remove(): void;
}

/**
 * Install a minimal `document` whose `head` records appended scripts by id, so
 * the load/error events and the dedupe lookup can be exercised deterministically.
 */
function installScriptDocument(): {
  appended: FakeScript[];
  fire(script: FakeScript, type: "load" | "error"): void;
} {
  const appended: FakeScript[] = [];
  const tags = new Map<string, FakeScript>();

  const head = {
    appendChild(script: FakeScript) {
      appended.push(script);
      if (script.id) tags.set(script.id, script);
      return script;
    },
  };

  defineGlobal("document", {
    head,
    body: head,
    createElement: (): FakeScript => {
      const listeners = new Map<string, () => void>();
      const script: FakeScript = {
        id: "",
        src: "",
        async: false,
        removed: false,
        listeners,
        addEventListener(type, callback) {
          listeners.set(type, callback);
        },
        remove() {
          script.removed = true;
          if (script.id) tags.delete(script.id);
        },
      };
      return script;
    },
    getElementById: (id: string) => tags.get(id) ?? null,
  });

  return {
    appended,
    fire(script, type) {
      script.listeners.get(type)?.();
    },
  };
}

describe("domAdapter loadScript", () => {
  const src = "https://www.instagram.com/embed.js";
  const id = "instagram-embed";

  it("appends one async tag and resolves true after load", async () => {
    const { appended, fire } = installScriptDocument();

    const pending = domAdapter.loadScript(src, { id });

    expect(appended).toHaveLength(1);
    expect(appended[0].src).toBe(src);
    expect(appended[0].id).toBe(id);
    expect(appended[0].async).toBe(true);

    fire(appended[0], "load");
    await expect(pending).resolves.toBe(true);
  });

  it("dedupes a second call with the same id", async () => {
    const { appended, fire } = installScriptDocument();

    const first = domAdapter.loadScript(src, { id });
    fire(appended[0], "load");
    await expect(first).resolves.toBe(true);

    await expect(domAdapter.loadScript(src, { id })).resolves.toBe(true);
    expect(appended).toHaveLength(1);
  });

  it("removes the failed tag, resolves false, and allows a retry", async () => {
    const { appended, fire } = installScriptDocument();

    const first = domAdapter.loadScript(src, { id });
    fire(appended[0], "error");
    await expect(first).resolves.toBe(false);

    expect(appended[0].removed).toBe(true);

    const retry = domAdapter.loadScript(src, { id });
    expect(appended).toHaveLength(2);
    fire(appended[1], "load");
    await expect(retry).resolves.toBe(true);
  });

  it("resolves false when the tag cannot be appended", async () => {
    defineGlobal("document", {
      head: {
        appendChild: () => {
          throw new Error("boom");
        },
      },
      body: {},
      createElement: () => ({
        addEventListener: () => {},
        remove: () => {},
      }),
      getElementById: () => null,
    });

    await expect(domAdapter.loadScript(src, { id })).resolves.toBe(false);
  });
});
