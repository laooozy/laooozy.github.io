/**
 * ClientDeps React context — the injection seam for the client hooks.
 *
 * Production never mounts a provider: `useClientDeps` falls back to the
 * composition-root singleton (`clientDeps` from the client bootstrap module),
 * so the adapter wiring still happens in exactly one place. Tests wrap a probe
 * in `ClientDepsProvider` with a deterministic bundle (an isolated store plus
 * the adapter doubles) to prove the injected dependency wins over the singleton.
 *
 * This module is the ONLY component-side importer of the composition root;
 * every other component and hook reads the bundle through `useClientDeps`.
 */

import { createContext, type ReactNode, useContext } from "react";

import { clientDeps } from "@/client/bootstrap";
import type { ClientDeps } from "@/hooks/deps";

/** Default value = the real bundle; a provider overrides it for tests. */
const ClientDepsContext = createContext<ClientDeps>(clientDeps);

/** Props for `ClientDepsProvider`; `deps` is optional on purpose. */
export interface ClientDepsProviderProps {
  /** Bundle to expose; defaults to the composition-root singleton. */
  deps?: ClientDeps;
  children: ReactNode;
}

/**
 * Expose a `ClientDeps` bundle to the tree below. Omitting `deps` keeps the
 * singleton, so the provider can also be mounted without changing wiring.
 */
export function ClientDepsProvider({
  deps = clientDeps,
  children,
}: ClientDepsProviderProps) {
  return (
    <ClientDepsContext.Provider value={deps}>
      {children}
    </ClientDepsContext.Provider>
  );
}

/** Read the injected bundle (the singleton when no provider is mounted). */
export function useClientDeps(): ClientDeps {
  return useContext(ClientDepsContext);
}
