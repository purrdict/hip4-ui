/**
 * useHIP4Client — creates and caches an @purrdict/hip4 client.
 *
 * The client is created once per component mount and cached in a ref.
 * It is closed on unmount to release the WebSocket connection.
 *
 * Usage:
 *   const client = useHIP4Client({ testnet: true });
 *   const mids = await client.info.allMids();
 */

"use client";

import { useRef, useEffect } from "react";
import { createClient } from "@purrdict/hip4";
import type { HIP4Client, ClientConfig } from "@purrdict/hip4";

export interface UseHIP4ClientOptions extends Partial<ClientConfig> {
  /**
   * Connect to testnet. Default: false (mainnet).
   * Alias: isTestnet.
   */
  testnet?: boolean;
}

/**
 * Create and cache an HIP4Client for the lifetime of the component.
 *
 * The client is stable across re-renders. A new client is only created
 * if `testnet` changes (which should be uncommon).
 */
export function useHIP4Client(opts: UseHIP4ClientOptions = {}): HIP4Client {
  const { testnet = false, builderAddress = "", builderFee = 0 } = opts;

  const clientRef = useRef<HIP4Client | null>(null);
  const testnetRef = useRef<boolean>(testnet);

  // Create client on first render or if testnet flag changes.
  if (clientRef.current === null || testnetRef.current !== testnet) {
    // Close old client if it exists.
    if (clientRef.current !== null) {
      clientRef.current.close().catch(() => undefined);
    }

    clientRef.current = createClient({ testnet, builderAddress, builderFee });
    testnetRef.current = testnet;
  }

  // Close the client on unmount.
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.close().catch(() => undefined);
        clientRef.current = null;
      }
    };
  }, []);

  // Non-null guaranteed by the initialization above.
  return clientRef.current!;
}
