/**
 * RoundsTimeline — Polymarket-style bottom bar for navigating recurring market rounds.
 *
 * Shows inline tabs for recent rounds with result indicators (▲ above / ▼ below),
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
 * Dependencies: @radix-ui/react-popover (shadcn Popover)
 */

"use client";

import { useState, useMemo } from "react";
import * as Popover from "@radix-ui/react-popover";

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
    // Handle ClickHouse UTC format "YYYY-MM-DD HH:MM:SS"
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
    // Short period: time only — "7:00 AM"
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Daily/weekly: date only — "Mar 28"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDropdownLabel(expiry: string, period: string): string {
  const d = parseDate(expiry);
  if (!d) return expiry;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relative: string;
  if (diffDays === 0) relative = "Today";
  else if (diffDays === 1) relative = "Yesterday";
  else relative = `${diffDays}d ago`;

  if (isShortPeriod(period)) {
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    return `${time} · ${relative}`;
  }

  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${date} · ${relative}`;
}

function getDateGroupKey(expiry: string): string {
  const d = parseDate(expiry);
  if (!d) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: now.getFullYear() !== d.getFullYear() ? "numeric" : undefined,
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResultIndicator({
  result,
  size = "sm",
}: {
  result: "above" | "below" | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (result === null) {
    return (
      <span
        className={`inline-flex items-center justify-center ${dim}`}
        aria-label="Live"
      >
        <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
      </span>
    );
  }

  if (result === "above") {
    return (
      <span
        className={`inline-flex items-center justify-center ${dim} text-success`}
        aria-label="Above"
      >
        <svg
          viewBox="0 0 12 12"
          fill="currentColor"
          className="h-full w-full"
        >
          <path d="M6 1.5 L10.5 9 L1.5 9 Z" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center ${dim} text-destructive`}
      aria-label="Below"
    >
      <svg
        viewBox="0 0 12 12"
        fill="currentColor"
        className="h-full w-full"
      >
        <path d="M6 10.5 L1.5 3 L10.5 3 Z" />
      </svg>
    </span>
  );
}

function StreakStrip({ rounds }: { rounds: Round[] }) {
  // Show last 4 settled results as colored indicators
  const settled = rounds.filter((r) => r.result !== null).slice(0, 4);
  if (settled.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5" aria-label="Recent results">
      {settled.map((r) => (
        <ResultIndicator key={r.id} result={r.result} size="sm" />
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

/**
 * Polymarket-style rounds timeline bar.
 *
 * Displays inline tabs for the most recent rounds with result indicators,
 * and a "Past" popover for navigating older rounds grouped by date.
 *
 * Example:
 * ```tsx
 * <RoundsTimeline
 *   rounds={[
 *     { id: 1, expiry: "2026-03-30T09:30:00Z", result: "above", targetPrice: 67000, settlePrice: 67500 },
 *     { id: 2, expiry: "2026-03-29T09:30:00Z", result: "below", targetPrice: 68000, settlePrice: 66000 },
 *   ]}
 *   activeRoundId={1}
 *   onRoundSelect={(round) => console.log("Selected:", round)}
 *   period="1d"
 *   underlying="BTC"
 * />
 * ```
 */
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

  // Split rounds into visible tabs and overflow (Past dropdown)
  const { tabs, overflow } = useMemo(() => {
    // Sort by expiry descending (newest first)
    const sorted = [...rounds].sort((a, b) => {
      const dateA = parseDate(a.expiry)?.getTime() ?? 0;
      const dateB = parseDate(b.expiry)?.getTime() ?? 0;
      return dateB - dateA;
    });

    return {
      tabs: sorted.slice(0, visibleCount),
      overflow: sorted.slice(visibleCount),
    };
  }, [rounds, visibleCount]);

  // Group overflow rounds by date for the dropdown
  const groupedOverflow = useMemo(() => {
    const groups: { label: string; rounds: Round[] }[] = [];
    let currentLabel = "";

    for (const round of overflow) {
      const label = getDateGroupKey(round.expiry);
      if (label !== currentLabel) {
        groups.push({ label, rounds: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].rounds.push(round);
    }

    return groups;
  }, [overflow]);

  return (
    <div
      className={[
        "flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm px-2 py-1.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="navigation"
      aria-label="Rounds timeline"
    >
      {/* Past button + dropdown */}
      {overflow.length > 0 && (
        <Popover.Root open={pastOpen} onOpenChange={setPastOpen}>
          <Popover.Trigger asChild>
            <button
              className={[
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                pastOpen
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              ].join(" ")}
              aria-label={`Past rounds (${overflow.length})`}
            >
              <span>Past</span>
              <svg
                className={`h-3 w-3 transition-transform ${pastOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              side="top"
              align="start"
              sideOffset={8}
              className="z-50 w-56 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
            >
              <div className="p-1.5">
                {groupedOverflow.map((group) => (
                  <div key={group.label}>
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </div>
                    {group.rounds.map((round) => (
                      <button
                        key={round.id}
                        onClick={() => {
                          onRoundSelect(round);
                          setPastOpen(false);
                        }}
                        className={[
                          "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left text-sm transition-colors",
                          round.id === activeRoundId
                            ? "bg-secondary text-foreground"
                            : "text-foreground/80 hover:bg-secondary/60",
                        ].join(" ")}
                      >
                        <ResultIndicator result={round.result} size="md" />
                        <span className="tabular-nums">
                          {formatDropdownLabel(round.expiry, period)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

      {/* Streak strip — last 4 results at a glance */}
      {overflow.length > 0 && (
        <>
          <StreakStrip rounds={overflow} />
          <div className="w-px h-5 bg-border/60" aria-hidden />
        </>
      )}

      {/* Inline round tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {/* Render tabs in chronological order (oldest first, newest/active last) */}
        {[...tabs].reverse().map((round) => {
          const isActive = round.id === activeRoundId;
          const isLive = round.result === null;

          return (
            <button
              key={round.id}
              onClick={() => onRoundSelect(round)}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              ].join(" ")}
              aria-current={isActive ? "true" : undefined}
              aria-label={`${isLive ? "Live" : round.result === "above" ? "Above" : "Below"} — ${formatTabLabel(round.expiry, period)}`}
            >
              {isLive ? (
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              ) : (
                <ResultIndicator result={round.result} size="sm" />
              )}
              <span className="tabular-nums">
                {formatTabLabel(round.expiry, period)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Underlying asset icon */}
      {underlying && (
        <>
          <div className="w-px h-5 bg-border/60 ml-auto" aria-hidden />
          <img
            src={`https://app.hyperliquid.xyz/coins/${underlying}.svg`}
            alt={underlying}
            className="h-6 w-6 rounded-full bg-secondary/60 shrink-0"
          />
        </>
      )}
    </div>
  );
}
