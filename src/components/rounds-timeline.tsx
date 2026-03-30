/**
 * RoundsTimeline — Polymarket-style bottom bar for navigating recurring market rounds.
 *
 * Shows inline tabs for recent rounds with result indicators (circled ▲/▼),
 * a "Past" popover dropdown grouped by date for older rounds, and a streak strip
 * showing the last N results at a glance.
 *
 * Pure presentational — pass rounds data directly, no data fetching.
 *
 * Usage:
 *   <RoundsTimeline
 *     rounds={rounds}
 *     activeRoundId={currentRound.id}
 *     onRoundSelect={(round) => navigate(`/market/${round.id}`)}
 *     period="15m"
 *     underlying="BTC"
 *   />
 *
 * registryDependencies: ["popover"] — uses the consumer's shadcn Popover
 */

"use client";

import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Round {
  /** Unique round identifier (e.g. outcome_id) */
  id: number;
  /** ISO 8601 or UTC timestamp for round expiry */
  expiry: string;
  /** Settlement result: "above" = yes won, "below" = no won, null = unsettled */
  result: "above" | "below" | null;
  /** Price at which the market settled */
  settlePrice?: number;
  /** Target/strike price for this round */
  targetPrice: number;
}

export interface RoundsTimelineProps {
  /** All rounds, sorted by expiry descending (newest first) */
  rounds: Round[];
  /** ID of the currently active/viewed round */
  activeRoundId: number;
  /** Called when a round is selected */
  onRoundSelect: (round: Round) => void;
  /** Market period — controls label formatting ("15m" = time, "1d" = date) */
  period: string;
  /** Underlying asset symbol for icon display (e.g. "BTC", "HYPE") */
  underlying?: string;
  /** Number of tabs visible inline before overflow into Past dropdown. Default: 5 */
  visibleCount?: number;
  /** Additional CSS classes */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(raw: string): Date | null {
  try {
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function isShortPeriod(period: string): boolean {
  const match = period.match(/^(\d+)(m|h)$/);
  if (!match) return false;
  const val = parseInt(match[1]);
  const unit = match[2];
  return unit === "m" || (unit === "h" && val < 24);
}

function formatTabLabel(expiry: string, period: string): string {
  const d = parseDate(expiry);
  if (!d) return expiry;
  if (isShortPeriod(period)) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDropdownLabel(expiry: string, period: string): { time: string; relative: string } {
  const d = parseDate(expiry);
  if (!d) return { time: expiry, relative: "" };

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const relative = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : `${diffDays}d ago`;

  if (isShortPeriod(period)) {
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
    });
    return { time, relative };
  }
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { time: date, relative };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Circled arrow indicator — green circle + white ▲ or red circle + white ▼ */
function ResultBadge({
  result,
  className = "",
}: {
  result: "above" | "below" | null;
  className?: string;
}) {
  if (result === null) {
    return (
      <span className={`relative flex items-center justify-center w-5 h-5 ${className}`} aria-label="Live">
        <span className="absolute h-full w-full rounded-full bg-destructive/20 animate-ping" />
        <span className="relative w-2.5 h-2.5 rounded-full bg-destructive" />
      </span>
    );
  }

  const bg = result === "above" ? "bg-success" : "bg-destructive";
  const arrowD = result === "above"
    ? "M6 3 L10 8.5 L2 8.5 Z"
    : "M6 9 L2 3.5 L10 3.5 Z";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full w-5 h-5 ${bg} shrink-0 ${className}`}
      aria-label={result === "above" ? "Above" : "Below"}
    >
      <svg viewBox="0 0 12 12" fill="white" className="w-2.5 h-2.5">
        <path d={arrowD} />
      </svg>
    </span>
  );
}

function StreakStrip({
  rounds,
  period,
  onRoundSelect,
}: {
  rounds: Round[];
  period: string;
  onRoundSelect: (round: Round) => void;
}) {
  const settled = rounds.filter((r) => r.result !== null).slice(0, 4);
  if (settled.length === 0) return null;
  return (
    <div className="flex items-center gap-1 group/streak" aria-label="Recent results">
      {settled.map((r) => (
        <button
          key={r.id}
          onClick={() => onRoundSelect(r)}
          className="relative transition-opacity group-hover/streak:opacity-40 hover:!opacity-100 group/badge"
          title={formatTabLabel(r.expiry, period)}
        >
          <ResultBadge result={r.result} />
          {/* Tooltip */}
          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-popover border border-border px-2 py-1 text-[11px] font-medium tabular-nums text-popover-foreground whitespace-nowrap opacity-0 group-hover/badge:opacity-100 transition-opacity shadow-sm">
            {formatTabLabel(r.expiry, period)}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function RoundsTimeline({
  rounds,
  activeRoundId,
  onRoundSelect,
  period,
  underlying,
  visibleCount = 5,
  className,
}: RoundsTimelineProps) {
  const [pastOpen, setPastOpen] = useState(false);

  const { tabs, overflow } = useMemo(() => {
    const sorted = [...rounds].sort((a, b) => {
      const dateA = parseDate(a.expiry)?.getTime() ?? 0;
      const dateB = parseDate(b.expiry)?.getTime() ?? 0;
      return dateB - dateA;
    });
    return { tabs: sorted.slice(0, visibleCount), overflow: sorted.slice(visibleCount) };
  }, [rounds, visibleCount]);

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full bg-card border border-border/50 px-2 py-1.5",
        className,
      ].filter(Boolean).join(" ")}
      role="navigation"
      aria-label="Rounds timeline"
    >
      {/* Past button + dropdown */}
      {overflow.length > 0 && (
        <Popover open={pastOpen} onOpenChange={setPastOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border border-border/60 hover:bg-secondary/60 text-foreground"
            >
              Past
              <svg
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${pastOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={8}
            className="w-64 max-h-80 overflow-y-auto p-2"
          >
            {overflow.map((round) => {
              const { time, relative } = formatDropdownLabel(round.expiry, period);
              return (
                <button
                  key={round.id}
                  onClick={() => { onRoundSelect(round); setPastOpen(false); }}
                  className={[
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                    round.id === activeRoundId
                      ? "bg-secondary"
                      : "hover:bg-secondary/60",
                  ].join(" ")}
                >
                  <ResultBadge result={round.result} />
                  <span className="text-sm font-medium tabular-nums">{time}</span>
                  <span className="text-sm text-muted-foreground">· {relative}</span>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      )}

      {/* Streak strip */}
      {overflow.length > 0 && (
        <>
          <div className="w-px h-6 bg-border/50" aria-hidden />
          <StreakStrip rounds={overflow} period={period} onRoundSelect={onRoundSelect} />
        </>
      )}

      {/* Inline round tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {[...tabs].reverse().map((round) => {
          const isActive = round.id === activeRoundId;
          const isLive = round.result === null;

          return (
            <button
              key={round.id}
              onClick={() => onRoundSelect(round)}
              className={[
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              ].join(" ")}
              aria-current={isActive ? "true" : undefined}
            >
              {isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                </span>
              )}
              <span className="tabular-nums">{formatTabLabel(round.expiry, period)}</span>
            </button>
          );
        })}
      </div>

      {/* Underlying asset icon */}
      {underlying && (
        <>
          <div className="w-px h-6 bg-border/50 ml-auto" aria-hidden />
          <img
            src={`https://app.hyperliquid.xyz/coins/${underlying}.svg`}
            alt={underlying}
            className="h-7 w-7 rounded-full bg-secondary/60 shrink-0"
          />
        </>
      )}
    </div>
  );
}
