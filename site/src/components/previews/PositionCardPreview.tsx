"use client";

import { useState } from "react";

export default function PositionCardPreview() {
  const [selling, setSelling] = useState(false);
  const [sold, setSold] = useState(false);

  const shares = 100;
  const avgEntry = 0.45;
  const currentPrice = 0.65;
  const value = shares * currentPrice;
  const pnl = (currentPrice - avgEntry) * shares;
  const pnlPct = ((currentPrice - avgEntry) / avgEntry) * 100;

  function handleSell() {
    setSelling(true);
    setTimeout(() => {
      setSelling(false);
      setSold(true);
      setTimeout(() => setSold(false), 2000);
    }, 1000);
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground w-[320px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
            <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">BTC Up</span>
              <span className="rounded-full bg-success/10 text-success px-2 py-0.5 text-[10px] font-semibold">Yes</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{shares} shares</span>
          </div>
        </div>
        <button
          onClick={handleSell}
          disabled={selling || sold}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
            sold
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {sold ? "Sold" : selling ? "Selling..." : "Sell"}
        </button>
      </div>

      {/* Stats grid */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        {[
          { label: "Avg Entry", val: `${Math.round(avgEntry * 100)}¢`, cls: "text-muted-foreground" },
          { label: "Current Price", val: `${Math.round(currentPrice * 100)}¢`, cls: "text-success" },
          { label: "Value", val: `$${value.toFixed(2)}`, cls: "text-foreground" },
          { label: "P&L", val: `+$${pnl.toFixed(2)} (+${pnlPct.toFixed(1)}%)`, cls: "text-success" },
        ].map(({ label, val, cls }) => (
          <div key={label} className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
            <p className={`text-sm font-semibold font-mono tabular-nums ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Entry vs current bar */}
      <div className="px-5 pb-4">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden relative">
          <div className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50" style={{ left: `${avgEntry * 100}%` }} />
          <div className="h-full rounded-full bg-gradient-to-r from-success/30 to-success/70" style={{ width: `${currentPrice * 100}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-muted-foreground font-mono">
          <span>0¢</span>
          <span>entry: {Math.round(avgEntry * 100)}¢</span>
          <span>100¢</span>
        </div>
      </div>
    </div>
  );
}
