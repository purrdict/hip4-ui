/**
 * usePortfolio — fetch balances, positions, and open orders for a user.
 *
 * Uses @nktkas/hyperliquid InfoClient methods directly:
 *   - client.info.spotClearinghouseState({ user }) for token balances
 *   - client.info.frontendOpenOrders({ user }) for resting orders
 *
 * Usage:
 *   const { usdh, positions, openOrders, isLoading } = usePortfolio(client, address);
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { HIP4Client } from "./use-hip4-client.js";
import { useHIP4Context } from "./hip4-provider.js";

/** A single token balance entry */
export interface TokenBalance {
  /** Coin symbol, e.g. "USDH", "#9860" */
  coin: string;
  /** Total balance as a number */
  total: number;
  /** Amount on hold (in open orders) as a number */
  hold: number;
  /** Entry notional value as a number */
  entryNtl: number;
}

/** A single open (resting) order */
export interface OpenOrder {
  /** Coin symbol */
  coin: string;
  /** Order side: "B" = buy, "A" = ask/sell */
  side: "B" | "A";
  /** Limit price as a string */
  limitPx: string;
  /** Size as a string */
  sz: string;
  /** Order ID */
  oid: number;
  /** Timestamp in ms when the order was placed */
  timestamp: number;
}

export interface Position {
  /** Coin name (e.g. "#9860") */
  coin: string;
  /** Number of shares held */
  shares: number;
}

export interface UsePortfolioResult {
  /** Free USDH balance */
  usdh: TokenBalance | null;
  /** Outcome token positions derived from spot balances */
  positions: Position[];
  /** Current open (resting) orders */
  openOrders: OpenOrder[];
  isLoading: boolean;
  error: Error | null;
  /** Manually trigger a refresh */
  refresh: () => void;
}

/**
 * Fetch portfolio data for a wallet address.
 *
 * @param client   HIP4Client — optional when wrapped in <HIP4Provider>
 * @param address  Wallet address — pass null when no wallet is connected
 */
export function usePortfolio(
  client: HIP4Client | undefined,
  address: string | null,
): UsePortfolioResult;
export function usePortfolio(
  address: string | null,
): UsePortfolioResult;
export function usePortfolio(
  clientOrAddress: HIP4Client | string | null | undefined,
  address?: string | null,
): UsePortfolioResult {
  // Overload resolution: if first arg is a string or null it's the address (context mode).
  const isContextMode =
    clientOrAddress === null ||
    typeof clientOrAddress === "string";
  const explicitClient: HIP4Client | undefined = isContextMode
    ? undefined
    : (clientOrAddress as HIP4Client | undefined);
  const resolvedAddress: string | null = isContextMode
    ? (clientOrAddress as string | null)
    : (address ?? null);

  const ctxClient = useHIP4Context();
  const resolvedClient = explicitClient ?? ctxClient;
  if (!resolvedClient) {
    throw new Error(
      "usePortfolio requires a HIP4Client. Either pass it as an argument or wrap your app in <HIP4Provider>.",
    );
  }
  const safeClient = resolvedClient;
  const [usdh, setUsdh] = useState<TokenBalance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!resolvedAddress) {
      setUsdh(null);
      setPositions([]);
      setOpenOrders([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [spotState, orders] = await Promise.all([
          safeClient.info.spotClearinghouseState({ user: resolvedAddress as `0x${string}` }),
          safeClient.info.frontendOpenOrders({ user: resolvedAddress as `0x${string}` }),
        ]);

        if (cancelled) return;

        // Find USDH balance (coin === "USDH").
        const usdhRaw = spotState.balances.find((b) => b.coin === "USDH");
        if (usdhRaw) {
          setUsdh({
            coin: usdhRaw.coin,
            total: parseFloat(usdhRaw.total),
            hold: parseFloat(usdhRaw.hold),
            entryNtl: parseFloat(usdhRaw.entryNtl),
          });
        } else {
          setUsdh(null);
        }

        // Extract outcome token positions from the "+" prefixed coins.
        const pos: Position[] = [];
        for (const bal of spotState.balances) {
          // Outcome tokens: "+" + coinNum. Positive balance = long position.
          if (bal.coin.startsWith("+") && parseFloat(bal.total) > 0) {
            // Convert "+9860" → "#9860" for display.
            const displayCoin = "#" + bal.coin.slice(1);
            pos.push({ coin: displayCoin, shares: parseFloat(bal.total) });
          }
        }
        setPositions(pos);

        // Map nktkas FrontendOpenOrderSchema to our OpenOrder type.
        setOpenOrders(
          orders.map((o) => ({
            coin: o.coin,
            side: o.side,
            limitPx: o.limitPx,
            sz: o.sz,
            oid: o.oid,
            timestamp: o.timestamp,
          })),
        );
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

    load();

    return () => {
      cancelled = true;
    };
  }, [resolvedClient, resolvedAddress, refreshToken]);

  // Stable refresh callback — prevents callers from needing to suppress
  // the dependency in their own useEffect/useCallback hooks.
  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  // Stable return object — prevents rerender cascades in consumers that
  // destructure the result and use it as an effect dependency.
  return useMemo(
    () => ({ usdh, positions, openOrders, isLoading, error, refresh }),
    [usdh, positions, openOrders, isLoading, error, refresh],
  );
}
