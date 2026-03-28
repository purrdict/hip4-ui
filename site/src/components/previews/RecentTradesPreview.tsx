"use client";

import { useState, useEffect, useRef } from "react";

interface Trade {
  side: "buy" | "sell";
  label: string;
  price: number;
  size: number;
  time: string;
}

const INITIAL_TRADES: Trade[] = [
  { side: "buy", label: "Yes", price: 0.6520, size: 45, time: "14:32" },
  { side: "sell", label: "No", price: 0.3480, size: 120, time: "14:31" },
  { side: "buy", label: "Yes", price: 0.6500, size: 80, time: "14:30" },
  { side: "sell", label: "Yes", price: 0.6480, size: 25, time: "14:29" },
  { side: "buy", label: "Yes", price: 0.6550, size: 200, time: "14:28" },
  { side: "buy", label: "No", price: 0.3500, size: 60, time: "14:27" },
  { side: "sell", label: "Yes", price: 0.6450, size: 35, time: "14:26" },
  { side: "buy", label: "Yes", price: 0.6490, size: 150, time: "14:25" },
];

function randomTrade(): Trade {
  const side = Math.random() > 0.5 ? "buy" : "sell";
  const label = Math.random() > 0.3 ? "Yes" : "No";
  const basePrice = label === "Yes" ? 0.65 : 0.35;
  const price = basePrice + (Math.random() - 0.5) * 0.02;
  const size = Math.floor(Math.random() * 200) + 10;
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  return { side, label, price, size, time };
}

export default function RecentTradesPreview() {
  const [trades, setTrades] = useState(INITIAL_TRADES);
  const flashRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTrades((prev) => {
        const next = [randomTrade(), ...prev];
        return next.slice(0, 10);
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl border bg-card text-card-foreground w-[320px] overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="text-sm font-semibold font-sans">Recent Trades</span>
        <span className="text-[10px] text-muted-foreground font-mono">BTC Up/Down</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-4 gap-2 px-4 py-1.5 text-[10px] text-muted-foreground border-b font-mono">
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trade rows */}
      <div className="max-h-[240px] overflow-y-auto">
        {trades.map((t, i) => (
          <div
            key={`${t.time}-${t.price}-${i}`}
            className={`grid grid-cols-4 gap-2 px-4 py-1 text-xs font-mono tabular-nums hover:bg-secondary/30 transition-colors ${
              i === 0 ? "bg-primary/[0.03]" : ""
            }`}
          >
            <span className={t.side === "buy" ? "text-success" : "text-destructive"}>
              {t.label}
            </span>
            <span className="text-right text-muted-foreground">{(t.price * 100).toFixed(1)}¢</span>
            <span className="text-right text-foreground">{t.size}</span>
            <span className="text-right text-muted-foreground/60">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
