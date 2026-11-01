// @vitest-environment happy-dom
/**
 * Data-boundary and state contract for the `/music/` island.
 *
 * The payload comes from the injected music port, the playlist link must come
 * from the validated payload's `playlist.url`, and every state — loading,
 * empty, populated/filtered, and error — must render without a stale link or a
 * stale row list. Nothing here reaches the network.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fakeMusic, fakeMusicError, type MusicPort } from "@/adapters/music";
import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import type { MusicPayload } from "@/lib/domain/music";
import {
  createFakeDeps,
  FIXTURE_PLAYLIST_URL,
  FIXTURE_SONGS,
  makeEmptyMusicPayload,
  makeMusicPayload,
} from "@/test/client-deps";

import MusicLibrary from "./MusicLibrary";

const LINK_NAME = /在 YouTube 開啟歌單/;

function renderLibrary(music: MusicPort) {
  const fake = createFakeDeps({ music });
  const view = render(
    <ClientDepsProvider deps={fake.deps}>
      <MusicLibrary />
    </ClientDepsProvider>,
  );
  return { ...fake, ...view };
}

function rowCount(container: HTMLElement): number {
  return container.querySelectorAll("[data-music-row]").length;
}

function flakyMusic(payload: MusicPayload): MusicPort {
  let calls = 0;
  return {
    load: () => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error("music request failed"))
        : Promise.resolve(structuredClone(payload));
    },
  };
}

describe("MusicLibrary states", () => {
  it("shows the loading skeleton and no playlist link before the payload resolves", () => {
    const neverResolves: MusicPort = {
      load: () => new Promise<MusicPayload>(() => {}),
    };

    const { container } = renderLibrary(neverResolves);

    expect(screen.getByText("載入中…")).not.toBeNull();
    expect(rowCount(container)).toBe(0);
    expect(screen.queryByRole("link", { name: LINK_NAME })).toBeNull();
  });

  it("renders the empty state with the payload's playlist link", async () => {
    const { container } = renderLibrary(fakeMusic(makeEmptyMusicPayload()));

    const link = await screen.findByRole("link", { name: LINK_NAME });

    expect(link.getAttribute("href")).toBe(FIXTURE_PLAYLIST_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("歌單暫時沒有歌曲。")).not.toBeNull();
    expect(rowCount(container)).toBe(0);
  });

  it("renders all four fixture songs with the result count", async () => {
    const { container } = renderLibrary(fakeMusic(makeMusicPayload()));

    await screen.findByText("共 4 首");

    expect(rowCount(container)).toBe(4);
    for (const song of FIXTURE_SONGS) {
      expect(
        screen.getByRole("link", { name: `${song.title} — ${song.artist}` }),
      ).not.toBeNull();
    }
    expect(
      screen.getAllByText("Kamitsubaki 神椿").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("filters by search, artist and organisation, and offers a reset", async () => {
    const { container } = renderLibrary(fakeMusic(makeMusicPayload()));
    await screen.findByText("共 4 首");

    fireEvent.change(screen.getByLabelText("搜尋歌曲"), {
      target: { value: "花譜" },
    });
    expect(rowCount(container)).toBe(1);
    expect(screen.getByText("共 1 首")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("搜尋歌曲"), {
      target: { value: "" },
    });
    expect(rowCount(container)).toBe(4);

    fireEvent.change(screen.getAllByLabelText("歌手")[0]!, {
      target: { value: "UCother0000000000000000" },
    });
    expect(rowCount(container)).toBe(1);
    expect(screen.getByRole("link", { name: /夜に駆ける/ })).not.toBeNull();

    fireEvent.change(screen.getAllByLabelText("歌手")[0]!, {
      target: { value: "" },
    });
    fireEvent.change(screen.getAllByLabelText("所屬")[0]!, {
      target: { value: "kamitsubaki" },
    });
    expect(rowCount(container)).toBe(2);

    fireEvent.change(screen.getByLabelText("搜尋歌曲"), {
      target: { value: "no such song" },
    });
    expect(screen.getByText("沒有符合的歌曲。")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "全部" }));
    expect(rowCount(container)).toBe(4);
  });

  it("shows the error state with retry and no stale playlist link", async () => {
    renderLibrary(fakeMusicError());

    expect(
      await screen.findByText("歌單暫時無法載入，請再試一次。"),
    ).not.toBeNull();
    expect(screen.queryByRole("link", { name: LINK_NAME })).toBeNull();
    expect(screen.getByRole("button", { name: "重試" })).not.toBeNull();
  });

  it("recovers through retry after a failed load", async () => {
    const { container } = renderLibrary(flakyMusic(makeMusicPayload()));

    await screen.findByText("歌單暫時無法載入，請再試一次。");
    fireEvent.click(screen.getByRole("button", { name: "重試" }));

    await screen.findByText("共 4 首");
    expect(rowCount(container)).toBe(4);
  });

  it("drops every stale row and link when a reload fails", async () => {
    const good = createFakeDeps({ music: fakeMusic(makeMusicPayload()) });
    const { rerender, container } = render(
      <ClientDepsProvider deps={good.deps}>
        <MusicLibrary />
      </ClientDepsProvider>,
    );
    await screen.findByText("共 4 首");
    expect(rowCount(container)).toBe(4);

    const bad = createFakeDeps({ music: fakeMusicError() });
    rerender(
      <ClientDepsProvider deps={bad.deps}>
        <MusicLibrary />
      </ClientDepsProvider>,
    );

    await screen.findByText("歌單暫時無法載入，請再試一次。");
    expect(rowCount(container)).toBe(0);
    expect(screen.queryByRole("link", { name: LINK_NAME })).toBeNull();
  });
});
