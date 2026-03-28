"use client";

import { useState, useEffect } from "react";

function CountdownBadge({ expiresInMs }: { expiresInMs: number }) {
  const [remaining, setRemaining] = useState(expiresInMs);
  useEffect(() => {
    const tick = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(tick);
  }, []);
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  if (remaining === 0) return <span className="text-muted-foreground text-xs font-mono">Settled</span>;
  return (
    <span className="text-xs font-mono tabular-nums text-muted-foreground">
      {h > 0 ? `${h}h ` : ""}{m}m {s.toString().padStart(2, "0")}s
    </span>
  );
}

const TABS = ["Recurring", "Named Binary", "Multi-Outcome"] as const;
type Tab = (typeof TABS)[number];

/* ── Recurring (BTC Up/Down) ── */
function RecurringCard() {
  return (
    <div className="rounded-2xl border bg-card text-card-foreground overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all w-[320px]">
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-secondary/60 ring-1 ring-border/40 overflow-hidden shrink-0 flex items-center justify-center">
          <img src="https://app.hyperliquid.xyz/coins/BTC.svg" alt="BTC" className="h-10 w-10" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold font-display leading-tight">Bitcoin 15 Min Up or Down?</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Target: $87,450</p>
        </div>
        <span className="text-lg font-bold font-mono tabular-nums text-success shrink-0">65%</span>
      </div>
      <div className="px-4 pb-3 flex gap-2">
        <button className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-success/15 text-success hover:bg-success/25 transition-colors">
          Up 65¢
        </button>
        <button className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors">
          Down 35¢
        </button>
      </div>
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Live</span>
        </div>
        <CountdownBadge expiresInMs={8130000} />
      </div>
    </div>
  );
}

/* ── Named Binary (Hypurr vs Usain Bolt) ── */
function NamedBinaryCard() {
  return (
    <div className="rounded-2xl border bg-card text-card-foreground overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all w-[320px]">
      <div className="px-5 pt-5 pb-1">
        <h3 className="text-[15px] font-semibold font-display leading-tight">Who runs faster — 100m dash?</h3>
      </div>
      <div className="px-5 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary/60 ring-1 ring-border/40 overflow-hidden shrink-0">
            <img src="https://app.purrdict.xyz/avatars/hypurr.webp" alt="Hypurr" className="h-10 w-10 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="flex h-10 w-10 items-center justify-center text-sm font-bold font-mono text-muted-foreground">H</span>'; }} />
          </div>
          <span className="text-sm font-medium">Hypurr</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary/60 ring-1 ring-border/40 overflow-hidden shrink-0">
            <img src="https://app.purrdict.xyz/avatars/usain.webp" alt="Usain Bolt" className="h-10 w-10 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="flex h-10 w-10 items-center justify-center text-sm font-bold font-mono text-muted-foreground">UB</span>'; }} />
          </div>
          <span className="text-sm font-medium">Usain Bolt</span>
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-2">
        <button className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-success/15 text-success hover:bg-success/25 transition-colors">
          Hypurr 38¢
        </button>
        <button className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors">
          Usain Bolt 62¢
        </button>
      </div>
    </div>
  );
}

/* ── Multi-Outcome / Question ── */
function QuestionCard() {
  const outcomes = [
    { name: "Akami", pct: 42 },
    { name: "Canned Tuna", pct: 28 },
  ];
  return (
    <div className="rounded-2xl border bg-card text-card-foreground overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all w-[320px]">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-[15px] font-semibold font-display leading-tight">What will Hypurr eat?</h3>
      </div>
      <div className="px-1.5 pb-2 space-y-1">
        {outcomes.map((o) => (
          <div key={o.name} className="px-3.5 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors flex items-center gap-3">
            <span className="text-sm font-medium flex-1 truncate">{o.name}</span>
            <div className="w-16 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
              <div className="h-full rounded-full bg-success/60" style={{ width: `${o.pct}%` }} />
            </div>
            <span className="text-sm font-bold font-mono tabular-nums w-11 text-right">{o.pct}%</span>
            <div className="flex gap-1">
              <button className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors">Yes</button>
              <button className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">No</button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 pb-4 pt-1 flex items-center justify-between text-xs text-muted-foreground border-t">
        <span>4 markets · +2 more</span>
        <CountdownBadge expiresInMs={86400000} />
      </div>
    </div>
  );
}

/* EventCard removed — not a real HIP-4 market type */

export default function MarketCardPreview() {
  const [tab, setTab] = useState<Tab>("Recurring");

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Variant tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Active card */}
      {tab === "Recurring" && <RecurringCard />}
      {tab === "Named Binary" && <NamedBinaryCard />}
      {tab === "Multi-Outcome" && <QuestionCard />}
    </div>
  );
}
