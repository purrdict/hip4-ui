"use client";

import { useState, useEffect } from "react";

function useCountdown(initialMs: number) {
  const [remaining, setRemaining] = useState(initialMs);
  useEffect(() => {
    const tick = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  const days = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);

  return { days, h, m, s, done: remaining === 0, remaining };
}

function Segment({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2 text-center min-w-[52px]">
      <span className="block text-2xl font-bold font-mono tabular-nums text-foreground leading-none">{value}</span>
      <span className="block text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

function Colon() {
  return <span className="text-xl font-bold text-muted-foreground/40 pb-3">:</span>;
}

export default function CountdownPreview() {
  const active = useCountdown(8130000);
  const urgent = useCountdown(245000);

  return (
    <div className="flex flex-col gap-6">
      {/* Active timer — segmented */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono mb-3">Active market</p>
        <div className="flex items-end gap-1.5">
          {active.h > 0 && (
            <>
              <Segment value={active.h.toString().padStart(2, "0")} label="hrs" />
              <Colon />
            </>
          )}
          <Segment value={active.m.toString().padStart(2, "0")} label="min" />
          <Colon />
          <Segment value={active.s.toString().padStart(2, "0")} label="sec" />
        </div>
      </div>

      <div className="border-t" />

      {/* Urgent timer */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono mb-3">Urgent (&lt;5 min)</p>
        <div className="flex items-end gap-1.5">
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-center min-w-[52px]">
            <span className="block text-2xl font-bold font-mono tabular-nums text-destructive leading-none">
              {urgent.m.toString().padStart(2, "0")}
            </span>
            <span className="block text-[10px] text-destructive/60 uppercase tracking-wider mt-1">min</span>
          </div>
          <span className="text-xl font-bold text-destructive/40 pb-3">:</span>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-center min-w-[52px]">
            <span className="block text-2xl font-bold font-mono tabular-nums text-destructive leading-none">
              {urgent.s.toString().padStart(2, "0")}
            </span>
            <span className="block text-[10px] text-destructive/60 uppercase tracking-wider mt-1">sec</span>
          </div>
          <span className="relative flex h-2 w-2 mb-5 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
        </div>
      </div>

      <div className="border-t" />

      {/* Settled state */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono mb-3">After expiry</p>
        <div className="inline-flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 px-4 py-2">
          <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm font-semibold text-success">Settled</span>
        </div>
      </div>
    </div>
  );
}
