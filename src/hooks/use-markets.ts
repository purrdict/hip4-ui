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

import { useState, useEffect, useRef, useMemo } from "react";
import { discoverMarkets } from "@purrdict/hip4";
import type { Market } from "@purrdict/hip4";
import type { ISubscription } from "@nktkas/hyperliquid";
import type { HIP4Client } from "./use-hip4-client.js";
import { useHIP4Context } from "./hip4-provider.js";

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
 * @param client  HIP4Client — optional when wrapped in <HIP4Provider>
 */
export function useMarkets(client?: HIP4Client): UseMarketsResult {
  const ctxClient = useHIP4Context();
  const resolvedClient = client ?? ctxClient;
  if (!resolvedClient) {
    throw new Error(
      "useMarkets requires a HIP4Client. Either pass it as an argument or wrap your app in <HIP4Provider>.",
    );
  }
  // Non-null assertion: TypeScript cannot narrow through the throw above into
  // closures; capture as a guaranteed-non-null const for use inside effects.
  const safeClient = resolvedClient;

  const [markets, setMarkets] = useState<Market[]>([]);
  const [mids, setMids] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const subRef = useRef<ISubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const [rawMeta, initialMids] = await Promise.all([
          safeClient.info.outcomeMeta(),
          safeClient.info.allMids(),
        ]);

        if (cancelled) return;

        // Adapt nktkas OutcomeMetaResponse to @purrdict/hip4 OutcomeMeta.
        // The only difference: nktkas uses `question` (number) but our type uses `id`.
        const meta = {
          outcomes: rawMeta.outcomes,
          questions: rawMeta.questions.map((q) => ({
            id: q.question,
            name: q.name,
            namedOutcomes: q.namedOutcomes,
          })),
        };

        const discovered = discoverMarkets(meta, initialMids);
        setMarkets(discovered);
        setMids(initialMids);
        setIsLoading(false);

        // Subscribe to live price updates via WebSocket.
        subRef.current = await safeClient.sub.allMids((event) => {
          if (!cancelled) {
            setMids((prev) => ({ ...prev, ...event.mids }));
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
  }, [resolvedClient]);

  // Stable markets reference — prevents downstream rerenders when the
  // markets array contents haven't actually changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableMarkets = useMemo(() => markets, [JSON.stringify(markets)]);

  return { markets: stableMarkets, mids, isLoading, error };
}
