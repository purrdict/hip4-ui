/**
 * useMarket — subscribe to a single market's data with minimal rerenders.
 *
 * Only rerenders when THIS market's prices change, not when other markets update.
 * Uses useSyncExternalStore with a module-level price store for efficient fan-out.
 *
 * Usage:
 *   const { yesMid, noMid, minShares } = useMarket(market)
 *   // or with explicit client:
 *   const { yesMid, noMid } = useMarket(client, market)
 */

"use client";

import {
  useSyncExternalStore,
  useCallback,
  useState,
  useEffect,
} from "react";
import type { Market } from "@purrdict/hip4";
import { getMinShares } from "@purrdict/hip4";
import type { HIP4Client } from "./use-hip4-client.js";
import { useHIP4Context } from "./hip4-provider.js";
import {
  initPriceStore,
  subscribeCoin,
  getMid,
} from "./market-price-store.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseMarketResult {
  /** Current mid price for the YES coin (0–1), or null before first update */
  yesMid: number | null;
  /** Current mid price for the NO coin (0–1), or null before first update */
  noMid: number | null;
  /** Minimum shares required for a valid order at the current mark price */
  minShares: number;
  /** True until the first price update arrives */
  isLoading: boolean;
  /** Non-null if initialization failed */
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Snapshot cache — prevents reference-equality rerenders when values are unchanged
// ---------------------------------------------------------------------------

interface SnapshotEntry {
  yes: string | null;
  no: string | null;
  ref: { yesMid: number | null; noMid: number | null };
}

const snapshotCache = new Map<string, SnapshotEntry>();

function getCachedSnapshot(
  yesCoin: string,
  noCoin: string,
): { yesMid: number | null; noMid: number | null } {
  const yes = getMid(yesCoin);
  const no = getMid(noCoin);
  const cached = snapshotCache.get(yesCoin);
  if (cached && cached.yes === yes && cached.no === no) {
    return cached.ref;
  }
  const ref = {
    yesMid: yes !== null ? parseFloat(yes) : null,
    noMid: no !== null ? parseFloat(no) : null,
  };
  snapshotCache.set(yesCoin, { yes, no, ref });
  return ref;
}

// Server-side snapshot — stable null values for SSR
const SERVER_SNAPSHOT: { yesMid: null; noMid: null } = {
  yesMid: null,
  noMid: null,
};

// ---------------------------------------------------------------------------
// Hook overloads
// ---------------------------------------------------------------------------

export function useMarket(client: HIP4Client, market: Market): UseMarketResult;
export function useMarket(market: Market): UseMarketResult;
export function useMarket(
  clientOrMarket: HIP4Client | Market,
  market?: Market,
): UseMarketResult {
  // ---------------------------------------------------------------------------
  // Overload resolution
  // "Market" objects have yesCoin and noCoin fields; HIP4Client has info/sub/close.
  // ---------------------------------------------------------------------------
  const isMarketMode =
    "yesCoin" in clientOrMarket && "noCoin" in clientOrMarket && !market;

  const explicitClient: HIP4Client | undefined = isMarketMode
    ? undefined
    : (clientOrMarket as HIP4Client);

  const resolvedMarket: Market = isMarketMode
    ? (clientOrMarket as Market)
    : (market as Market);

  const ctxClient = useHIP4Context();
  const resolvedClient = explicitClient ?? ctxClient;

  if (!resolvedClient) {
    throw new Error(
      "useMarket requires a HIP4Client. Either pass it as an argument or wrap your app in <HIP4Provider>.",
    );
  }

  // ---------------------------------------------------------------------------
  // 1. Initialize the price store on first render (idempotent)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    initPriceStore(resolvedClient.sub, resolvedClient.info);
  }, [resolvedClient]);

  // ---------------------------------------------------------------------------
  // 2. Subscribe to this market's YES and NO coins via useSyncExternalStore
  //    Only this component rerenders when its coins' prices change.
  // ---------------------------------------------------------------------------
  const { yesCoin, noCoin } = resolvedMarket;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsub1 = subscribeCoin(yesCoin, onStoreChange);
      const unsub2 = subscribeCoin(noCoin, onStoreChange);
      return () => {
        unsub1();
        unsub2();
      };
    },
    [yesCoin, noCoin],
  );

  const getSnapshot = useCallback(
    () => getCachedSnapshot(yesCoin, noCoin),
    [yesCoin, noCoin],
  );

  const getServerSnapshot = useCallback(() => SERVER_SNAPSHOT, []);

  const mids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // ---------------------------------------------------------------------------
  // 3. Compute minShares from spotMetaAndAssetCtxs (one-time fetch per coin)
  // ---------------------------------------------------------------------------
  const [minShares, setMinShares] = useState<number>(20);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    resolvedClient.info
      .spotMetaAndAssetCtxs()
      .then(([spotMeta, ctxs]) => {
        if (cancelled) return;

        // Match the YES coin name against spot meta tokens list
        const tokenIdx = spotMeta.tokens.findIndex(
          (t: { name: string }) => t.name === yesCoin,
        );
        const matchedCtx = tokenIdx >= 0 ? ctxs[tokenIdx] : undefined;

        if (matchedCtx && matchedCtx.markPx) {
          const px = parseFloat(matchedCtx.markPx);
          setMinShares(getMinShares(px));
        } else {
          // Default: 20 shares (assumes markPx near 0.5)
          setMinShares(20);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedClient, yesCoin]);

  return {
    ...mids,
    minShares,
    isLoading: mids.yesMid === null,
    error,
  };
}
