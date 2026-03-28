/**
 * useHIP4Client — creates and caches a Hyperliquid client bundle.
 *
 * Wraps @nktkas/hyperliquid transports and clients into a single object.
 * The client is created once per component mount and cached in a ref.
 *
 * Usage:
 *   const client = useHIP4Client({ testnet: true });
 *   const mids = await client.info.allMids();
 */

"use client";

import { useRef, useEffect } from "react";
import { HttpTransport, InfoClient, SubscriptionClient, WebSocketTransport } from "@nktkas/hyperliquid";

export interface UseHIP4ClientOptions {
  /** Connect to testnet. Default: false (mainnet). */
  testnet?: boolean;
  /** @deprecated No-op — builder config belongs at the order level, not the client level. */
  builderAddress?: string;
  /** @deprecated No-op — builder config belongs at the order level, not the client level. */
  builderFee?: number;
}

/** The client bundle returned by useHIP4Client */
export interface HIP4Client {
  info: InfoClient;
  sub: SubscriptionClient;
  close: () => void;
}

/**
 * Create and cache a Hyperliquid client for the lifetime of the component.
 *
 * The client is stable across re-renders. A new client is only created
 * if `testnet` changes (which should be uncommon).
 */
export function useHIP4Client(opts: UseHIP4ClientOptions = {}): HIP4Client {
  const { testnet = false } = opts;

  const clientRef = useRef<HIP4Client | null>(null);
  const testnetRef = useRef<boolean>(testnet);

  if (clientRef.current === null || testnetRef.current !== testnet) {
    // Close old client if it exists
    if (clientRef.current !== null) {
      clientRef.current.close();
    }

    const httpTransport = new HttpTransport({ isTestnet: testnet });
    const wsTransport = new WebSocketTransport({ isTestnet: testnet });

    clientRef.current = {
      info: new InfoClient({ transport: httpTransport }),
      sub: new SubscriptionClient({ transport: wsTransport }),
      close: () => {
        wsTransport.close();
      },
    };
    testnetRef.current = testnet;
  }

  // Close the client on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, []);

  return clientRef.current!;
}
