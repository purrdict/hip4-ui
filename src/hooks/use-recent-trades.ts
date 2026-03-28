/**
 * useRecentTrades — subscribes to recent trades for a prediction market coin.
 *
 * Returns the latest trades as they happen via WebSocket.
 *
 * Usage:
 *   const { trades, isLoading } = useRecentTrades(client, coin)
 *   // or with HIP4Provider:
 *   const { trades } = useRecentTrades(coin)
 */

"use client";

import { useState, useEffect, useRef } from "react";
import type { HIP4Client } from "./use-hip4-client.js";
import { useHIP4Context } from "./hip4-provider.js";

export interface RecentTrade {
  /** "B" for buy, "S" for sell */
  side: "B" | "S";
  /** Fill price (0-1) */
  price: number;
  /** Number of shares */
  size: number;
  /** Timestamp in ms */
  time: number;
}

export interface UseRecentTradesResult {
  trades: RecentTrade[];
  isLoading: boolean;
  error: Error | null;
}

/** Overload: explicit client + coin */
export function useRecentTrades(client: HIP4Client, coin: string): UseRecentTradesResult;
/** Overload: context mode — just coin */
export function useRecentTrades(coin: string): UseRecentTradesResult;
export function useRecentTrades(
  clientOrCoin: HIP4Client | string,
  maybeCoin?: string,
): UseRecentTradesResult {
  const isContextMode = typeof clientOrCoin === "string";
  const coin = isContextMode ? clientOrCoin : maybeCoin!;
  const explicitClient = isContextMode ? undefined : (clientOrCoin as HIP4Client);

  const ctxClient = useHIP4Context();
  const resolvedClient = explicitClient ?? ctxClient;

  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    if (!resolvedClient || !coin) return;

    let cancelled = false;
    setIsLoading(true);

    // Fetch initial recent trades
    resolvedClient.info
      .recentTrades({ coin })
      .then((data: any[]) => {
        if (cancelled) return;
        const parsed: RecentTrade[] = data.slice(0, 50).map((t: any) => ({
          side: t.side as "B" | "S",
          price: parseFloat(t.px),
          size: parseFloat(t.sz),
          time: t.time,
        }));
        setTrades(parsed);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err);
        setIsLoading(false);
      });

    // Subscribe to live trades
    resolvedClient.sub
      .trades({ coin }, (data: any) => {
        if (cancelled) return;
        const newTrades: RecentTrade[] = (data.data ?? data).map((t: any) => ({
          side: t.side as "B" | "S",
          price: parseFloat(t.px),
          size: parseFloat(t.sz),
          time: t.time,
        }));
        setTrades((prev) => [...newTrades, ...prev].slice(0, 50));
      })
      .then((sub: any) => {
        if (!cancelled) subRef.current = sub;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      subRef.current?.unsubscribe();
      subRef.current = null;
    };
  }, [resolvedClient, coin]);

  return { trades, isLoading, error };
}
