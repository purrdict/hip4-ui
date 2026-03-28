/**
 * useTrade — prepare and submit orders for HIP-4 prediction markets.
 *
 * Constructs validated order payloads using buildOrderAction from @purrdict/hip4.
 * Actual signing and submission is delegated to the caller via the exchange param.
 *
 * The caller is responsible for creating an ExchangeClient with their wallet:
 *
 *   import { ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
 *   const exchange = new ExchangeClient({ transport, wallet: walletClient });
 *   const { buy, sell, cancel } = useTrade(exchange);
 *
 * Usage (minimal):
 *   const { buy, sell, cancel, isSubmitting, lastResult, error } = useTrade(exchange);
 *   await buy({ coin: "#9860", asset: 100009860, shares: 20, price: 0.55 });
 */

"use client";

import { useState, useCallback } from "react";
import { buildOrderAction } from "@purrdict/hip4";
import type { OrderStatus } from "@purrdict/hip4";
import type { ExchangeClient } from "@nktkas/hyperliquid";

export interface TradeParams {
  /** Coin name, e.g. "#9860" */
  coin: string;
  /** Prediction market order asset index: 100_000_000 + coinNum */
  asset: number;
  /** Number of shares (whole numbers only) */
  shares: number;
  /** Limit price (will be tick-aligned and trailing zeros stripped) */
  price: number;
  /** Time in force. Default: "Gtc" */
  tif?: "Gtc" | "Ioc" | "Alo";
  /**
   * Optional mark price — enables getMinShares() validation.
   * If omitted, only the MIN_NOTIONAL check is applied.
   */
  markPx?: number;
  /**
   * Optional builder fee for this order (sell side only).
   */
  builder?: {
    address: string;
    fee: number;
  };
}

export interface UseTradeResult {
  /**
   * Place a buy order.
   * @returns OrderStatus or null if no exchange client available.
   */
  buy: (params: TradeParams) => Promise<OrderStatus | null>;
  /**
   * Place a sell order.
   * @returns OrderStatus or null if no exchange client available.
   */
  sell: (params: TradeParams) => Promise<OrderStatus | null>;
  /**
   * Cancel an order by asset index + order ID.
   * @returns true if cancelled, false on error or if no exchange client.
   */
  cancel: (asset: number, oid: number) => Promise<boolean>;
  /** True while an order is being submitted */
  isSubmitting: boolean;
  /** Result of the last order placement */
  lastResult: OrderStatus | null;
  /** Error from the last order placement */
  error: Error | null;
}

/**
 * Place and cancel orders for a HIP-4 prediction market.
 *
 * @param exchange  ExchangeClient from @nktkas/hyperliquid — null if wallet not connected.
 *                  Create one with: new ExchangeClient({ transport, wallet: walletClient })
 */
export function useTrade(exchange: ExchangeClient | null): UseTradeResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const submitOrder = useCallback(
    async (params: TradeParams, isBuy: boolean): Promise<OrderStatus | null> => {
      if (!exchange) return null;

      setIsSubmitting(true);
      setError(null);

      try {
        const actionResult = buildOrderAction({
          asset: params.asset,
          isBuy,
          price: params.price,
          size: params.shares,
          tif: params.tif ?? "Gtc",
          markPx: params.markPx,
          builderAddress: params.builder?.address,
          builderFee: params.builder?.fee,
        });

        if ("err" in actionResult) {
          const e = new Error(actionResult.err);
          setError(e);
          return { error: actionResult.err };
        }

        // Cast to any to bridge the SDK's OrderAction tif: string type with
        // nktkas's stricter "Gtc" | "Ioc" | "Alo" | "FrontendMarket" literal.
        // buildOrderAction already validates tif is one of the accepted values.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await exchange.order(actionResult.ok as any);

        // Parse the nktkas response into our OrderStatus type.
        let result: OrderStatus;
        const statuses = response.response?.data?.statuses ?? [];
        const first = statuses[0];

        if (!first) {
          result = { error: "No order status in response" };
        } else if (typeof first === "string") {
          // "waitingForFill" | "waitingForTrigger"
          result = { error: `Unexpected status: ${first}` };
        } else if ("resting" in first) {
          result = { resting: { oid: first.resting.oid } };
        } else if ("filled" in first) {
          result = {
            filled: {
              totalSz: first.filled.totalSz,
              avgPx: first.filled.avgPx,
              oid: first.filled.oid,
            },
          };
        } else if ("error" in first) {
          result = { error: (first as { error: string }).error };
        } else {
          result = { error: "Unknown order status" };
        }

        setLastResult(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return { error: e.message };
      } finally {
        setIsSubmitting(false);
      }
    },
    [exchange],
  );

  const buy = useCallback(
    (params: TradeParams) => submitOrder(params, true),
    [submitOrder],
  );

  const sell = useCallback(
    (params: TradeParams) => submitOrder(params, false),
    [submitOrder],
  );

  const cancel = useCallback(
    async (asset: number, oid: number): Promise<boolean> => {
      if (!exchange) return false;

      try {
        await exchange.cancel({ cancels: [{ a: asset, o: oid }] });
        return true;
      } catch {
        return false;
      }
    },
    [exchange],
  );

  return { buy, sell, cancel, isSubmitting, lastResult, error };
}
