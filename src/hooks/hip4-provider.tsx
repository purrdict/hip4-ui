"use client";

/**
 * HIP4Provider — optional React context for cleaner hook DX.
 *
 * Wrap your app to avoid passing `client` to every hook:
 *
 *   <HIP4Provider testnet={true}>
 *     <App />
 *   </HIP4Provider>
 *
 * Then use hooks without the client arg:
 *   const { markets } = useMarkets()     // reads from context
 *   const { bids } = useOrderbook(coin)  // reads from context
 *
 * You can still pass client explicitly to any hook — it takes priority:
 *   const { markets } = useMarkets(explicitClient)
 */

import React, { createContext, useContext } from "react";
import { useHIP4Client } from "./use-hip4-client.js";
import type { HIP4Client } from "./use-hip4-client.js";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Internal context value. Default is null — returned by useHIP4Context()
 * when no HIP4Provider is in the tree.
 */
const HIP4Context = createContext<HIP4Client | null>(null);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HIP4ProviderProps {
  /**
   * Connect to Hyperliquid testnet. Default: false (mainnet).
   */
  testnet?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: any;
}

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

/**
 * Provides an HIP4Client to all descendant hooks via React context.
 *
 * The client is created once per Provider mount (via useHIP4Client) and
 * closed on unmount. Children can call useHIP4Context() to read it, or
 * continue passing the client explicitly — explicit always wins.
 */
export function HIP4Provider({
  testnet = false,
  children,
}: HIP4ProviderProps): React.ReactElement {
  const client = useHIP4Client({ testnet });

  return React.createElement(
    HIP4Context.Provider,
    { value: client },
    children,
  );
}

// ---------------------------------------------------------------------------
// Context hook
// ---------------------------------------------------------------------------

/**
 * Returns the HIP4Client from the nearest HIP4Provider ancestor, or null
 * if no provider is present in the tree.
 *
 * Hooks use this internally: if you don't pass `client` explicitly they
 * fall back to this value. If both are absent, hooks throw a clear error.
 */
export function useHIP4Context(): HIP4Client | null {
  return useContext(HIP4Context);
}
