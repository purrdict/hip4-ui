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
import { useHIP4Context } from "./hip4-provider.js";

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
 * Two call signatures are supported:
 *   useOrderbook(client, "#9860")   // explicit client
 *   useOrderbook("#9860")           // reads client from <HIP4Provider>
 *
 * @param client  HIP4Client — optional when wrapped in <HIP4Provider>
 * @param coin    Coin name — e.g. "#9860" for a prediction market yes coin
 *
 * Performance note: This hook calls `setState` on every book tick (typically
 * every 500ms). For a visually rendered orderbook that's perfectly fine —
 * the component needs to repaint on every update anyway.
 */
export function useOrderbook(
  client: HIP4Client | undefined,
  coin: string,
): UseOrderbookResult;
export function useOrderbook(
  coin: string,
): UseOrderbookResult;
export function useOrderbook(
  clientOrCoin: HIP4Client | string | undefined,
  coin?: string,
): UseOrderbookResult {
  // Overload resolution: if first arg is a string it's the coin (context mode).
  const isContextMode = typeof clientOrCoin === "string";
  const explicitClient: HIP4Client | undefined = isContextMode
    ? undefined
    : (clientOrCoin as HIP4Client | undefined);
  const resolvedCoin: string = isContextMode
    ? (clientOrCoin as string)
    : (coin as string);

  const ctxClient = useHIP4Context();
  const resolvedClient = explicitClient ?? ctxClient;
  if (!resolvedClient) {
    throw new Error(
      "useOrderbook requires a HIP4Client. Either pass it as an argument or wrap your app in <HIP4Provider>.",
    );
  }

  const [bids, setBids] = useState<BookLevel[]>([]);
  const [asks, setAsks] = useState<BookLevel[]>([]);
  const [spread, setSpread] = useState<number | null>(null);
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const subRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!resolvedCoin) return;

    let cancelled = false;

    async function subscribe() {
      setIsLoading(true);
      setError(null);

      try {
        subRef.current = await subscribeBook(
          resolvedClient.sub,
          resolvedCoin,
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
  }, [resolvedClient, resolvedCoin]);

  return { bids, asks, spread, midPrice, isLoading, error };
}
