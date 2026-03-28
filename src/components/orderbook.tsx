/**
 * Orderbook — dual-pane L2 orderbook for a prediction market.
 *
 * Shows bids and asks for a yes coin, with optional mirrored pair display.
 * Color-coded depth bars. Click a price level to set a limit price.
 *
 * Usage:
 *   <Orderbook coin="#9860" bids={bids} asks={asks} depth={10} />
 */

"use client";

import type { BookLevel } from "../hooks/use-orderbook.js";
import { formatMidPrice } from "../lib/format.js";

export interface OrderbookProps {
  /** Coin name for display */
  coin: string;
  /** Bid levels (sorted by price descending) */
  bids: BookLevel[];
  /** Ask levels (sorted by price ascending) */
  asks: BookLevel[];
  /** Number of levels to display. Default: 10 */
  depth?: number;
  /** Called when a user clicks a price level (sets limit price) */
  onPriceClick?: (price: number) => void;
  /** Additional CSS classes */
  className?: string;
}

interface LevelRowProps {
  level: BookLevel;
  side: "bid" | "ask";
  maxSize: number;
  onPriceClick?: (price: number) => void;
}

function LevelRow({ level, side, maxSize, onPriceClick }: LevelRowProps) {
  const px = parseFloat(level.px);
  const sz = parseFloat(level.sz);
  const fillPct = maxSize > 0 ? (sz / maxSize) * 100 : 0;

  const bidBg = "bg-success/10";
  const askBg = "bg-destructive/10";
  const bidText = "text-success";
  const askText = "text-destructive";

  return (
    <div
      className={[
        "relative flex items-center justify-between px-2 py-0.5 text-xs cursor-pointer select-none",
        "hover:bg-muted/50 transition-colors",
      ].join(" ")}
      onClick={() => onPriceClick?.(px)}
      title={`${side === "bid" ? "Bid" : "Ask"} ${level.px} × ${level.sz} (${level.n} orders)`}
    >
      {/* Depth fill bar */}
      <div
        className={`absolute inset-y-0 ${side === "bid" ? "right-0" : "left-0"} ${side === "bid" ? bidBg : askBg}`}
        style={{ width: `${fillPct}%` }}
        aria-hidden
      />
      <span className={`font-mono relative z-10 ${side === "bid" ? bidText : askText}`}>
        {formatMidPrice(px, "decimal")}
      </span>
      <span className="font-mono relative z-10 text-foreground">
        {parseFloat(level.sz).toLocaleString()}
      </span>
    </div>
  );
}

/**
 * A compact L2 orderbook table.
 *
 * Asks are shown above bids with the spread in the middle.
 * Color-coded depth bars indicate relative size.
 */
export function Orderbook({
  coin,
  bids,
  asks,
  depth = 10,
  onPriceClick,
  className = "",
}: OrderbookProps) {
  const visibleBids = bids.slice(0, depth);
  const visibleAsks = asks.slice(0, depth);

  const allSizes = [...visibleBids, ...visibleAsks].map((l) => parseFloat(l.sz));
  const maxSize = allSizes.length > 0 ? Math.max(...allSizes) : 1;

  const bestBid = visibleBids[0] ? parseFloat(visibleBids[0].px) : null;
  const bestAsk = visibleAsks[0] ? parseFloat(visibleAsks[0].px) : null;
  const spread =
    bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;

  return (
    <div className={`rounded-lg border bg-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b text-xs text-muted-foreground">
        <span className="font-medium">Orderbook</span>
        <span className="font-mono">{coin}</span>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground bg-muted/30">
        <span>Price</span>
        <span>Size</span>
      </div>

      {/* Asks (top, ascending) */}
      <div className="flex flex-col-reverse">
        {visibleAsks.map((level) => (
          <LevelRow
            key={level.px}
            level={level}
            side="ask"
            maxSize={maxSize}
            onPriceClick={onPriceClick}
          />
        ))}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-center px-2 py-1 border-y bg-muted/20 text-xs text-muted-foreground">
        {spread !== null ? (
          <>
            <span>Spread: </span>
            <span className="font-mono ml-1">{(spread * 100).toFixed(2)}¢</span>
          </>
        ) : (
          <span>No data</span>
        )}
      </div>

      {/* Bids (bottom, descending) */}
      <div className="flex flex-col">
        {visibleBids.map((level) => (
          <LevelRow
            key={level.px}
            level={level}
            side="bid"
            maxSize={maxSize}
            onPriceClick={onPriceClick}
          />
        ))}
      </div>
    </div>
  );
}
