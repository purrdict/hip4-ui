/**
 * useUnderlyingPrice — subscribe to the underlying asset's perp markPx.
 *
 * Returns live markPx samples for charting. Designed to feed LivePriceChart.
 *
 * Recurring `underlying:COIN` markets settle on SPI markPx, not allMids mid.
 * Candle backfill is intentionally omitted — candleSnapshot closes are
 * mid-based and would disagree with the settlement reference.
 *
 * Usage:
 *   const { prices, currentPrice } = useUnderlyingPrice("BTC")
 *   <LivePriceChart symbol="BTC" prices={prices} currentPrice={currentPrice} />
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ISubscription } from "@nktkas/hyperliquid";

import type { HIP4Client } from "./use-hip4-client.js";
import { useHIP4Context } from "./hip4-provider.js";

/** A single time/value point for charting. */
export interface PricePoint {
  time: number;
  value: number;
}

const MAX_POINTS = 3600;

export interface UseUnderlyingPriceOptions {
  /** @deprecated Ignored — markPx history is live-only (no mid candle backfill). */
  historyMinutes?: number;
}

export interface UseUnderlyingPriceResult {
  /** Live markPx samples — pass directly to LivePriceChart */
  prices: PricePoint[];
  /** Latest markPx — pass as currentPrice to LivePriceChart */
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
  const explicitClient = isContextMode ? undefined : (clientOrUnderlying as HIP4Client);

  const ctxClient = useHIP4Context();
  const resolvedClient = explicitClient ?? ctxClient;

  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const subRef = useRef<ISubscription | null>(null);
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setIsLoading(true);
    setError(null);
    setPrices([]);
    setCurrentPrice(null);

    const pts: PricePoint[] = [];
    const latestRef = { current: null as number | null };

    const commit = () => {
      if (cancelled) return;
      setPrices([...pts]);
      setCurrentPrice(latestRef.current);
    };

    const recordMarkPx = (price: number) => {
      if (!Number.isFinite(price) || price <= 0) return;
      latestRef.current = price;
      appendPoint(pts, Math.floor(Date.now() / 1000), price);
      commit();
    };

    async function init() {
      try {
        try {
          const [meta, ctxs] = await resolvedClient!.info.metaAndAssetCtxs();
          const index = meta.universe.findIndex((entry) => entry.name === underlying);
          const raw = index >= 0 ? ctxs[index]?.markPx : undefined;
          const seed = raw ? Number.parseFloat(raw) : Number.NaN;
          if (Number.isFinite(seed) && seed > 0) {
            recordMarkPx(seed);
          }
        } catch {
          // Non-fatal — WS subscription will provide markPx.
        }

        if (cancelled) return;

        subRef.current = await resolvedClient!.sub.activeAssetCtx(
          { coin: underlying },
          (event) => {
            if (cancelled) return;
            const raw = event.ctx?.markPx;
            if (!raw) return;
            recordMarkPx(Number.parseFloat(raw));
          },
        );

        keepaliveRef.current = setInterval(() => {
          if (cancelled || latestRef.current == null) return;
          const nowSec = Math.floor(Date.now() / 1000);
          const last = pts[pts.length - 1];
          if (last && nowSec <= last.time) return;
          appendPoint(pts, nowSec, latestRef.current);
          commit();
        }, 1000);

        if (!cancelled) setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (keepaliveRef.current) {
        clearInterval(keepaliveRef.current);
        keepaliveRef.current = null;
      }
      if (subRef.current) {
        subRef.current.unsubscribe().catch(() => undefined);
        subRef.current = null;
      }
    };
  }, [appendPoint, resolvedClient, underlying]);

  return { prices, currentPrice, isLoading, error };
}
