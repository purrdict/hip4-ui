"use client";

import { useState, useEffect } from "react";

function ProbabilityBar({
  yesPx,
  yesLabel = "Yes",
  noLabel = "No",
}: {
  yesPx: number;
  yesLabel?: string;
  noLabel?: string;
}) {
  const noPx = 1 - yesPx;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium text-success">{yesLabel} {(yesPx * 100).toFixed(1)}¢</span>
        <span className="font-medium text-destructive">{noLabel} {(noPx * 100).toFixed(1)}¢</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        <div
          className="h-full bg-success rounded-l-full transition-all duration-700"
          style={{ width: `${yesPx * 100}%` }}
        />
        <div
          className="h-full bg-destructive rounded-r-full transition-all duration-700"
          style={{ width: `${noPx * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function ProbabilityBarPreview() {
  const [yesPx, setYesPx] = useState(0.72);

  // Simulate live price movement
  useEffect(() => {
    const timer = setInterval(() => {
      setYesPx((px) => {
        const delta = (Math.random() - 0.5) * 0.03;
        return Math.max(0.1, Math.min(0.9, px + delta));
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-[360px] space-y-6">
      {/* Default Yes/No */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono mb-3">Binary market</p>
        <ProbabilityBar yesPx={yesPx} />
      </div>

      {/* Recurring Up/Down */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono mb-3">Recurring market</p>
        <ProbabilityBar yesPx={0.58} yesLabel="Up" noLabel="Down" />
      </div>

      {/* Named binary */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono mb-3">Named sides</p>
        <ProbabilityBar yesPx={0.35} yesLabel="Hypurr" noLabel="Jeff" />
      </div>
    </div>
  );
}
