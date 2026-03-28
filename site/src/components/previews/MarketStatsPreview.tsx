"use client";

export default function MarketStatsPreview() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground w-[400px] px-5 py-4">
      <div className="flex items-center gap-5 text-sm">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          <span className="font-mono font-semibold tabular-nums text-foreground">$42.5K</span>
          <span className="text-xs text-muted-foreground">volume</span>
        </div>

        <span className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="font-mono font-semibold tabular-nums text-foreground">186</span>
          <span className="text-xs text-muted-foreground">trades</span>
        </div>

        <span className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <span className="font-mono font-semibold tabular-nums text-foreground">24</span>
          <span className="text-xs text-muted-foreground">traders</span>
        </div>
      </div>
    </div>
  );
}
