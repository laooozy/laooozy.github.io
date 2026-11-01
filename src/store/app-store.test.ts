import { beforeEach, describe, expect, it } from "vitest";

import { appStore } from "./app-store";

const search = () => appStore.getState().search;

beforeEach(() => {
  appStore.setState(appStore.getInitialState(), true);
});

describe("search open/close transitions", () => {
  it("opens with a clean query and results while preserving recents", () => {
    const state = appStore.getState();
    state.setRecentSearches(["alpha", "beta"]);
    state.setSearchQuery("old query");
    state.setSearchResults([{ url: "/old/", title: "Old" }]);
    state.setSearchStatus("results");
    const epoch = search().epoch;

    appStore.getState().openSearch();

    expect(search()).toMatchObject({
      open: true,
      query: "",
      status: "idle",
      results: [],
      recent: ["alpha", "beta"],
    });
    expect(search().epoch).toBe(epoch + 1);
  });

  it("closes with a clean transient state while preserving recents", () => {
    const state = appStore.getState();
    state.setRecentSearches(["alpha"]);
    state.openSearch();
    state.setSearchQuery("old query");
    state.setSearchResults([{ url: "/old/", title: "Old" }]);
    state.setSearchStatus("results");
    const epoch = search().epoch;

    appStore.getState().closeSearch();

    expect(search()).toMatchObject({
      open: false,
      query: "",
      status: "idle",
      results: [],
      recent: ["alpha"],
    });
    expect(search().epoch).toBe(epoch + 1);
  });
});

describe("recent searches", () => {
  it("sanitises and de-duplicates entries written to the store", () => {
    appStore
      .getState()
      .setRecentSearches(["  alpha  ", "alpha", "", "beta", 42 as never]);

    expect(search().recent).toEqual(["alpha", "beta"]);
  });

  it("moves repeated queries to the front and caps the list", () => {
    const state = appStore.getState();
    for (const query of ["a", "b", "c", "d", "e", "f"]) {
      state.addRecentSearch(query);
    }
    expect(search().recent).toEqual(["f", "e", "d", "c", "b"]);

    appStore.getState().addRecentSearch("d");
    expect(search().recent).toEqual(["d", "f", "e", "c", "b"]);
  });

  it("clears the list without touching the open state", () => {
    appStore.getState().openSearch();
    appStore.getState().addRecentSearch("alpha");

    appStore.getState().clearRecentSearches();

    expect(search().recent).toEqual([]);
    expect(search().open).toBe(true);
  });
});
