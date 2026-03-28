/**
 * PositionCard — shows a user's position in a prediction market.
 *
 * Usage:
 *   <PositionCard
 *     coin="#9860"
 *     shares={100}
 *     avgEntry={0.45}
 *     currentPrice={0.65}
 *     onSell={(coin) => {}}
 *   />
 */

"use client";

import { formatMidPrice, formatUsdh } from "../lib/format.js";

export interface PositionCardProps {
  /** Coin name (e.g. "#9860") */
  coin: string;
  /** Number of shares held */
  shares: number;
  /**
   * Average entry price.
   * Pass undefined if not known (e.g. positions derived from balance only).
   */
  avgEntry?: number;
  /** Current mark/mid price */
  currentPrice: number;
  /** Called when the user clicks "Sell" */
  onSell?: (coin: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A card showing a position with PnL (when entry price is available).
 */
export function PositionCard({
  coin,
  shares,
  avgEntry,
  currentPrice,
  onSell,
  className = "",
}: PositionCardProps) {
  const hasEntry = avgEntry !== undefined && avgEntry > 0;
  const cost = hasEntry ? avgEntry! * shares : null;
  const value = currentPrice * shares;
  const pnl = cost !== null ? value - cost : null;
  const pnlPct = cost !== null && cost > 0 ? ((value - cost) / cost) * 100 : null;
  const isProfit = pnl !== null && pnl >= 0;

  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm p-4 ${className}`}
      aria-label={`Position: ${shares} shares of ${coin}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Position</p>
          <h4 className="font-semibold">{coin}</h4>
        </div>
        {onSell && (
          <button
            onClick={() => onSell(coin)}
            className="text-xs px-2 py-1 rounded border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            Sell
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Shares</p>
          <p className="font-mono font-medium">{shares.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current Price</p>
          <p className="font-mono font-medium">{formatMidPrice(currentPrice, "cents")}</p>
        </div>
        {hasEntry && (
          <div>
            <p className="text-xs text-muted-foreground">Avg Entry</p>
            <p className="font-mono font-medium">{formatMidPrice(avgEntry!, "cents")}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Value</p>
          <p className="font-mono font-medium">{formatUsdh(value)}</p>
        </div>
        {pnl !== null && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Unrealized P&L</p>
            <p
              className={`font-mono font-medium ${isProfit ? "text-green-500" : "text-red-500"}`}
            >
              {isProfit ? "+" : ""}
              {formatUsdh(pnl)}
              {pnlPct !== null && (
                <span className="text-xs ml-1 opacity-80">
                  ({isProfit ? "+" : ""}
                  {pnlPct.toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
