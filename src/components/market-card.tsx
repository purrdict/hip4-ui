/**
 * MarketCard — display card for a single HIP-4 prediction market.
 *
 * Shows: market label, underlying asset, Yes/No prices with color coding,
 * expiry countdown, and optional volume badge.
 *
 * Usage:
 *   <MarketCard
 *     market={market}
 *     yesMid={0.65}
 *     noMid={0.35}
 *     volume={1234}
 *     onClick={() => router.push(`/market/${market.yesCoin}`)}
 *   />
 */

"use client";

import type { Market } from "@purrdict/hip4";
import { CountdownTimer } from "./countdown-timer.js";
import { formatMidPrice, formatTargetPrice, formatPeriod, parseMid } from "../lib/format.js";

export interface MarketCardProps {
  market: Market;
  /**
   * Yes mid price (0–1). Pass mids[market.yesCoin] from useMarkets().
   * If not provided, the price is shown as "—".
   */
  yesMid?: number | string;
  /**
   * No mid price (0–1). Defaults to 1 − yesMid if not provided.
   */
  noMid?: number | string;
  /**
   * Optional 24h volume in USDH.
   */
  volume?: number;
  /** Called when the card is clicked */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// Colour helpers — compatible with shadcn CSS variables.
function yesClass(px: number): string {
  if (px >= 0.6) return "text-green-500";
  if (px <= 0.4) return "text-red-500";
  return "text-foreground";
}

function noClass(px: number): string {
  if (px >= 0.6) return "text-green-500";
  if (px <= 0.4) return "text-red-500";
  return "text-foreground";
}

/**
 * A card showing a single prediction market.
 *
 * The card is a clickable surface when `onClick` is provided.
 * Styles use shadcn CSS variables so it inherits the host app's theme.
 */
export function MarketCard({
  market,
  yesMid: yesMidProp,
  noMid: noMidProp,
  volume,
  onClick,
  className = "",
}: MarketCardProps) {
  const yesPx = yesMidProp !== undefined ? parseMid(String(yesMidProp)) : 0;
  const noPx =
    noMidProp !== undefined
      ? parseMid(String(noMidProp))
      : yesPx > 0
        ? 1 - yesPx
        : 0;

  const hasPrice = yesPx > 0;

  const isClickable = !!onClick;

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onClick?.() : undefined}
      className={[
        "rounded-lg border bg-card text-card-foreground shadow-sm p-4",
        "flex flex-col gap-3",
        isClickable
          ? "cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${market.underlying} ${formatPeriod(market.period)} market`}
    >
      {/* Header: underlying + period */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {market.underlying}
          </p>
          <h3 className="font-semibold text-sm leading-tight">
            {market.underlying} Up or Down — {formatPeriod(market.period)}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target: {formatTargetPrice(market.targetPrice)}
          </p>
        </div>

        {/* Volume badge */}
        {volume !== undefined && (
          <span className="shrink-0 text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
            Vol ${volume.toLocaleString()}
          </span>
        )}
      </div>

      {/* Yes / No prices */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-muted/50 p-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Yes</p>
          <p className={`font-bold text-base tabular-nums ${hasPrice ? yesClass(yesPx) : "text-muted-foreground"}`}>
            {hasPrice ? formatMidPrice(yesPx, "cents") : "—"}
          </p>
        </div>
        <div className="rounded bg-muted/50 p-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">No</p>
          <p className={`font-bold text-base tabular-nums ${hasPrice ? noClass(noPx) : "text-muted-foreground"}`}>
            {hasPrice ? formatMidPrice(noPx, "cents") : "—"}
          </p>
        </div>
      </div>

      {/* Footer: countdown */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Expires in</span>
        <CountdownTimer expiry={market.expiry} className="text-xs" />
      </div>
    </div>
  );
}
