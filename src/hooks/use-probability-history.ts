/**
 * useProbabilityHistory — subscribe to probability history for multi-outcome markets.
 *
 * Accepts an array of Market objects (outcomes in a question group).
 * Returns OutcomeSeries[] ready for <ProbabilityChart series={...} />.
 *
 * Usage:
 *   const { series, isLoading } = useProbabilityHistory(questionMarkets)
 *   <ProbabilityChart series={series} />
 */

"use client";

import { useState, useEffect, useRef } from "react";
import type { ISubscription } from "@nktkas/hyperliquid";
import type { Market } from "@purrdict/hip4";
import type { HIP4Client } from "./use-hip4-client.js";
import { useHIP4Context } from "./hip4-provider.js";

/** A single outcome's data series — same shape as ProbabilityChart expects */
export interface OutcomeSeries {
  id: string;
  label: string;
  color: string;
  data: Array<{ time: number; value: number }>;
  currentValue: number;
}

/** Color palette for outcome lines — 8 visually distinct colors */
export const OUTCOME_COLORS = [
  "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6",
  "#10b981", "#06b6d4", "#f43f5e", "#84cc16",
];

/** Max data points kept per series */
const MAX_POINTS = 1440; // 24h of 1-minute candles

/** History window in minutes. Default: 60 */
const DEFAULT_HISTORY_MINUTES = 60;

export interface UseProbabilityHistoryOptions {
  /** How many minutes of history to prefetch via candleSnapshot. Default: 60. */
  historyMinutes?: number;
}

export interface UseProbabilityHistoryResult {
  /** OutcomeSeries[] — pass directly to <ProbabilityChart series={...} /> */
  series: OutcomeSeries[];
  isLoading: boolean;
  error: Error | null;
}

/** Overload: explicit client + markets */
export function useProbabilityHistory(
  client: HIP4Client,
  markets: Market[],
  opts?: UseProbabilityHistoryOptions,
): UseProbabilityHistoryResult;
/** Overload: context mode — just markets */
export function useProbabilityHistory(
  markets: Market[],
  opts?: UseProbabilityHistoryOptions,
): UseProbabilityHistoryResult;
export function useProbabilityHistory(
  clientOrMarkets: HIP4Client | Market[],
  marketsOrOpts?: Market[] | UseProbabilityHistoryOptions,
  maybeOpts?: UseProbabilityHistoryOptions,
): UseProbabilityHistoryResult {
  const isContextMode = Array.isArray(clientOrMarkets);
  const markets: Market[] = isContextMode
    ? (clientOrMarkets as Market[])
    : (marketsOrOpts as Market[]);
  const opts: UseProbabilityHistoryOptions = isContextMode
    ? ((marketsOrOpts as UseProbabilityHistoryOptions | undefined) ?? {})
    : (maybeOpts ?? {});
  const explicitClient = isContextMode ? undefined : (clientOrMarkets as HIP4Client);

  const { historyMinutes = DEFAULT_HISTORY_MINUTES } = opts;

  const ctxClient = useHIP4Context();
  const resolvedClient = explicitClient ?? ctxClient;

  const [series, setSeries] = useState<OutcomeSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const subRef = useRef<ISubscription | null>(null);

  useEffect(() => {
    if (!resolvedClient || !markets || markets.length === 0) {
      setSeries([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    // Mutable per-series data arrays, keyed by coin
    const seriesData = new Map<
      string,
      Array<{ time: number; value: number }>
    >();
    const coinToIdx = new Map<string, number>();

    for (let i = 0; i < markets.length; i++) {
      const coin = markets[i].yesCoin;
      seriesData.set(coin, []);
      coinToIdx.set(coin, i);
    }

    /** Append a point with dedup. Mutates array in place. */
    function appendPoint(
      pts: Array<{ time: number; value: number }>,
      time: number,
      value: number,
    ): void {
      const last = pts[pts.length - 1];
      if (last && time < last.time) return;
      if (last && time === last.time) {
        last.value = value;
        return;
      }
      if (pts.length >= MAX_POINTS) {
        pts.splice(0, pts.length - MAX_POINTS + 1);
      }
      pts.push({ time, value });
    }

    /** Snapshot current state to React */
    function flush() {
      if (cancelled) return;

      const currentValues = new Map<string, number>();
      // Capture latest values before building snapshot
      for (const [coin, pts] of seriesData) {
        if (pts.length > 0) {
          currentValues.set(coin, pts[pts.length - 1].value);
        }
      }

      const snapshot: OutcomeSeries[] = markets.map((m, i) => {
        const coin = m.yesCoin;
        const pts = seriesData.get(coin) ?? [];
        return {
          id: coin,
          label: m.underlying ?? coin,
          color: OUTCOME_COLORS[i % OUTCOME_COLORS.length],
          data: [...pts],
          currentValue: currentValues.get(coin) ?? 0,
        };
      });

      setSeries(snapshot);
    }

    async function init() {
      try {
        const endTime = Date.now();
        const startTime = endTime - historyMinutes * 60 * 1000;

        // 1. Fetch candle history for each market's yesCoin in parallel
        const fetchPromises = markets.map(async (m) => {
          const coin = m.yesCoin;
          try {
            const candles = await resolvedClient!.info.candleSnapshot({
              coin,
              interval: "1m",
              startTime,
              endTime,
            });

            if (cancelled) return;

            const pts = seriesData.get(coin);
            if (!pts || !candles || candles.length === 0) return;

            const seen = new Set<number>();
            for (const c of candles) {
              const timeSec = Math.floor(c.T / 1000);
              if (seen.has(timeSec)) continue;
              seen.add(timeSec);
              appendPoint(pts, timeSec, parseFloat(c.c));
            }
            pts.sort((a, b) => a.time - b.time);
          } catch {
            // Non-fatal — WS will fill in live data
          }
        });

        await Promise.all(fetchPromises);
        if (cancelled) return;

        flush();

        // 2. Subscribe to allMids for live updates
        const trackedCoins = new Set(markets.map((m) => m.yesCoin));

        subRef.current = await resolvedClient!.sub.allMids((event) => {
          if (cancelled) return;

          const mids = event.mids as Record<string, string>;
          let anyUpdate = false;

          for (const coin of trackedCoins) {
            const rawPrice = mids[coin];
            if (!rawPrice) continue;

            const price = parseFloat(rawPrice);
            if (isNaN(price) || price < 0 || price > 1) continue;

            const pts = seriesData.get(coin);
            if (!pts) continue;

            const nowSec = Math.floor(Date.now() / 1000);
            const prevLen = pts.length;
            appendPoint(pts, nowSec, price);
            if (pts.length !== prevLen || (pts.length > 0 && pts[pts.length - 1].value !== price)) {
              anyUpdate = true;
            }
          }

          if (anyUpdate) flush();
        });

        if (!cancelled) {
          setIsLoading(false);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedClient, markets, historyMinutes]);

  return { series, isLoading, error };
}
