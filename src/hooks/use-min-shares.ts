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
import { getMinShares } from "@purrdict/hip4";
import type { HIP4Client } from "./use-hip4-client.js";
import { useHIP4Context } from "./hip4-provider.js";

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
 * @param client  HIP4Client — optional when wrapped in <HIP4Provider>
 * @param coin    Coin name — e.g. "#9860" for a prediction market yes coin
 */
export function useMinShares(
  client: HIP4Client | undefined,
  coin: string,
): UseMinSharesResult;
export function useMinShares(
  coin: string,
): UseMinSharesResult;
export function useMinShares(
  clientOrCoin: HIP4Client | string | undefined,
  coin?: string,
): UseMinSharesResult {
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
      "useMinShares requires a HIP4Client. Either pass it as an argument or wrap your app in <HIP4Provider>.",
    );
  }
  const safeClient = resolvedClient;

  const [minShares, setMinShares] = useState<number>(20);
  const [markPx, setMarkPx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!resolvedCoin) return;

    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // spotMetaAndAssetCtxs returns [SpotMetaResponse, SpotAssetCtxSchema[]]
        // SpotMetaResponse.tokens[i].name corresponds to SpotAssetCtxSchema[i].
        // Prediction market coins appear as "#N" (e.g. "#9860") in token names.
        const [spotMeta, ctxs] = await safeClient.info.spotMetaAndAssetCtxs();

        if (cancelled) return;

        // Match the coin name against the spot meta tokens list.
        const tokenIdx = spotMeta.tokens.findIndex((t) => t.name === resolvedCoin);
        const matchedCtx = tokenIdx >= 0 ? ctxs[tokenIdx] : undefined;

        if (matchedCtx && matchedCtx.markPx) {
          const px = parseFloat(matchedCtx.markPx);
          setMarkPx(px);
          setMinShares(getMinShares(px));
        } else {
          // Fall back: default to 20 shares (assumes markPx near 0.5).
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

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [resolvedClient, resolvedCoin]);

  return { minShares, markPx, isLoading, error };
}
