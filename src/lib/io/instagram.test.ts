import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_OEMBED_TIMEOUT_MS,
  getInstagramEmbeds,
  instagramFixtureHtml,
} from "./instagram";

const POST = "https://www.instagram.com/p/DdtBD23yLte/";
const OTHER_POST = "https://www.instagram.com/p/Dcsnb5YyY0I/";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("getInstagramEmbeds (live mode)", () => {
  it("returns the oEmbed HTML and queries the documented endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        html: '<blockquote class="instagram-media">ok</blockquote>',
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [embed] = await getInstagramEmbeds([POST]);

    expect(embed).toEqual({
      url: POST,
      html: '<blockquote class="instagram-media">ok</blockquote>',
      failed: false,
    });

    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(String(endpoint)).toContain(
      "graph.facebook.com/v25.0/instagram_oembed",
    );
    expect(endpoint.searchParams.get("url")).toBe(POST);
    expect(endpoint.searchParams.get("omitscript")).toBe("true");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("never throws on a non-OK response; it reports failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: { code: 24 } }, false)),
    );

    const [embed] = await getInstagramEmbeds([POST]);

    expect(embed).toEqual({ url: POST, html: "", failed: true });
  });

  it("fails a malformed HTML field instead of rendering it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ html: 42 })),
    );

    const [embed] = await getInstagramEmbeds([POST]);

    expect(embed).toEqual({ url: POST, html: "", failed: true });
  });

  it("never throws on a network rejection; it reports failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );

    const [embed] = await getInstagramEmbeds([POST]);

    expect(embed).toEqual({ url: POST, html: "", failed: true });
  });

  it("times out a hanging fetch, aborts it and reports failed", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    const started = Date.now();
    const [embed] = await getInstagramEmbeds([POST], { timeoutMs: 25 });

    expect(Date.now() - started).toBeLessThan(2000);
    expect(embed).toEqual({ url: POST, html: "", failed: true });

    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(init.signal?.aborted).toBe(true);
  });

  it("falls back to the default timeout for an invalid override", () => {
    expect(DEFAULT_OEMBED_TIMEOUT_MS).toBe(10_000);
  });
});

describe("getInstagramEmbeds (fixture mode)", () => {
  it("makes no fetch and generates deterministic HTML for both known permalinks", async () => {
    const fetchMock = vi.fn(() => {
      throw new Error("fixture mode must not fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    const embeds = await getInstagramEmbeds([POST, OTHER_POST], {
      mode: "fixture",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(embeds).toHaveLength(2);
    expect(embeds.map((embed) => embed.failed)).toEqual([false, false]);
    expect(embeds[0].html).toContain('class="instagram-media"');
    expect(embeds[0].html).toContain(POST);
    expect(embeds[1].html).toContain(OTHER_POST);
  });

  it("escapes the permalink in generated markup", () => {
    const html = instagramFixtureHtml(
      'https://www.instagram.com/p/x/?a="b"&c=d',
    );

    expect(html).toContain("&quot;b&quot;");
    expect(html).toContain("&amp;c=d");
  });
});
