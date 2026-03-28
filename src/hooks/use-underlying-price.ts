/**
 * useUnderlyingPrice — subscribe to the underlying asset's perp price.
 *
 * Returns historical prices (from candleSnapshot) + live updates via allMids.
 * Designed to feed LivePriceChart with PricePoint[] data.
 *
 * The underlying asset (BTC, ETH, SOL, HYPE) is what the prediction market
 * resolves against — NOT the prediction coin's mid price. This hook gives
 * you the perp mark price for the strike comparison.
 *
 * Usage:
 *   const { prices, currentPrice } = useUnderlyingPrice("BTC", { historyMinutes: 60 })
 *   <LivePriceChart symbol="BTC" prices={prices} currentPrice={currentPrice} />
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ISubscription } from "@nktkas/hyperliquid";
import type { HIP4Client } from "./use-hip4-client.js";
import { useHIP4Context } from "./hip4-provider.js";
import type { PricePoint } from "../components/live-price-chart.js";

const MAX_POINTS = 3600;

export interface UseUnderlyingPriceOptions {
  /** How many minutes of history to prefetch via candleSnapshot. Default: 60. */
  historyMinutes?: number;
}

export interface UseUnderlyingPriceResult {
  /** Historical + live PricePoint[] — pass directly to LivePriceChart */
  prices: PricePoint[];
  /** Latest known price — pass as currentPrice to LivePriceChart */
  currentPrice: number | null;
  isLoading: boolean;
  error: Error | null;
}

/** Overload: explicit client + underlying */
export function useUnderlyingPrice(
  client: HIP4Client,
  underlying: string,
  opts?: UseUnderlyingPriceOptions,
): UseUnderlyingPriceResult;
/** Overload: context mode — just underlying */
export function useUnderlyingPrice(
  underlying: string,
  opts?: UseUnderlyingPriceOptions,
): UseUnderlyingPriceResult;
export function useUnderlyingPrice(
  clientOrUnderlying: HIP4Client | string,
  underlyingOrOpts?: string | UseUnderlyingPriceOptions,
  maybeOpts?: UseUnderlyingPriceOptions,
): UseUnderlyingPriceResult {
  const isContextMode = typeof clientOrUnderlying === "string";
  const underlying = isContextMode
    ? (clientOrUnderlying as string)
    : (underlyingOrOpts as string);
  const opts: UseUnderlyingPriceOptions = isContextMode
    ? ((underlyingOrOpts as UseUnderlyingPriceOptions | undefined) ?? {})
    : (maybeOpts ?? {});
  const explicitClient = isContextMode ? undefined : (clientOrUnderlying as HIP4Client);

  const { historyMinutes = 60 } = opts;

  const ctxClient = useHIP4Context();
  const resolvedClient = explicitClient ?? ctxClient;

  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const subRef = useRef<ISubscription | null>(null);
  const seededRef = useRef(false);
  const currentPriceRef = useRef<number | null>(null);

  // Append a data point with deduplication. Mutates the array so callers can
  // hold a ref to it without it being replaced each render.
  const appendPoint = useCallback((pts: PricePoint[], time: number, value: number): boolean => {
    const last = pts[pts.length - 1];
    if (last && time < last.time) return false;
    if (last && time === last.time) {
      last.value = value;
      return true;
    }
    if (pts.length >= MAX_POINTS) {
      pts.splice(0, pts.length - MAX_POINTS + 1);
    }
    pts.push({ time, value });
    return true;
  }, []);

  useEffect(() => {
    if (!resolvedClient || !underlying) return;

    let cancelled = false;
    seededRef.current = false;
    setIsLoading(true);
    setError(null);
    setPrices([]);
    setCurrentPrice(null);
    currentPriceRef.current = null;

    // Working array — we build into this then set state once.
    const pts: PricePoint[] = [];

    async function init() {
      try {
        // 1. Fetch historical candles to seed the chart.
        const endTime = Date.now();
        const startTime = endTime - historyMinutes * 60 * 1000;

        try {
          const candles = await resolvedClient!.info.candleSnapshot({
            coin: underlying,
            interval: "1m",
            startTime,
            endTime,
          });

          if (!cancelled && candles && candles.length > 0) {
            // Use closing price + closing timestamp for each candle.
            const seen = new Set<number>();
            for (const c of candles) {
              const timeSec = Math.floor(c.T / 1000);
              if (seen.has(timeSec)) continue;
              seen.add(timeSec);
              pts.push({ time: timeSec, value: parseFloat(c.c) });
            }
            pts.sort((a, b) => a.time - b.time);

            // Seed the current price from the last candle.
            if (pts.length > 0) {
              const last = pts[pts.length - 1];
              currentPriceRef.current = last.value;
              if (!cancelled) {
                setCurrentPrice(last.value);
                setPrices([...pts]);
              }
            }
          }
        } catch {
          // History fetch failure is non-fatal — we still subscribe live.
        }

        if (cancelled) return;

        seededRef.current = true;

        // 2. Subscribe to live allMids and filter for the underlying symbol.
        subRef.current = await resolvedClient!.sub.allMids((event) => {
          if (cancelled) return;

          const mids = event.mids as Record<string, string>;
          const rawPrice = mids[underlying];
          if (!rawPrice) return;

          const price = parseFloat(rawPrice);
          if (isNaN(price) || price <= 0) return;

          const nowSec = Math.floor(Date.now() / 1000);
          appendPoint(pts, nowSec, price);
          currentPriceRef.current = price;
          setCurrentPrice(price);
          setPrices([...pts]);
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
  }, [resolvedClient, underlying, historyMinutes]);

  return { prices, currentPrice, isLoading, error };
}
