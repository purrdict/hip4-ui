/**
 * TradeForm — production-grade prediction market trade form.
 *
 * Handles all HIP-4 trading footguns:
 *   - Buy / Sell direction tabs (underline style)
 *   - Market / Limit / Post-Only order mode select
 *   - Side buttons with live prices (Yes/No or custom names)
 *   - Bid/Ask/Mid context row for market orders
 *   - "No shares" warning in sell mode
 *   - Limit price input with Bid/Mid/Ask quick-fill buttons
 *   - Dollar amount input (market buy) vs shares input (all other modes)
 *   - Dollar presets ($1 $5 $10 $100) for market buy
 *   - +/- share presets for limit buy, percentage presets for sell
 *   - Max button
 *   - Order summary with payout, slippage, spread
 *   - Validation: min shares, balance, price band (37%–163% of mid)
 *   - Submit button: "Buy {side}" / "Sell {side}", disabled/submitting, "Connect Wallet"
 *
 * Fully decoupled from app stores — all state comes via props.
 *
 * Also exports OrderSummary as a standalone component.
 *
 * Usage:
 * ```tsx
 * <TradeForm
 *   sides={[{ name: "Yes", coin: "#1520" }, { name: "No", coin: "#1521" }]}
 *   initialSide={0}
 *   midPrice={0.63}
 *   bestBid={0.62}
 *   bestAsk={0.65}
 *   minShares={20}
 *   usdhBalance={150}
 *   isConnected={true}
 *   onSubmit={async (params) => { await placeOrder(params); }}
 * />
 * ```
 */

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TradeDirection = "buy" | "sell";
export type TradeOrderMode = "market" | "limit" | "alo";

/** Kept for backward compat — existing OrderSummary users still import OrderMode */
export type OrderMode = TradeOrderMode;
/** Kept for backward compat */
export type TradeSide = "Yes" | "No";

export interface BuilderConfig {
  address: string;
  fee: number;
}

export interface TradeSubmitParams {
  /** Index of the active side (0 = first, 1 = second) */
  side: number;
  /** Buy or sell direction */
  direction: TradeDirection;
  /** Order mode */
  mode: TradeOrderMode;
  /** Tick-aligned price string (5 sig figs) */
  price: string;
  /** Whole-number share count as string */
  size: string;
}

export interface TradeFormPrefill {
  /** Price to set as limit price (0-1). Switches form to limit mode. */
  price: number;
  /** Number of shares to fill into the amount field */
  size?: number;
  /** Which side of the book was clicked. "ask" -> buy, "bid" -> sell */
  side?: "bid" | "ask";
  /** Monotonic counter. Increment to trigger even if price/size/side are identical. */
  nonce: number;
}

export interface TradeFormProps {
  /** Market sides — [{name: "Yes", coin: "#..."}, {name: "No", coin: "#..."}] */
  sides: Array<{ name: string; coin: string }>;
  /** Initially selected side index. Default: 0 */
  initialSide?: number;
  /** Called when user changes active side */
  onSideChange?: (sideIndex: number) => void;
  /** Orderbook data — component auto-resolves mid/bid/ask. Takes priority over individual props. */
  bookData?: { bids: Array<{ px: string; sz: string }>; asks: Array<{ px: string; sz: string }> };
  /** Override: Current mid price (0–1). Auto-calculated from bookData if not set. */
  midPrice?: number;
  /** Override: Best bid (0–1). Auto-extracted from bookData if not set. */
  bestBid?: number;
  /** Override: Best ask (0–1). Auto-extracted from bookData if not set. */
  bestAsk?: number;
  /** Minimum shares for a valid order */
  minShares?: number;
  /** User's USDH balance for validation */
  usdhBalance?: number;
  /** User's share balance for sell validation */
  shareBalance?: number;
  /** Whether the user is connected/signed in */
  isConnected?: boolean;
  /** Builder fee config */
  builder?: BuilderConfig;
  /** Called when order is submitted */
  onSubmit?: (params: TradeSubmitParams) => Promise<void>;
  /** Prefill from orderbook level click */
  prefill?: TradeFormPrefill;
  /** Additional CSS classes */
  className?: string;
}

// ─── OrderSummary (also exported standalone) ──────────────────────────────────

export interface OrderSummaryProps {
  /** true = buy order, false = sell order */
  isBuy: boolean;
  /** Number of shares in the order */
  shares: number;
  /** Total cost (buy) or expected proceeds (sell) in USDH */
  cost: number;
  /** Effective fill price (0–1) */
  effectivePrice: number;
  /** Current mid price (0–1) — used for slippage */
  mid: number | null;
  /** Best bid (0–1) */
  bestBid: number | null;
  /** Best ask (0–1) */
  bestAsk: number | null;
  /** Order mode */
  mode: TradeOrderMode;
  /** Human-readable side name */
  sideName: string;
  /** Additional CSS classes */
  className?: string;
}

function fmtUsd(n: number): string {
  if (n >= 1000)
    return `$${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  return `$${n.toFixed(2)}`;
}

function fmtCents(price: number): string {
  const c = price * 100;
  if (c < 0.1) return `${c.toFixed(3)}¢`;
  if (c < 1) return `${c.toFixed(2)}¢`;
  return `${c.toFixed(1)}¢`;
}

/**
 * Round price to valid Hyperliquid tick (5 significant figures).
 * Returns a trailing-zero-stripped string ready for the API.
 */
function roundToTick(price: number, roundDown = false): string {
  if (price <= 0) return "0.00001";
  const exp = Math.floor(Math.log10(price));
  const tick = Math.pow(10, exp - 4);
  const rounded = roundDown
    ? Math.floor(price / tick) * tick
    : Math.round(price / tick) * tick;
  const decimals = Math.max(0, -(exp - 4));
  const s = rounded.toFixed(decimals);
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

const DOLLAR_PRESETS = [1, 5, 10, 100];
const DEFAULT_MIN_SHARES = 20;

/**
 * Order summary block showing payout, profit %, spread, and slippage.
 *
 * Example:
 * ```tsx
 * <OrderSummary
 *   isBuy={true}
 *   shares={100}
 *   cost={65}
 *   effectivePrice={0.65}
 *   mid={0.63}
 *   bestBid={0.62}
 *   bestAsk={0.65}
 *   mode="market"
 *   sideName="Yes"
 * />
 * ```
 */
export function OrderSummary({
  isBuy,
  shares,
  cost,
  effectivePrice,
  mid,
  bestBid,
  bestAsk,
  mode,
  sideName,
  className = "",
}: OrderSummaryProps) {
  if (shares <= 0 || effectivePrice <= 0) return null;

  const payout = isBuy ? shares * 1.0 : 0;
  const proceeds = !isBuy ? shares * effectivePrice : 0;
  const toWin = isBuy ? payout - cost : proceeds;
  const returnPct = isBuy && cost > 0 ? (payout / cost - 1) * 100 : 0;

  const slippagePct =
    mid && mid > 0
      ? isBuy
        ? ((effectivePrice - mid) / mid) * 100
        : ((mid - effectivePrice) / mid) * 100
      : 0;

  const spreadCents =
    bestBid !== null && bestAsk !== null ? (bestAsk - bestBid) * 100 : null;

  return (
    <div
      className={[
        "border-t border-border/50 pt-3 space-y-2",
        "animate-in fade-in slide-in-from-bottom-2 duration-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">
          {isBuy ? "Payout if wins" : "Est. proceeds"}
        </span>
        <span className="text-xl font-bold tabular-nums text-success">
          {fmtUsd(isBuy ? payout : proceeds)}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] tabular-nums">
          <span className="text-muted-foreground">Shares</span>
          <span>
            {Math.floor(shares)} {sideName}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] tabular-nums">
          <span className="text-muted-foreground">
            {mode === "market" ? "Est. avg price" : "Limit price"}
          </span>
          <span>{fmtCents(effectivePrice)}</span>
        </div>

        {isBuy && returnPct > 0 && (
          <div className="flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-muted-foreground">Profit if wins</span>
            <span className="text-success">
              +{fmtUsd(toWin)} ({returnPct.toFixed(0)}%)
            </span>
          </div>
        )}

        {mode === "market" && (
          <>
            {spreadCents !== null && spreadCents > 0 && (
              <div className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="text-muted-foreground">Spread</span>
                <span
                  className={
                    spreadCents > 5 ? "text-amber-500" : "text-muted-foreground"
                  }
                >
                  {spreadCents.toFixed(1)}¢{spreadCents > 5 ? " (wide)" : ""}
                </span>
              </div>
            )}
            {Math.abs(slippagePct) > 0.1 && (
              <div className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="text-muted-foreground">Slippage vs mid</span>
                <span
                  className={
                    slippagePct > 3 ? "text-amber-500" : "text-muted-foreground"
                  }
                >
                  ~{Math.abs(slippagePct).toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── TradeForm ────────────────────────────────────────────────────────────────

/**
 * Production-grade trade form for HIP-4 prediction markets.
 *
 * Decoupled from app stores — all data flows through props.
 * Matches the layout of the production app (apps/hip4) exactly.
 *
 * Example:
 * ```tsx
 * <TradeForm
 *   sides={[{ name: "Yes", coin: "#1520" }, { name: "No", coin: "#1521" }]}
 *   initialSide={0}
 *   midPrice={0.63}
 *   bestBid={0.62}
 *   bestAsk={0.65}
 *   minShares={20}
 *   usdhBalance={150}
 *   isConnected={true}
 *   onSubmit={async (params) => { await placeOrder(params); }}
 * />
 * ```
 */
export function TradeForm({
  sides,
  initialSide = 0,
  onSideChange,
  bookData,
  midPrice: midPriceProp,
  bestBid: bestBidProp,
  bestAsk: bestAskProp,
  minShares = DEFAULT_MIN_SHARES,
  usdhBalance = 0,
  shareBalance = 0,
  isConnected = false,
  builder,
  onSubmit,
  prefill,
  className = "",
}: TradeFormProps) {
  // Auto-resolve from bookData if provided, fallback to individual props
  const bestBid = bookData?.bids?.[0] ? parseFloat(bookData.bids[0].px) : bestBidProp;
  const bestAsk = bookData?.asks?.[0] ? parseFloat(bookData.asks[0].px) : bestAskProp;
  const midPrice = midPriceProp ?? (bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : undefined);
  const [sideIdx, setSideIdxLocal] = useState(initialSide);
  const [direction, setDirection] = useState<TradeDirection>("buy");
  const [mode, setMode] = useState<TradeOrderMode>("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prefill from orderbook level click (state adjustment during render — NOT useEffect)
  const [lastPrefillNonce, setLastPrefillNonce] = useState(-1);
  if (prefill && prefill.nonce !== lastPrefillNonce) {
    setLastPrefillNonce(prefill.nonce);
    setMode("limit");
    setLimitPrice(prefill.price.toString());
    if (prefill.size !== undefined) {
      setAmount(Math.floor(prefill.size).toString());
    }
    if (prefill.side !== undefined) {
      setDirection(prefill.side === "ask" ? "buy" : "sell");
    }
  }

  // Sync when parent changes initialSide (e.g. user clicked a side button on the card)
  useEffect(() => {
    if (initialSide !== sideIdx) {
      setSideIdxLocal(initialSide);
    }
  }, [initialSide]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSideIdx = useCallback(
    (idx: number) => {
      setSideIdxLocal(idx);
      onSideChange?.(idx);
    },
    [onSideChange],
  );

  const activeSide = sides[sideIdx] ?? sides[0];
  const mid = midPrice ?? null;

  const isBuy = direction === "buy";
  const isMarket = mode === "market";
  // Market buy uses dollar input; everything else uses shares input.
  const dollarInput = isMarket && isBuy;

  // Effective fill price
  const effectivePrice = useMemo(() => {
    if (!isMarket) return parseFloat(limitPrice) || 0;
    if (isBuy) return bestAsk ?? (mid ? Math.min(mid * 1.05, 0.99) : 0);
    return bestBid ?? (mid ? Math.max(mid * 0.95, 0.01) : 0);
  }, [isMarket, limitPrice, isBuy, bestBid, bestAsk, mid]);

  const amtNum = parseFloat(amount) || 0;
  const shares = dollarInput
    ? effectivePrice > 0
      ? amtNum / effectivePrice
      : 0
    : amtNum;
  const cost = dollarInput ? amtNum : shares * effectivePrice;

  const maxBuyShares =
    effectivePrice > 0 ? Math.floor(usdhBalance / effectivePrice) : 0;

  // Validation
  const validationErrors = useMemo<string[]>(() => {
    const errors: string[] = [];
    if (amtNum > 0 && shares > 0 && shares < minShares) {
      const minCost = dollarInput ? Math.ceil(minShares * effectivePrice) : 0;
      errors.push(
        dollarInput
          ? `Min ${minShares} shares — need ${fmtUsd(minCost)}+ at current price`
          : `Min ${minShares} shares`,
      );
    }
    if (isBuy && amtNum > 0 && usdhBalance > 0 && cost > usdhBalance) {
      errors.push(
        `Insufficient USDH — need ${fmtUsd(cost)}, have ${fmtUsd(usdhBalance)}`,
      );
    }
    if (!isBuy && amtNum > 0 && amtNum > shareBalance) {
      errors.push(
        `Insufficient shares — available: ${Math.floor(shareBalance)}`,
      );
    }
    if (!isMarket) {
      const px = parseFloat(limitPrice) || 0;
      if (px <= 0 || px >= 1) errors.push("Price must be between 0¢ and 100¢");
      if (mid && mid > 0) {
        const lower = Math.max(0.00001, mid * 0.37);
        const upper = Math.min(mid * 1.63, 0.99999);
        if (px > 0 && (px < lower || px > upper)) {
          errors.push(
            `Price outside band (${(lower * 100).toFixed(1)}¢ – ${(upper * 100).toFixed(1)}¢)`,
          );
        }
      }
    }
    return errors;
  }, [
    amtNum,
    shares,
    minShares,
    dollarInput,
    effectivePrice,
    isBuy,
    usdhBalance,
    cost,
    shareBalance,
    isMarket,
    limitPrice,
    mid,
  ]);

  const canSubmit =
    isConnected &&
    !isSubmitting &&
    amtNum > 0 &&
    shares >= minShares &&
    validationErrors.length === 0 &&
    effectivePrice > 0;

  function addAmount(delta: number) {
    setAmount((prev) => {
      const current = parseFloat(prev) || 0;
      return Math.max(0, current + delta).toString();
    });
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || !onSubmit) return;
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        const sizeStr = Math.floor(shares).toString();
        let price: string;
        if (isMarket) {
          // Wide slippage tolerance — FrontendMarket fills at best price
          const rawSlippage = isBuy
            ? Math.min((bestAsk ?? mid ?? 0.5) * 1.3, 0.99)
            : Math.max((bestBid ?? mid ?? 0.5) * 0.7, 0.01);
          price = roundToTick(rawSlippage, !isBuy);
        } else {
          price = roundToTick(parseFloat(limitPrice) || 0);
        }
        await onSubmit({
          side: sideIdx,
          direction,
          mode,
          price,
          size: sizeStr,
        });
        setAmount("");
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      canSubmit,
      onSubmit,
      shares,
      isMarket,
      isBuy,
      bestAsk,
      bestBid,
      mid,
      limitPrice,
      sideIdx,
      direction,
      mode,
    ],
  );

  // Side cents labels
  const side0Cents =
    sides[0] && mid !== null
      ? `${(sideIdx === 0 ? mid : 1 - mid) * 100 > 0 ? ((sideIdx === 0 ? mid : 1 - mid) * 100).toFixed(1) : "—"}%`
      : null;
  const side1Cents =
    sides[1] && mid !== null
      ? `${(sideIdx === 1 ? mid : 1 - mid) * 100 > 0 ? ((sideIdx === 1 ? mid : 1 - mid) * 100).toFixed(1) : "—"}%`
      : null;

  return (
    <form
      onSubmit={handleSubmit}
      className={["space-y-4", className].filter(Boolean).join(" ")}
    >
      {/* ── Buy / Sell + Mode select ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setDirection("buy")}
            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
              isBuy
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setDirection("sell")}
            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
              !isBuy
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Sell
          </button>
        </div>

        <div className="relative">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TradeOrderMode)}
            className="appearance-none bg-transparent text-sm text-muted-foreground hover:text-foreground cursor-pointer pr-5 py-1 transition-colors focus:outline-none"
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="alo">Post-Only</option>
          </select>
          <svg
            className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </div>

      {/* ── Side buttons ── */}
      <div className="flex gap-2 min-w-0">
        <button
          type="button"
          onClick={() => setSideIdx(0)}
          className={`flex-1 min-w-0 rounded-xl py-3 px-3 text-sm font-semibold transition-all truncate ${
            sideIdx === 0
              ? "bg-success text-success-foreground shadow-sm"
              : "bg-secondary/80 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {sides[0]?.name}
          {side0Cents ? ` ${side0Cents}` : ""}
        </button>
        {sides.length > 1 && (
          <button
            type="button"
            onClick={() => setSideIdx(1)}
            className={`flex-1 min-w-0 rounded-xl py-3 px-3 text-sm font-semibold transition-all truncate ${
              sideIdx === 1
                ? "bg-destructive text-destructive-foreground shadow-sm"
                : "bg-secondary/80 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {sides[1]?.name}
            {side1Cents ? ` ${side1Cents}` : ""}
          </button>
        )}
      </div>

      {/* ── Bid / Ask / Mid context row ── */}
      {isMarket && (bestBid !== undefined || bestAsk !== undefined) && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>
            Bid{" "}
            <span className="text-success font-medium tabular-nums">
              {bestBid !== undefined ? fmtCents(bestBid) : "—"}
            </span>
          </span>
          {mid !== null && (
            <span className="text-muted-foreground/50">Mid {fmtCents(mid)}</span>
          )}
          <span>
            Ask{" "}
            <span className="text-destructive font-medium tabular-nums">
              {bestAsk !== undefined ? fmtCents(bestAsk) : "—"}
            </span>
          </span>
        </div>
      )}

      {/* ── No shares warning for sell mode ── */}
      {!isBuy && shareBalance === 0 && isConnected && (
        <div className="text-sm text-muted-foreground bg-secondary/50 rounded-xl px-4 py-3 text-center">
          You don&apos;t hold any {activeSide?.name} shares
        </div>
      )}

      {/* ── Limit price input ── */}
      {(mode === "limit" || mode === "alo") && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {mode === "alo" ? "Post-only price" : "Limit price"}
            </span>
            <div className="flex gap-2">
              {bestBid !== undefined && (
                <button
                  type="button"
                  onClick={() => setLimitPrice(bestBid.toString())}
                  className="text-[10px] text-success/70 hover:text-success transition-colors tabular-nums"
                >
                  Bid {fmtCents(bestBid)}
                </button>
              )}
              {mid !== null && (
                <button
                  type="button"
                  onClick={() =>
                    setLimitPrice(
                      mid.toFixed(5).replace(/0+$/, "").replace(/\.$/, ""),
                    )
                  }
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors tabular-nums"
                >
                  Mid {fmtCents(mid)}
                </button>
              )}
              {bestAsk !== undefined && (
                <button
                  type="button"
                  onClick={() => setLimitPrice(bestAsk.toString())}
                  className="text-[10px] text-destructive/70 hover:text-destructive transition-colors tabular-nums"
                >
                  Ask {fmtCents(bestAsk)}
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={mid ? mid.toFixed(3) : "0.50"}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-right text-lg font-bold tabular-nums focus:outline-none focus:border-muted-foreground transition-colors"
            />
          </div>
        </div>
      )}

      {/* ── Amount / Shares input ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {dollarInput ? "Amount" : "Shares"}
          </span>
          {isBuy ? (
            usdhBalance > 0 ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {dollarInput
                  ? `Balance: ${fmtUsd(usdhBalance)}`
                  : `Max ~${maxBuyShares.toLocaleString()} (${fmtUsd(usdhBalance)})`}
              </span>
            ) : null
          ) : shareBalance > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              Available: {Math.floor(shareBalance)}
            </span>
          ) : null}
        </div>

        <div className="relative">
          {dollarInput && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-bold text-muted-foreground/40">
              $
            </span>
          )}
          <input
            type="text"
            inputMode={dollarInput ? "decimal" : "numeric"}
            value={amount}
            onChange={(e) =>
              setAmount(
                dollarInput
                  ? e.target.value
                  : e.target.value.replace(/[^0-9]/g, ""),
              )
            }
            placeholder="0"
            className="w-full bg-transparent text-right text-4xl font-bold tabular-nums focus:outline-none caret-foreground"
          />
          {amtNum > 0 && effectivePrice > 0 && (
            <div className="text-right text-xs text-muted-foreground mt-1 tabular-nums">
              {dollarInput
                ? `~${Math.floor(shares)} shares`
                : isBuy
                  ? `Cost: ${fmtUsd(cost)}`
                  : `~${fmtUsd(shares * effectivePrice)} proceeds`}
            </div>
          )}
        </div>

        {/* Presets */}
        <div className="flex gap-1.5 flex-wrap">
          {dollarInput ? (
            <>
              {DOLLAR_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => addAmount(d)}
                  className="flex-1 rounded-full border border-border py-2 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                >
                  +${d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(Math.floor(usdhBalance).toString())}
                className="flex-1 rounded-full border border-border py-2 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              >
                Max
              </button>
            </>
          ) : isBuy ? (
            <>
              {[-100, -10, 10, 100].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => addAmount(d)}
                  className="flex-1 rounded-full border border-border py-2 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(maxBuyShares.toString())}
                className="flex-1 rounded-full border border-border py-2 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              >
                Max
              </button>
            </>
          ) : (
            <>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() =>
                    setAmount(
                      Math.floor((shareBalance * pct) / 100).toString(),
                    )
                  }
                  className="flex-1 rounded-full border border-border py-2 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Validation errors ── */}
      {validationErrors.length > 0 && (
        <div className="space-y-1">
          {validationErrors.map((err) => (
            <div
              key={err}
              className="text-xs text-amber-500 bg-amber-500/5 rounded-lg px-3 py-1.5"
            >
              {err}
            </div>
          ))}
        </div>
      )}

      {/* ── Submit error ── */}
      {submitError && (
        <p className="text-xs text-destructive" role="alert">
          {submitError}
        </p>
      )}

      {/* ── Order summary ── */}
      <OrderSummary
        isBuy={isBuy}
        shares={shares}
        cost={cost}
        effectivePrice={effectivePrice}
        mid={mid}
        bestBid={bestBid ?? null}
        bestAsk={bestAsk ?? null}
        mode={mode}
        sideName={activeSide?.name ?? ""}
      />

      {/* ── Submit button ── */}
      <button
        type="submit"
        disabled={!canSubmit && isConnected}
        className={[
          "w-full rounded-xl py-3.5 font-semibold text-sm transition-colors",
          !isConnected
            ? "bg-secondary text-muted-foreground hover:bg-secondary/80 cursor-pointer"
            : canSubmit
              ? sideIdx === 0
                ? "bg-success text-success-foreground hover:bg-success/90"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-disabled={!canSubmit && isConnected}
      >
        {!isConnected
          ? "Connect Wallet"
          : isSubmitting
            ? "Placing order..."
            : isBuy
              ? `Buy ${activeSide?.name}${shares >= minShares ? ` · ${Math.floor(shares)} shares` : ""}`
              : `Sell ${activeSide?.name}${shares >= minShares ? ` · ${Math.floor(shares)} shares` : ""}`}
      </button>

      {builder && builder.fee > 0 && (
        <p className="text-center text-[10px] text-muted-foreground/50">
          Builder fee {builder.fee / 10}bps on sell side
        </p>
      )}
    </form>
  );
}
