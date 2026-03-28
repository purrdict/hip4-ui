/**
 * LivePriceChart — real-time ticking price chart for prediction markets.
 *
 * Canvas-based chart that displays asset price history with 1-second updates,
 * target price reference line, and color-coded trend direction.
 *
 * Usage:
 *   <LivePriceChart
 *     symbol="BTC"
 *     prices={priceHistory}
 *     currentPrice={87452}
 *     targetPrice={87450}
 *     height={200}
 *   />
 */

"use client";

import { useEffect, useRef, useMemo } from "react";

/** Brand colors per underlying asset */
const ASSET_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  HYPE: "#50e3c2",
  XRP: "#23292f",
  DOGE: "#c2a633",
  AVAX: "#e84142",
  LINK: "#2a5ada",
};

export interface PricePoint {
  time: number;
  value: number;
}

export interface LivePriceChartProps {
  /** Underlying asset symbol (BTC, ETH, SOL, HYPE) */
  symbol: string;
  /** Array of {time, value} price points */
  prices: PricePoint[];
  /** Current live price (used for the latest dot) */
  currentPrice?: number;
  /** Reference target price line */
  targetPrice?: number;
  /** Chart height in px. Default: 200 */
  height?: number;
  /** Custom line color. Defaults to asset brand color (BTC orange, ETH blue, etc.) */
  color?: string;
  /** Theme: "light" | "dark". Default: "dark" */
  theme?: "light" | "dark";
  /** Custom logo URL. Defaults to https://app.hyperliquid.xyz/coins/${symbol}.svg */
  logoUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

function formatChartPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

/**
 * Real-time canvas-based price chart.
 *
 * Renders a line chart with fill, grid, target line, and pulsing current price dot.
 * Pass new price points to `prices` array — the chart redraws on every update.
 */
export function LivePriceChart({
  symbol,
  prices,
  currentPrice,
  targetPrice,
  height = 200,
  color: colorProp,
  theme = "dark",
  logoUrl,
  className = "",
}: LivePriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const color = colorProp ?? ASSET_COLORS[symbol] ?? "#8b8b8b";
  const isDark = theme === "dark";

  const latestPrice = currentPrice ?? (prices.length > 0 ? prices[prices.length - 1].value : 0);
  const firstPrice = prices.length > 0 ? prices[0].value : latestPrice;
  const isUp = latestPrice >= firstPrice;
  const changePct = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

  const lineColor = useMemo(() => {
    // Use asset brand color, or green/red for direction
    return color;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || prices.length < 2) return;

    const width = container.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const paddingTop = 8;
    const paddingBottom = 20;
    const paddingRight = 60;
    const paddingLeft = 4;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const min = Math.min(...prices.map((p) => p.value));
    const max = Math.max(...prices.map((p) => p.value));
    const range = max - min || 1;
    const pad = range * 0.08;
    const yMin = min - pad;
    const yMax = max + pad;
    const yRange = yMax - yMin;

    const toX = (i: number) => paddingLeft + (i / (prices.length - 1)) * chartW;
    const toY = (v: number) => paddingTop + chartH - ((v - yMin) / yRange) * chartH;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const y = paddingTop + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartW, y);
      ctx.stroke();
    }

    // Target price reference line
    if (targetPrice && targetPrice >= yMin && targetPrice <= yMax) {
      const ty = toY(targetPrice);
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, ty);
      ctx.lineTo(paddingLeft + chartW, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target label
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Target`, paddingLeft + chartW + 4, ty + 3);
    }

    // Price line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    prices.forEach((p, i) => {
      const x = toX(i);
      const y = toY(p.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under curve
    const lastIdx = prices.length - 1;
    ctx.lineTo(toX(lastIdx), paddingTop + chartH);
    ctx.lineTo(toX(0), paddingTop + chartH);
    ctx.closePath();
    ctx.fillStyle = lineColor.replace(")", ", 0.08)").replace("rgb", "rgba").replace("#", "");
    // Hex to rgba fill
    const r = parseInt(lineColor.slice(1, 3), 16);
    const g = parseInt(lineColor.slice(3, 5), 16);
    const b = parseInt(lineColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
    ctx.fill();

    // Current price dot
    const lastX = toX(lastIdx);
    const lastY = toY(prices[lastIdx].value);
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Glow ring
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Current price label on right
    ctx.fillStyle = lineColor;
    ctx.font = "bold 11px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(formatChartPrice(prices[lastIdx].value), lastX + 12, lastY + 4);

    // Time axis labels
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    const timePoints = [0, Math.floor(prices.length / 2), prices.length - 1];
    for (const idx of timePoints) {
      const t = new Date(prices[idx].time * 1000);
      const label = t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      ctx.fillText(label, toX(idx), height - 4);
    }
  }, [prices, height, lineColor, isDark, targetPrice]);

  return (
    <div className={`relative ${className}`}>
      {/* Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-card/80 backdrop-blur-sm">
        <img
          src={logoUrl ?? `https://app.hyperliquid.xyz/coins/${symbol}.svg`}
          alt={symbol}
          className="h-4 w-4 rounded-full"
        />
        <span className="text-[11px] font-medium text-muted-foreground">{symbol}</span>
      </div>

      {/* Price + change */}
      <div className="absolute top-2 right-2 z-10 text-right">
        <span className="text-sm font-bold font-mono tabular-nums">{formatChartPrice(latestPrice)}</span>
        <span className={`ml-1.5 text-xs font-mono tabular-nums ${isUp ? "text-success" : "text-destructive"}`}>
          {isUp ? "+" : ""}{changePct.toFixed(2)}%
        </span>
      </div>

      <div ref={containerRef} style={{ height }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
