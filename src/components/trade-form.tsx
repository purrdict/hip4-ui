/**
 * TradeForm — full prediction market trade form.
 *
 * Handles all the HIP-4 footguns:
 *   - Tick-size aligned prices (5 significant figures)
 *   - Trailing zero stripping for signing
 *   - Minimum shares validation (getMinShares formula)
 *   - Market (FrontendMarket) vs limit (Gtc/Alo) order modes
 *   - Builder fee attachment
 *
 * Usage:
 *   <TradeForm
 *     market={market}
 *     side="Yes"
 *     currentPrice={0.55}
 *     minShares={20}
 *     onTrade={async (params) => await buy(params)}
 *   />
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { getMinShares, roundToTick, formatPrice } from "@purrdict/hip4";
import type { Market } from "@purrdict/hip4";
import type { TradeParams } from "../hooks/use-trade.js";
import { formatMidPrice, formatUsdh } from "../lib/format.js";

export type TradeSide = "Yes" | "No";
export type OrderMode = "market" | "limit";

export interface BuilderConfig {
  address: string;
  fee: number;
}

export interface TradeFormProps {
  market: Market;
  /** Active side */
  side: TradeSide;
  /** Called when user switches side */
  onSideChange?: (side: TradeSide) => void;
  /** Current mark/mid price for the selected side (0–1) */
  currentPrice?: number;
  /** Minimum shares for a valid order */
  minShares?: number;
  /** Optional builder fee */
  builder?: BuilderConfig;
  /** User's USDH balance (free) — used for balance validation */
  usdhBalance?: number;
  /**
   * Called when the user submits the form.
   * Receives the trade params. Caller is responsible for actual order placement.
   */
  onTrade?: (params: TradeParams) => Promise<void>;
  /** Whether the connected wallet has signed in */
  isConnected?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A complete trade form for HIP-4 prediction markets.
 *
 * Supports market and limit modes. Validates min shares, notional, and
 * balance. Formats price according to tick size rules before submission.
 */
export function TradeForm({
  market,
  side,
  onSideChange,
  currentPrice = 0.5,
  minShares = 20,
  builder,
  usdhBalance,
  onTrade,
  isConnected = false,
  className = "",
}: TradeFormProps) {
  const [orderMode, setOrderMode] = useState<OrderMode>("limit");
  const [sharesInput, setSharesInput] = useState("");
  const [priceInput, setPriceInput] = useState(() =>
    currentPrice > 0 ? formatPrice(currentPrice) : "0.5",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derived values
  const shares = parseInt(sharesInput, 10) || 0;
  const limitPrice = parseFloat(priceInput) || 0;

  // Effective price: market uses currentPrice, limit uses user input.
  const effectivePrice = orderMode === "market" ? currentPrice : limitPrice;

  // Estimated cost (buy) or proceeds (sell — approx).
  const estimatedCost = effectivePrice > 0 && shares > 0 ? effectivePrice * shares : 0;

  // Minimum shares for current price.
  const computedMinShares = useMemo(
    () => getMinShares(effectivePrice > 0 ? effectivePrice : 0.5),
    [effectivePrice],
  );

  const effectiveMinShares = Math.max(minShares, computedMinShares);

  // Validation
  const validationError = useMemo<string | null>(() => {
    if (shares <= 0) return null; // No input yet.
    if (!Number.isInteger(shares)) return "Shares must be whole numbers.";
    if (shares < effectiveMinShares)
      return `Minimum order: ${effectiveMinShares} shares at this price.`;
    if (orderMode === "limit") {
      if (limitPrice <= 0 || limitPrice >= 1)
        return "Limit price must be between 0 and 1.";
    }
    if (usdhBalance !== undefined && estimatedCost > usdhBalance)
      return `Insufficient USDH. Need ${formatUsdh(estimatedCost)}, have ${formatUsdh(usdhBalance)}.`;
    return null;
  }, [shares, effectiveMinShares, orderMode, limitPrice, usdhBalance, estimatedCost]);

  const canSubmit =
    isConnected &&
    shares >= effectiveMinShares &&
    validationError === null &&
    !isSubmitting;

  const asset = side === "Yes" ? market.yesAsset : market.noAsset;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !onTrade) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const tif = orderMode === "market" ? "Ioc" : "Gtc";
      // For market orders, use a wide price band (best available).
      // For limit orders, snap to tick.
      const price =
        orderMode === "market"
          ? side === "Yes"
            ? 0.99
            : 0.99
          : roundToTick(limitPrice);

      const params: TradeParams = {
        coin: side === "Yes" ? market.yesCoin : market.noCoin,
        asset,
        shares,
        price,
        tif,
        markPx: effectivePrice,
        builder: builder
          ? { address: builder.address, fee: builder.fee }
          : undefined,
      };

      await onTrade(params);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, onTrade, orderMode, side, market, shares, limitPrice, effectivePrice, asset, builder]);

  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col gap-4 ${className}`}>
      {/* Side toggle */}
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1 gap-1">
        {(["Yes", "No"] as TradeSide[]).map((s) => (
          <button
            key={s}
            onClick={() => onSideChange?.(s)}
            className={[
              "py-1.5 rounded text-sm font-medium transition-colors",
              side === s
                ? s === "Yes"
                  ? "bg-green-500 text-white shadow-sm"
                  : "bg-red-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {s} {currentPrice > 0 && s === "Yes" && formatMidPrice(currentPrice, "cents")}
            {currentPrice > 0 && s === "No" && formatMidPrice(1 - currentPrice, "cents")}
          </button>
        ))}
      </div>

      {/* Order mode tabs */}
      <div className="flex gap-2 text-sm">
        {(["market", "limit"] as OrderMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setOrderMode(m)}
            className={[
              "flex-1 py-1 rounded border text-sm font-medium transition-colors capitalize",
              orderMode === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {m === "market" ? "Market" : "Limit"}
          </button>
        ))}
      </div>

      {/* Limit price input */}
      {orderMode === "limit" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">
            Limit Price (0–1)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0.001"
              max="0.999"
              step="0.00001"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0.50000"
              aria-label="Limit price"
            />
          </div>
          {limitPrice > 0 && (
            <p className="text-xs text-muted-foreground">
              Tick-aligned: {formatPrice(limitPrice)}
            </p>
          )}
        </div>
      )}

      {/* Shares input */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground font-medium">
            Shares
          </label>
          <button
            onClick={() => setSharesInput(String(effectiveMinShares))}
            className="text-xs text-primary hover:underline"
          >
            Min: {effectiveMinShares}
          </button>
        </div>
        <input
          type="number"
          min={effectiveMinShares}
          step={1}
          value={sharesInput}
          onChange={(e) => setSharesInput(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={String(effectiveMinShares)}
          aria-label="Number of shares"
        />
        {shares > 0 && (
          <p className="text-xs text-muted-foreground">
            {effectivePrice > 0 && `≈ ${formatUsdh(estimatedCost)}`}
          </p>
        )}
      </div>

      {/* Order summary */}
      {shares >= effectiveMinShares && validationError === null && (
        <div className="rounded bg-muted/50 p-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Side</span>
            <span className={`font-medium ${side === "Yes" ? "text-green-500" : "text-red-500"}`}>
              {side}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium capitalize">{orderMode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shares</span>
            <span className="font-mono font-medium">{shares}</span>
          </div>
          {orderMode === "limit" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-mono font-medium">{formatPrice(limitPrice)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. Cost</span>
            <span className="font-mono font-medium">{formatUsdh(estimatedCost)}</span>
          </div>
          {builder && builder.fee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Builder fee</span>
              <span className="font-mono font-medium">{builder.fee / 10}bps (sell only)</span>
            </div>
          )}
        </div>
      )}

      {/* Validation error */}
      {validationError && shares > 0 && (
        <p className="text-xs text-destructive" role="alert">
          {validationError}
        </p>
      )}

      {/* Submit error */}
      {submitError && (
        <p className="text-xs text-destructive" role="alert">
          {submitError}
        </p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={[
          "w-full py-2.5 rounded-md font-medium text-sm transition-colors",
          !isConnected
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : canSubmit
              ? side === "Yes"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
              : "bg-muted text-muted-foreground cursor-not-allowed",
        ].join(" ")}
        aria-disabled={!canSubmit}
      >
        {!isConnected
          ? "Connect Wallet"
          : isSubmitting
            ? "Submitting..."
            : `Buy ${side}`}
      </button>
    </div>
  );
}
