/**
 * useTrade — place and cancel orders using the SDK.
 *
 * Requires both a client (for info queries) and a signer (for signing).
 * Returns buy/sell/cancel functions with loading and error state.
 *
 * Usage:
 *   const { buy, sell, cancel, isSubmitting, lastResult, error } = useTrade(client, signer);
 *
 *   await buy({ coin: "#9860", shares: 20, price: 0.55, tif: "Gtc" });
 */

"use client";

import { useState, useCallback } from "react";
import { placeOrder, cancelOrder } from "@purrdict/hip4";
import type { HIP4Client, OrderStatus, HIP4Config } from "@purrdict/hip4";
import type { HIP4Signer } from "./use-hip4-signer.js";

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
   * Optional builder fee override for this order.
   * If not provided, uses client.config.builderFee.
   */
  builder?: {
    address: string;
    fee: number;
  };
}

export interface UseTadeResult {
  /**
   * Place a buy order.
   * @returns OrderStatus or null if no signer is connected.
   */
  buy: (params: TradeParams) => Promise<OrderStatus | null>;
  /**
   * Place a sell order.
   * @returns OrderStatus or null if no signer is connected.
   */
  sell: (params: TradeParams) => Promise<OrderStatus | null>;
  /**
   * Cancel an order by asset index + order ID.
   * @returns true if cancelled, false on error or if no signer.
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
 * @param client  HIP4Client from useHIP4Client()
 * @param signer  HIP4Signer from useHIP4Signer() — null if wallet not connected
 */
export function useTrade(
  client: HIP4Client,
  signer: HIP4Signer | null,
): UseTadeResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const submitOrder = useCallback(
    async (params: TradeParams, isBuy: boolean): Promise<OrderStatus | null> => {
      if (!signer) return null;

      setIsSubmitting(true);
      setError(null);

      try {
        // Build effective config — allow per-order builder override.
        const effectiveConfig: HIP4Config = params.builder
          ? {
              ...client.config,
              builderAddress: params.builder.address.toLowerCase(),
              builderFee: params.builder.fee,
            }
          : client.config;

        const exchange = client.exchange(signer.walletClient);

        const result = await placeOrder(exchange, effectiveConfig, {
          asset: params.asset,
          isBuy,
          price: params.price,
          size: params.shares,
          tif: params.tif ?? "Gtc",
          markPx: params.markPx,
        });

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
    [client, signer],
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
      if (!signer) return false;

      const exchange = client.exchange(signer.walletClient);
      return cancelOrder(exchange, asset, oid);
    },
    [client, signer],
  );

  return { buy, sell, cancel, isSubmitting, lastResult, error };
}
