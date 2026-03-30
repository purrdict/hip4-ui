"use client";

import { useState, useMemo } from "react";

// ─── Inline types + helpers (self-contained, no src/ imports) ────────────────

type Round = {
  id: number;
  expiry: string;
  result: "above" | "below" | null;
  settlePrice?: number;
  targetPrice: number;
};

function parseDate(raw: string): Date | null {
  try {
    const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T") + "Z");
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

function formatLabel(expiry: string, short: boolean): string {
  const d = parseDate(expiry);
  if (!d) return expiry;
  if (short) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Indicator({ result, size = 14 }: { result: "above" | "below" | null; size?: number }) {
  if (result === null) {
    return <span className="h-2 w-2 rounded-full bg-destructive animate-pulse inline-block" />;
  }
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" width={size} height={size}
      className={result === "above" ? "text-success" : "text-destructive"}>
      <path d={result === "above" ? "M6 1.5 L10.5 9 L1.5 9 Z" : "M6 10.5 L1.5 3 L10.5 3 Z"} />
    </svg>
  );
}

// ─── Mock inline timeline (mimics the real component without Radix) ──────────

function MockTimeline({
  rounds, activeId, onSelect, short, underlying, visibleCount = 5,
}: {
  rounds: Round[]; activeId: number; onSelect: (r: Round) => void;
  short: boolean; underlying?: string; visibleCount?: number;
}) {
  const [pastOpen, setPastOpen] = useState(false);

  const sorted = useMemo(() =>
    [...rounds].sort((a, b) => (parseDate(b.expiry)?.getTime() ?? 0) - (parseDate(a.expiry)?.getTime() ?? 0)),
    [rounds],
  );

  const tabs = sorted.slice(0, visibleCount);
  const overflow = sorted.slice(visibleCount);

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm px-2 py-1.5 relative">
      {/* Past button */}
      {overflow.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setPastOpen(!pastOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pastOpen ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            Past
            <svg className={`h-3 w-3 transition-transform ${pastOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Dropdown */}
          {pastOpen && (
            <div className="absolute top-full left-0 mt-2 w-52 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-50">
              <div className="p-1.5">
                {overflow.map((r) => (
                  <button key={r.id}
                    onClick={() => { onSelect(r); setPastOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${
                      r.id === activeId ? "bg-secondary text-foreground" : "text-foreground/80 hover:bg-secondary/60"
                    }`}>
                    <Indicator result={r.result} />
                    <span className="tabular-nums">{formatLabel(r.expiry, short)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Streak strip */}
      {overflow.length > 0 && (
        <>
          <div className="flex items-center gap-0.5">
            {overflow.filter((r) => r.result !== null).slice(0, 4).map((r) => (
              <Indicator key={r.id} result={r.result} size={12} />
            ))}
          </div>
          <div className="w-px h-5 bg-border/60" />
        </>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {[...tabs].reverse().map((r) => {
          const isActive = r.id === activeId;
          const isLive = r.result === null;
          return (
            <button key={r.id} onClick={() => onSelect(r)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}>
              {isLive ? <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> : <Indicator result={r.result} size={12} />}
              <span className="tabular-nums">{formatLabel(r.expiry, short)}</span>
            </button>
          );
        })}
      </div>

      {/* Coin icon */}
      {underlying && (
        <>
          <div className="w-px h-5 bg-border/60 ml-auto" />
          <img src={`https://app.hyperliquid.xyz/coins/${underlying}.svg`} alt={underlying}
            className="h-6 w-6 rounded-full bg-secondary/60 shrink-0" />
        </>
      )}
    </div>
  );
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const BTC_ROUNDS: Round[] = [
  { id: 2631, expiry: new Date(Date.now() + 3600000).toISOString(), result: null, targetPrice: 67579 },
  { id: 2534, expiry: "2026-03-30T09:30:00Z", result: "above", targetPrice: 66620, settlePrice: 67581 },
  { id: 2437, expiry: "2026-03-29T09:30:00Z", result: "above", targetPrice: 66220, settlePrice: 66631 },
  { id: 2340, expiry: "2026-03-28T09:30:00Z", result: "below", targetPrice: 68800, settlePrice: 66220 },
  { id: 2243, expiry: "2026-03-27T09:30:00Z", result: "below", targetPrice: 71169, settlePrice: 68800 },
  { id: 2146, expiry: "2026-03-26T09:30:00Z", result: "above", targetPrice: 70836, settlePrice: 71169 },
  { id: 2049, expiry: "2026-03-25T09:30:00Z", result: "above", targetPrice: 70432, settlePrice: 70913 },
  { id: 1952, expiry: "2026-03-24T09:30:00Z", result: "above", targetPrice: 68147, settlePrice: 70424 },
  { id: 1855, expiry: "2026-03-23T09:30:00Z", result: "above", targetPrice: 67562, settlePrice: 68150 },
  { id: 1758, expiry: "2026-03-22T09:30:00Z", result: "below", targetPrice: 71168, settlePrice: 67580 },
  { id: 1661, expiry: "2026-03-21T09:30:00Z", result: "below", targetPrice: 71900, settlePrice: 71168 },
];

const HYPE_ROUNDS: Round[] = [
  { id: 2664, expiry: new Date(Date.now() + 300000).toISOString(), result: null, targetPrice: 39 },
  { id: 2663, expiry: "2026-03-30T17:15:00Z", result: "below", targetPrice: 39, settlePrice: 39 },
  { id: 2662, expiry: "2026-03-30T17:00:00Z", result: "below", targetPrice: 39, settlePrice: 39 },
  { id: 2661, expiry: "2026-03-30T16:45:00Z", result: "below", targetPrice: 42, settlePrice: 39 },
  { id: 2660, expiry: "2026-03-30T16:30:00Z", result: "below", targetPrice: 42, settlePrice: 42 },
  { id: 2659, expiry: "2026-03-30T16:15:00Z", result: "below", targetPrice: 42, settlePrice: 42 },
  { id: 2658, expiry: "2026-03-30T16:00:00Z", result: "above", targetPrice: 41, settlePrice: 42 },
  { id: 2657, expiry: "2026-03-30T15:45:00Z", result: "above", targetPrice: 43.886, settlePrice: 44.43 },
  { id: 2656, expiry: "2026-03-30T15:30:00Z", result: "below", targetPrice: 45, settlePrice: 43.92 },
];

// ─── Preview ─────────────────────────────────────────────────────────────────

export default function RoundsTimelinePreview() {
  const [btcActive, setBtcActive] = useState(BTC_ROUNDS[0].id);
  const [hypeActive, setHypeActive] = useState(HYPE_ROUNDS[0].id);

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono mb-3">BTC — Daily rounds</p>
        <MockTimeline rounds={BTC_ROUNDS} activeId={btcActive} onSelect={(r) => setBtcActive(r.id)} short={false} underlying="BTC" />
        <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">
          Selected: #{btcActive} — {BTC_ROUNDS.find((r) => r.id === btcActive)?.result ?? "live"}
        </p>
      </div>
      <div className="border-t" />
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono mb-3">HYPE — 15-minute rounds</p>
        <MockTimeline rounds={HYPE_ROUNDS} activeId={hypeActive} onSelect={(r) => setHypeActive(r.id)} short={true} underlying="HYPE" visibleCount={6} />
        <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">
          Selected: #{hypeActive} — {HYPE_ROUNDS.find((r) => r.id === hypeActive)?.result ?? "live"}
        </p>
      </div>
    </div>
  );
}
