/**
 * ProbabilityChart — multi-outcome probability chart via Liveline.
 */

"use client";

import { Liveline, type LivelineSeries } from "liveline";
import { useMemo } from "react";

export const OUTCOME_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#06b6d4",
  "#f43f5e",
  "#84cc16",
];

export interface OutcomeSeries {
  id: string;
  label: string;
  color: string;
  data: Array<{ time: number; value: number }>;
  currentValue: number;
}

export interface ProbabilityChartProps {
  series: OutcomeSeries[];
  height?: number;
  theme?: "light" | "dark";
  className?: string;
}

function resolveColor(s: OutcomeSeries, idx: number): string {
  return s.color ?? OUTCOME_COLORS[idx % OUTCOME_COLORS.length]!;
}

function formatPercent(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function ProbabilityChart({
  series,
  height = 220,
  theme = "dark",
  className = "",
}: ProbabilityChartProps) {
  const livelineSeries = useMemo<LivelineSeries[]>(
    () =>
      series.map((s, index) => ({
        id: s.id,
        label: s.label,
        color: resolveColor(s, index),
        data: [...s.data]
          .sort((a, b) => a.time - b.time)
          .map(({ time, value }) => ({ time, value })),
        value: s.currentValue,
      })),
    [series],
  );

  const hasData = livelineSeries.some((s) => s.data.length > 0);

  if (!hasData) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-muted-foreground ${className}`}
        style={{ height }}
      >
        No probability history yet
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div
        aria-label="Outcome probabilities"
        className={`pointer-events-none absolute right-2 top-2 z-10 flex max-w-[62%] flex-wrap justify-end gap-x-3 gap-y-1 rounded-md px-2 py-1 text-[10px] backdrop-blur-sm ${
          theme === "dark"
            ? "bg-black/40 text-white/70"
            : "bg-white/70 text-black/60"
        }`}
      >
        {series.map((outcome, index) => {
          const latest =
            outcome.currentValue ??
            outcome.data[outcome.data.length - 1]?.value ??
            0;

          return (
            <span className="inline-flex items-center gap-1" key={outcome.id}>
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: resolveColor(outcome, index) }}
              />
              <span>{outcome.label}</span>
              <span className="font-mono tabular-nums">
                {formatPercent(latest)}
              </span>
            </span>
          );
        })}
      </div>
      <Liveline
        badge={false}
        data={[]}
        formatValue={formatPercent}
        grid
        pulse
        scrub
        series={livelineSeries}
        seriesToggleCompact
        theme={theme}
        value={0}
        window={3_600}
        windows={[
          { label: "1h", secs: 3_600 },
          { label: "6h", secs: 21_600 },
          { label: "24h", secs: 86_400 },
        ]}
        windowStyle="rounded"
      />
    </div>
  );
}
