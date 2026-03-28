/**
 * useOrderbook — subscribes to the L2 orderbook for a prediction market coin.
 *
 * Derives the mirrored book: for prediction markets, bids on Yes at price P
 * are equivalent to asks on No at price (1 − P). This hook exposes both
 * the raw book and pre-computed spread/midPrice.
 *
 * Usage:
 *   const { bids, asks, spread, midPrice } = useOrderbook(client, "#9860");
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { subscribeBook } from "@purrdict/hip4";
import type { BookLevel, HIP4Client, Subscription } from "@purrdict/hip4";

export interface UseOrderbookResult {
  /** Bids sorted by price descending */
  bids: BookLevel[];
  /** Asks sorted by price ascending */
  asks: BookLevel[];
  /** Spread between best ask and best bid (null when book is empty) */
  spread: number | null;
  /** Midpoint between best bid and best ask (null when book is empty) */
  midPrice: number | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Subscribe to the L2 orderbook for a specific coin.
 *
 * @param client  HIP4Client from useHIP4Client()
 * @param coin    Coin name — e.g. "#9860" for a prediction market yes coin
 */
export function useOrderbook(
  client: HIP4Client,
  coin: string,
): UseOrderbookResult {
  const [bids, setBids] = useState<BookLevel[]>([]);
  const [asks, setAsks] = useState<BookLevel[]>([]);
  const [spread, setSpread] = useState<number | null>(null);
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const subRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!coin) return;

    let cancelled = false;

    async function subscribe() {
      setIsLoading(true);
      setError(null);

      try {
        subRef.current = await subscribeBook(
          client.sub,
          coin,
          (update) => {
            if (cancelled) return;

            const [newBids, newAsks] = update.levels;
            setBids(newBids);
            setAsks(newAsks);

            const bestBid = newBids[0] ? parseFloat(newBids[0].px) : null;
            const bestAsk = newAsks[0] ? parseFloat(newAsks[0].px) : null;

            if (bestBid !== null && bestAsk !== null) {
              setSpread(bestAsk - bestBid);
              setMidPrice((bestBid + bestAsk) / 2);
            } else {
              setSpread(null);
              setMidPrice(null);
            }

            setIsLoading(false);
          },
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      if (subRef.current) {
        subRef.current.unsubscribe().catch(() => undefined);
        subRef.current = null;
      }
    };
  }, [client, coin]);

  return { bids, asks, spread, midPrice, isLoading, error };
}
