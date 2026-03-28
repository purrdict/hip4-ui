/**
 * useMarkets — discovers active HIP-4 markets and subscribes to live prices.
 *
 * Fetches outcomeMeta + allMids on mount, then maintains a live mid-price
 * map via an allMids WebSocket subscription.
 *
 * Usage:
 *   const { markets, mids, isLoading, error } = useMarkets();
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  discoverMarkets,
  fetchOutcomeMeta,
  fetchAllMids,
  subscribePrices,
} from "@purrdict/hip4";
import type { Market, Subscription } from "@purrdict/hip4";
import type { HIP4Client } from "@purrdict/hip4";

export interface UseMarketsResult {
  /** All active priceBinary markets */
  markets: Market[];
  /** Live mid prices keyed by coin name (e.g. "BTC", "#9860") */
  mids: Record<string, string>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Discover active markets and subscribe to live prices.
 *
 * @param client  HIP4Client from useHIP4Client()
 */
export function useMarkets(client: HIP4Client): UseMarketsResult {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [mids, setMids] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const subRef = useRef<Subscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const [meta, initialMids] = await Promise.all([
          fetchOutcomeMeta(client.info),
          fetchAllMids(client.info),
        ]);

        if (cancelled) return;

        const discovered = discoverMarkets(meta, initialMids);
        setMarkets(discovered);
        setMids(initialMids);
        setIsLoading(false);

        // Subscribe to live price updates.
        subRef.current = await subscribePrices(client.sub, ({ mids: update }) => {
          if (!cancelled) {
            setMids((prev) => ({ ...prev, ...update }));
          }
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (subRef.current) {
        subRef.current.unsubscribe().catch(() => undefined);
        subRef.current = null;
      }
    };
  }, [client]);

  return { markets, mids, isLoading, error };
}
