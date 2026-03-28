"use client";

import { useState, useEffect } from "react";

type Level = { price: number; size: number };

const BASE_BIDS: Level[] = [
  { price: 0.6500, size: 120 },
  { price: 0.6450, size: 200 },
  { price: 0.6400, size: 85 },
  { price: 0.6350, size: 150 },
  { price: 0.6300, size: 65 },
];

const BASE_ASKS: Level[] = [
  { price: 0.6550, size: 95 },
  { price: 0.6600, size: 140 },
  { price: 0.6700, size: 75 },
  { price: 0.6750, size: 110 },
  { price: 0.6800, size: 50 },
];

function jitter(levels: Level[]): Level[] {
  return levels.map((l) => ({
    price: l.price,
    size: Math.max(10, l.size + Math.floor((Math.random() - 0.5) * 30)),
  }));
}

export default function OrderbookPreview() {
  const [bids, setBids] = useState(BASE_BIDS);
  const [asks, setAsks] = useState(BASE_ASKS);

  useEffect(() => {
    const timer = setInterval(() => {
      setBids(jitter(BASE_BIDS));
      setAsks(jitter(BASE_ASKS));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const maxSize = Math.max(...[...bids, ...asks].map((l) => l.size));
  const spread = asks[0].price - bids[0].price;

  return (
    <div className="rounded-xl border bg-card text-card-foreground w-[320px] overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b">
        <span className="text-sm font-semibold font-sans text-foreground">BTC Up/Down — Orderbook</span>
        <span className="text-muted-foreground font-sans">Yes side</span>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-3 px-4 py-1.5 text-[10px] text-muted-foreground border-b">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks */}
      {[...asks].reverse().map((ask, i) => (
        <div key={`a${i}`} className="grid grid-cols-3 px-4 py-[3px] relative cursor-pointer hover:bg-secondary/30 transition-colors tabular-nums">
          <div
            className="absolute inset-y-0 right-0 bg-destructive/[0.08] rounded-sm"
            style={{ width: `${(ask.size / maxSize) * 100}%` }}
          />
          <span className="text-destructive relative z-10">{ask.price.toFixed(4)}</span>
          <span className="text-right text-muted-foreground relative z-10">{ask.size}</span>
          <span className="text-right text-muted-foreground/60 relative z-10">{(ask.price * ask.size).toFixed(1)}</span>
        </div>
      ))}

      {/* Spread */}
      <div className="px-4 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground bg-muted/30 border-y">
        <span>Spread</span>
        <span className="font-semibold text-foreground">{spread.toFixed(4)}</span>
        <span>({(spread / asks[0].price * 100).toFixed(2)}%)</span>
      </div>

      {/* Bids */}
      {bids.map((bid, i) => (
        <div key={`b${i}`} className="grid grid-cols-3 px-4 py-[3px] relative cursor-pointer hover:bg-secondary/30 transition-colors tabular-nums">
          <div
            className="absolute inset-y-0 left-0 bg-success/[0.08] rounded-sm"
            style={{ width: `${(bid.size / maxSize) * 100}%` }}
          />
          <span className="text-success relative z-10">{bid.price.toFixed(4)}</span>
          <span className="text-right text-muted-foreground relative z-10">{bid.size}</span>
          <span className="text-right text-muted-foreground/60 relative z-10">{(bid.price * bid.size).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
