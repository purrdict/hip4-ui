/**
 * MarketStats — compact inline stats bar for a prediction market.
 *
 * Displays volume, trade count, and unique trader count in a single row.
 * Pure presentation — receives data as props, no data fetching.
 *
 * Usage:
 *   <MarketStats volume={42000} trades={312} traders={87} />
 *   <MarketStats volume={1500} trades={55} traders={20} className="mt-2" />
 */

"use client";

import { formatUsdh } from "../lib/format.js";

export interface MarketStatsProps {
  /** 24h volume in USDH */
  volume: number;
  /** Total number of trades */
  trades: number;
  /** Total number of unique traders */
  traders: number;
  /** Additional CSS classes */
  className?: string;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Compact stats bar showing key market metrics inline.
 *
 * Example:
 * ```tsx
 * <MarketStats volume={42000} trades={312} traders={87} />
 * ```
 */
export function MarketStats({
  volume,
  trades,
  traders,
  className,
}: MarketStatsProps) {
  return (
    <div
      className={[
        "flex flex-wrap items-center gap-x-5 gap-y-1 text-xs",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Stat label="Volume" value={formatUsdh(volume, true)} />
      <Stat label="Trades" value={String(trades)} />
      <Stat label="Traders" value={String(traders)} />
    </div>
  );
}
