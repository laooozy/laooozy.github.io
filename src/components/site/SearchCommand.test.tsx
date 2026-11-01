// @vitest-environment happy-dom
/**
 * Contract for the always-mounted ⌘K half of the palette: it stays inert until
 * the first open, subscribes the shortcut through the injected DOM port, and
 * tears that subscription down on unmount. No Pagefind module is loaded before
 * the dialog is lazy-imported.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import { createFakeDeps } from "@/test/client-deps";

import SearchCommand from "./SearchCommand";

function renderCommand() {
  const fake = createFakeDeps();
  const onKeyDown = vi.spyOn(fake.dom.port, "onKeyDown");
  const view = render(
    <ClientDepsProvider deps={fake.deps}>
      <SearchCommand />
    </ClientDepsProvider>,
  );
  return { ...fake, ...view, onKeyDown };
}

describe("SearchCommand", () => {
  it("renders nothing and loads no dialog before the first open", () => {
    const { container, onKeyDown } = renderCommand();

    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("opens through ⌘K / Ctrl+K and ignores modified or unrelated keys", async () => {
    const { store, dom } = renderCommand();

    dom.emitKeyDown(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        shiftKey: true,
      }),
    );
    expect(store.getState().search.open).toBe(false);

    dom.emitKeyDown(new KeyboardEvent("keydown", { key: "j", ctrlKey: true }));
    expect(store.getState().search.open).toBe(false);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      cancelable: true,
    });
    const preventDefault = vi.spyOn(event, "preventDefault");
    dom.emitKeyDown(event);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(store.getState().search.open).toBe(true));
    expect(await screen.findByRole("dialog")).not.toBeNull();
  });

  it("unsubscribes the shortcut on unmount", () => {
    const { dom, unmount, onKeyDown } = renderCommand();

    expect(dom.keyDownListenerCount()).toBe(1);
    unmount();

    expect(dom.keyDownListenerCount()).toBe(0);
    expect(dom.keyDownUnsubscribeCount()).toBe(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and returns focus to the element that had it", async () => {
    const { deps, store, dom } = createFakeDeps();
    const { container } = render(
      <ClientDepsProvider deps={deps}>
        <button type="button">anchor</button>
        <SearchCommand />
      </ClientDepsProvider>,
    );
    const anchor = screen.getByRole("button", { name: "anchor" });
    anchor.focus();
    expect(container.ownerDocument.activeElement).toBe(anchor);

    dom.emitKeyDown(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(store.getState().search.open).toBe(false));
    await waitFor(() =>
      expect(container.ownerDocument.activeElement).toBe(anchor),
    );
  });
});
