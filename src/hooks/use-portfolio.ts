/**
 * usePortfolio — fetch balances, positions, and open orders for a user.
 *
 * Usage:
 *   const { usdh, positions, openOrders, isLoading } = usePortfolio(client, address);
 */

"use client";

import { useState, useEffect } from "react";
import { getBalances, fetchOpenOrders } from "@purrdict/hip4";
import type { HIP4Client, TokenBalance, OpenOrder } from "@purrdict/hip4";

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
 * @param client   HIP4Client from useHIP4Client()
 * @param address  Wallet address — pass null when no wallet is connected
 */
export function usePortfolio(
  client: HIP4Client,
  address: string | null,
): UsePortfolioResult {
  const [usdh, setUsdh] = useState<TokenBalance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!address) {
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
        const [balances, orders] = await Promise.all([
          getBalances(client.info, address!),
          fetchOpenOrders(client.info, address!),
        ]);

        if (cancelled) return;

        setUsdh(balances.usdh);

        // Extract outcome token positions from the "+" prefixed coins.
        const pos: Position[] = [];
        balances.tokens.forEach((bal, coin) => {
          // Outcome tokens: "+" + coinNum. Positive balance = long position.
          if (coin.startsWith("+") && bal.total > 0) {
            // Convert "+9860" → "#9860" for display.
            const displayCoin = "#" + coin.slice(1);
            pos.push({ coin: displayCoin, shares: bal.total });
          }
        });
        setPositions(pos);

        setOpenOrders(orders);
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
  }, [client, address, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  return { usdh, positions, openOrders, isLoading, error, refresh };
}
