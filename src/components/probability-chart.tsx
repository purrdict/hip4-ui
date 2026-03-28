/**
 * ProbabilityChart — Polymarket-style multi-line probability chart.
 *
 * Shows outcome probabilities over time for multi-outcome question markets.
 * Each outcome gets its own colored step-function line.
 * NOT for binary markets — use ProbabilityBar + LivePriceChart instead.
 *
 * Usage:
 *   const { series } = useProbabilityHistory(questionMarkets)
 *   <ProbabilityChart series={series} />
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/** Auto-assigned color palette — 8 visually distinct colors for dark backgrounds */
export const OUTCOME_COLORS = [
  "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6",
  "#10b981", "#06b6d4", "#f43f5e", "#84cc16",
];

/** A single outcome's data for the chart. Same type as useProbabilityHistory returns. */
export interface OutcomeSeries {
  id: string;
  label: string;
  color: string;
  data: Array<{ time: number; value: number }>;
  currentValue: number;
}

export interface ProbabilityChartProps {
  series: OutcomeSeries[];
  /** Chart height in px. Default: 220 */
  height?: number;
  /** Theme: "light" | "dark". Default: "dark" */
  theme?: "light" | "dark";
  /** Additional CSS classes */
  className?: string;
}

// ---- helpers ----

function resolveColor(s: OutcomeSeries, idx: number): string {
  return s.color ?? OUTCOME_COLORS[idx % OUTCOME_COLORS.length];
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function formatPercent(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function formatTimeLabel(unixSec: number, rangeSec: number): string {
  const d = new Date(unixSec * 1000);
  if (rangeSec > 3 * 24 * 3600) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ---- main component ----

/**
 * Multi-line step-function probability chart for question markets (3+ outcomes).
 *
 * Renders a canvas for performance with a div overlay for crisp legend + tooltip text.
 */
export function ProbabilityChart({
  series,
  height = 220,
  theme = "dark",
  className = "",
}: ProbabilityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  // ---- hover state ----
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverData, setHoverData] = useState<
    Array<{ label: string; value: number; color: string }> | null
  >(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);

  // ---- draw ----

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    if (width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (series.length === 0) return;

    // Gather all data points to compute time range
    const allTimes = series.flatMap((s) => s.data.map((d) => d.time));
    if (allTimes.length === 0) return;

    const paddingTop = 8;
    const paddingBottom = 22;
    const paddingLeft = 4;
    const paddingRight = 52;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const minT = Math.min(...allTimes);
    const maxT = Math.max(...allTimes);
    const tRange = maxT - minT || 1;

    // Y range: auto-scale with some padding
    const allValues = series.flatMap((s) => s.data.map((d) => d.value));
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const valuePad = (rawMax - rawMin) * 0.1 || 0.05;
    const yMin = Math.max(0, rawMin - valuePad);
    const yMax = Math.min(1, rawMax + valuePad);
    const yRange = yMax - yMin || 0.1;

    function toX(t: number) {
      return paddingLeft + ((t - minT) / tRange) * chartW;
    }
    function toY(v: number) {
      return paddingTop + chartH - ((v - yMin) / yRange) * chartH;
    }

    // ---- grid lines ----
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);

    const gridSteps = 4;
    const yStep = (yMax - yMin) / gridSteps;
    for (let i = 0; i <= gridSteps; i++) {
      const v = yMin + i * yStep;
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartW, y);
      ctx.stroke();

      // Y-axis label
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(
        `${Math.round(v * 100)}%`,
        paddingLeft + chartW + 4,
        y + 3,
      );
    }

    // ---- step-function lines per series ----
    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      if (s.data.length < 2) continue;

      const color = resolveColor(s, si);
      const [r, g, b] = hexToRgb(color);

      // Sort data by time
      const pts = [...s.data].sort((a, b) => a.time - b.time);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "miter";
      ctx.lineCap = "square";
      ctx.setLineDash([]);

      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = toX(pts[i].time);
        const y = toY(pts[i].value);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Step function: horizontal then vertical
          const prevY = toY(pts[i - 1].value);
          ctx.lineTo(x, prevY); // horizontal segment
          ctx.lineTo(x, y);     // vertical jump
        }
      }
      ctx.stroke();

      // Subtle fill under the step line
      const lastPt = pts[pts.length - 1];
      const firstPt = pts[0];
      ctx.lineTo(toX(lastPt.time), paddingTop + chartH);
      ctx.lineTo(toX(firstPt.time), paddingTop + chartH);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
      ctx.fill();

      // Pulsing dot at current value (right edge)
      const liveValue = s.currentValue ?? lastPt.value;
      const dotX = toX(lastPt.time);
      const dotY = toY(liveValue);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Glow ring
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ---- hover crosshair ----
    if (hoverX !== null) {
      const hx = Math.max(paddingLeft, Math.min(paddingLeft + chartW, hoverX));
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, paddingTop);
      ctx.lineTo(hx, paddingTop + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- time axis labels ----
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";

    const timePoints = [0, Math.floor(allTimes.length / 2), allTimes.length - 1];
    const sortedTimes = [...allTimes].sort((a, b) => a - b);
    for (const idx of timePoints) {
      const t = sortedTimes[Math.min(idx, sortedTimes.length - 1)];
      if (t === undefined) continue;
      ctx.fillText(
        formatTimeLabel(t, tRange),
        toX(t),
        paddingTop + chartH + 14,
      );
    }
  }, [series, height, isDark, hoverX]);

  // ---- mouse/touch interaction ----

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container || series.length === 0) return;

      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;

      // Compute paddings to match draw logic
      const paddingLeft = 4;
      const paddingRight = 52;
      const chartW = container.clientWidth - paddingLeft - paddingRight;

      const allTimes = series.flatMap((s) => s.data.map((d) => d.time));
      if (allTimes.length === 0) return;

      const minT = Math.min(...allTimes);
      const maxT = Math.max(...allTimes);
      const tRange = maxT - minT || 1;

      // Find timestamp at cursor
      const relX = mx - paddingLeft;
      const tAtCursor = minT + (relX / chartW) * tRange;

      // For each series, find the value at cursor using step-function logic:
      // value = the last data point whose time <= tAtCursor
      const hoverValues = series.map((s, i) => {
        const pts = [...s.data].sort((a, b) => a.time - b.time);
        let val = pts[0]?.value ?? 0;
        for (const p of pts) {
          if (p.time <= tAtCursor) val = p.value;
          else break;
        }
        return {
          label: s.label,
          value: val,
          color: resolveColor(s, i),
        };
      });

      // Nearest timestamp
      let nearestT = allTimes[0];
      let nearestDist = Infinity;
      for (const t of allTimes) {
        const d = Math.abs(t - tAtCursor);
        if (d < nearestDist) {
          nearestDist = d;
          nearestT = t;
        }
      }

      // Clamp tooltip position so it doesn't go off the right edge
      const tooltipEstWidth = 140;
      const clamped = Math.min(mx + 12, container.clientWidth - tooltipEstWidth - 4);

      setHoverX(mx);
      setHoverData(hoverValues);
      setHoverTime(nearestT);
      setTooltipLeft(clamped);
    },
    [series],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverX(null);
    setHoverData(null);
    setHoverTime(null);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      // Synthesize a mouse-like event object
      const synth = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as React.MouseEvent<HTMLDivElement>;
      handleMouseMove(synth);
    },
    [handleMouseMove],
  );

  return (
    <div className={`relative ${className}`}>
      {/* Legend bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 px-1">
        {series.map((s, i) => {
          const color = resolveColor(s, i);
          const pct = s.currentValue !== undefined
            ? formatPercent(s.currentValue)
            : s.data.length > 0
              ? formatPercent(s.data[s.data.length - 1].value)
              : null;
          return (
            <div key={s.id} className="flex items-center gap-1.5 min-w-0">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span className="text-[11px] text-muted-foreground truncate">
                {s.label}
              </span>
              {pct && (
                <span
                  className="text-[11px] font-mono font-semibold tabular-nums"
                  style={{ color }}
                >
                  {pct}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Canvas + interaction layer */}
      <div
        ref={containerRef}
        style={{ height, position: "relative", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseLeave}
      >
        <canvas ref={canvasRef} style={{ display: "block" }} />

        {/* Hover tooltip */}
        {hoverData && hoverData.length > 0 && (
          <div
            className="absolute pointer-events-none rounded-md px-2.5 py-2 text-xs font-mono tabular-nums z-10"
            style={{
              left: tooltipLeft,
              top: 4,
              background: isDark ? "rgba(15,15,20,0.92)" : "rgba(255,255,255,0.92)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              minWidth: 110,
            }}
          >
            {hoverTime && (
              <div
                className="mb-1 text-[10px]"
                style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}
              >
                {formatTimeLabel(hoverTime, 0)}
              </div>
            )}
            {hoverData.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5 leading-5">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: d.color,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)",
                    maxWidth: 70,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.label}
                </span>
                <span
                  className="ml-auto font-semibold"
                  style={{ color: d.color }}
                >
                  {formatPercent(d.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
