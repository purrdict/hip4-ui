/**
 * useMinShares — compute the minimum order size for a prediction market coin.
 *
 * Fetches spotMetaAndAssetCtxs to find the mark price, then applies the
 * community formula: ceil(10 / max(min(markPx, 1 - markPx), 0.01))
 *
 * Usage:
 *   const minShares = useMinShares(client, "#9860");
 *   // → e.g. 20 at markPx = 0.5
 */

"use client";

import { useState, useEffect } from "react";
import { getMinShares, fetchSpotMetaAndAssetCtxs } from "@purrdict/hip4";
import type { HIP4Client } from "@purrdict/hip4";

export interface UseMinSharesResult {
  /** Minimum shares required for a valid order at the current mark price */
  minShares: number;
  /** The current mark price fetched from spotMetaAndAssetCtxs */
  markPx: number | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch the minimum order size for a prediction market coin.
 *
 * @param client  HIP4Client from useHIP4Client()
 * @param coin    Coin name — e.g. "#9860" for a prediction market yes coin
 */
export function useMinShares(
  client: HIP4Client,
  coin: string,
): UseMinSharesResult {
  const [minShares, setMinShares] = useState<number>(20);
  const [markPx, setMarkPx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!coin) return;

    let cancelled = false;

    async function fetch() {
      setIsLoading(true);
      setError(null);

      try {
        const [, assetCtxs] = await fetchSpotMetaAndAssetCtxs(client.info);

        if (cancelled) return;

        // Find the asset context whose coin matches.
        const ctx = assetCtxs.find((a) => a.coin === coin);

        if (ctx && ctx.markPx) {
          const px = parseFloat(ctx.markPx);
          setMarkPx(px);
          setMinShares(getMinShares(px));
        } else {
          // Fall back to mid price from allMids if no ctx found.
          // Default to 20 shares (assumes markPx near 0.5).
          setMarkPx(null);
          setMinShares(20);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, [client, coin]);

  return { minShares, markPx, isLoading, error };
}
