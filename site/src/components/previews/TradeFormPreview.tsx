"use client";

import { useState } from "react";

type Direction = "buy" | "sell";
type Mode = "market" | "limit" | "alo";

const DOLLAR_PRESETS = [1, 5, 10, 100];

function fmtCents(price: number): string {
  const c = price * 100;
  return c < 1 ? `${c.toFixed(2)}¢` : `${c.toFixed(1)}¢`;
}

export default function TradeFormPreview() {
  const [sideIdx, setSideIdx] = useState(0);
  const [direction, setDirection] = useState<Direction>("buy");
  const [mode, setMode] = useState<Mode>("market");
  const [amount, setAmount] = useState("10");
  const [limitPrice, setLimitPrice] = useState("0.65");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mid = 0.65;
  const bestBid = 0.6450;
  const bestAsk = 0.6550;
  const isBuy = direction === "buy";
  const isMarket = mode === "market";
  const dollarInput = isMarket && isBuy;

  const effectivePrice = isMarket ? (isBuy ? bestAsk : bestBid) : parseFloat(limitPrice) || 0;
  const amtNum = parseFloat(amount) || 0;
  const shares = dollarInput ? (effectivePrice > 0 ? amtNum / effectivePrice : 0) : amtNum;
  const cost = dollarInput ? amtNum : shares * effectivePrice;
  const payout = shares;
  const profit = payout - cost;
  const returnPct = cost > 0 ? ((payout / cost - 1) * 100) : 0;

  function handleSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    }, 1200);
  }

  const sides = [
    { name: "Yes", pct: "65.0" },
    { name: "No", pct: "35.0" },
  ];

  return (
    <div className="rounded-xl border bg-card text-card-foreground w-[320px] p-4 space-y-4">
      {/* Buy / Sell + Mode */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {(["buy", "sell"] as Direction[]).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors capitalize ${
                direction === d
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className="bg-transparent text-sm text-muted-foreground hover:text-foreground cursor-pointer pr-1 py-1 focus:outline-none"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="alo">Post-Only</option>
        </select>
      </div>

      {/* Side buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setSideIdx(0)}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all truncate ${
            sideIdx === 0
              ? "bg-success text-success-foreground shadow-sm"
              : "bg-secondary/80 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {sides[0].name} {sides[0].pct}%
        </button>
        <button
          onClick={() => setSideIdx(1)}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all truncate ${
            sideIdx === 1
              ? "bg-destructive text-destructive-foreground shadow-sm"
              : "bg-secondary/80 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {sides[1].name} {sides[1].pct}%
        </button>
      </div>

      {/* Bid / Ask / Mid context */}
      {isMarket && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>Bid <span className="text-success font-medium tabular-nums">{fmtCents(bestBid)}</span></span>
          <span className="text-muted-foreground/50">Mid {fmtCents(mid)}</span>
          <span>Ask <span className="text-destructive font-medium tabular-nums">{fmtCents(bestAsk)}</span></span>
        </div>
      )}

      {/* Limit price */}
      {!isMarket && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{mode === "alo" ? "Post-only price" : "Limit price"}</span>
            <div className="flex gap-2">
              <button onClick={() => setLimitPrice(bestBid.toString())} className="text-[10px] text-success/70 hover:text-success tabular-nums">Bid {fmtCents(bestBid)}</button>
              <button onClick={() => setLimitPrice(mid.toString())} className="text-[10px] text-muted-foreground hover:text-foreground tabular-nums">Mid {fmtCents(mid)}</button>
              <button onClick={() => setLimitPrice(bestAsk.toString())} className="text-[10px] text-destructive/70 hover:text-destructive tabular-nums">Ask {fmtCents(bestAsk)}</button>
            </div>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-right text-lg font-bold tabular-nums focus:outline-none focus:border-muted-foreground transition-colors"
          />
        </div>
      )}

      {/* Amount input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{dollarInput ? "Amount" : "Shares"}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {isBuy ? "Balance: $1,000.00" : "Available: 150"}
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-right text-lg font-bold tabular-nums focus:outline-none focus:border-muted-foreground transition-colors"
          />
          <button
            onClick={() => setAmount(isBuy ? "1000" : "150")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground hover:text-foreground bg-secondary/80 px-2 py-0.5 rounded-md transition-colors"
          >
            Max
          </button>
        </div>

        {/* Dollar presets — market buy only */}
        {dollarInput && (
          <div className="flex gap-2">
            {DOLLAR_PRESETS.map((d) => (
              <button
                key={d}
                onClick={() => setAmount(d.toString())}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  amtNum === d
                    ? "bg-secondary text-foreground"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                ${d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order summary */}
      {shares >= 20 && effectivePrice > 0 && (
        <div className="border-t pt-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{isBuy ? "Payout if wins" : "Est. proceeds"}</span>
            <span className="text-xl font-bold tabular-nums text-success">${isBuy ? payout.toFixed(2) : (shares * effectivePrice).toFixed(2)}</span>
          </div>
          <div className="space-y-1 text-[11px] tabular-nums">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shares</span>
              <span>{Math.floor(shares)} {sides[sideIdx].name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isMarket ? "Est. avg price" : "Limit price"}</span>
              <span>{fmtCents(effectivePrice)}</span>
            </div>
            {isBuy && returnPct > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profit if wins</span>
                <span className="text-success">+${profit.toFixed(2)} ({returnPct.toFixed(0)}%)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || shares < 20}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          submitted
            ? "bg-success/20 text-success"
            : sideIdx === 0
              ? "bg-success text-success-foreground hover:bg-success/90"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        }`}
      >
        {submitted
          ? "Order Placed"
          : submitting
            ? "Submitting..."
            : `${isBuy ? "Buy" : "Sell"} ${sides[sideIdx].name}`}
      </button>
    </div>
  );
}
