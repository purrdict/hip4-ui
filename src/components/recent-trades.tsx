/**
 * RecentTrades — scrollable table of recent trades for a prediction market.
 *
 * Pure presentation — receives a trades array as props. Color-codes sides
 * (green for buy, red for sell). Uses monospace tabular numbers.
 *
 * Usage:
 *   <RecentTrades
 *     trades={[
 *       { side: "B", price: 0.65, size: 100, time: Date.now() },
 *       { side: "S", price: 0.64, size: 50, time: Date.now() - 5000 },
 *     ]}
 *   />
 */

"use client";

export interface Trade {
  /** "B" for buy, "S" for sell */
  side: "B" | "S";
  /** Price in [0, 1] range */
  price: number;
  /** Number of shares */
  size: number;
  /** Timestamp in ms */
  time: number;
}

export interface RecentTradesProps {
  /** Array of recent trades, newest first */
  trades: Trade[];
  /** Maximum number of rows to display — defaults to 20 */
  maxRows?: number;
  /** Additional CSS classes */
  className?: string;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * A scrollable table of recent trades for a prediction market.
 *
 * Each row shows the side (Yes/No or Buy/Sell label), price in cents,
 * size in shares, and time. Color-coded: buy = `text-success`,
 * sell = `text-destructive`.
 *
 * Example:
 * ```tsx
 * <RecentTrades
 *   trades={[{ side: "B", price: 0.65, size: 100, time: Date.now() }]}
 * />
 * ```
 */
export function RecentTrades({
  trades,
  maxRows = 20,
  className,
}: RecentTradesProps) {
  const visible = trades.slice(0, maxRows);

  return (
    <div className={["space-y-px text-xs", className].filter(Boolean).join(" ")}>
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_56px_64px] gap-x-2 px-2.5 pb-1.5 border-b border-border/30 text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>

      {visible.length === 0 && (
        <div className="text-center text-muted-foreground py-6 text-[11px]">
          No trades yet
        </div>
      )}

      {visible.map((trade, i) => {
        const isBuy = trade.side === "B";
        const colorClass = isBuy ? "text-success" : "text-destructive";
        const sideLabel = isBuy ? "Buy" : "Sell";
        const priceCents = (trade.price * 100).toFixed(1);

        return (
          <div
            // Use index as key since trades may not have unique IDs
            key={i}
            className="grid grid-cols-[40px_1fr_56px_64px] gap-x-2 px-2.5 py-1 hover:bg-secondary/20 transition-colors"
          >
            <span className={`font-medium ${colorClass}`}>
              {sideLabel}
            </span>
            <span className={`text-right tabular-nums font-mono font-bold ${colorClass}`}>
              {priceCents}¢
            </span>
            <span className="text-right tabular-nums font-mono text-muted-foreground">
              {Math.floor(trade.size)}
            </span>
            <span className="text-right text-muted-foreground tabular-nums font-mono text-[11px]">
              {formatTime(trade.time)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
