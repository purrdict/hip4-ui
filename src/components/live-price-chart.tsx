/**
 * LivePriceChart — real-time markPx chart via Liveline.
 */

"use client";

import { Liveline, type LivelinePoint } from "liveline";
import { useMemo } from "react";

const ASSET_COLORS: Record<string, string> = {
  AVAX: "#e84142",
  BTC: "#f7931a",
  DOGE: "#c2a633",
  ETH: "#627eea",
  HYPE: "#50e3c2",
  LINK: "#2a5ada",
  SOL: "#9945ff",
  XRP: "#23292f",
};

export interface PricePoint {
  time: number;
  value: number;
}

export interface LivePriceChartProps {
  symbol: string;
  prices: PricePoint[];
  currentPrice?: number;
  targetPrice?: number;
  height?: number;
  color?: string;
  theme?: "light" | "dark";
  logoUrl?: string;
  className?: string;
}

function formatChartPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function toLivelinePoints(prices: PricePoint[]): LivelinePoint[] {
  return [...prices]
    .sort((a, b) => a.time - b.time)
    .map(({ time, value }) => ({ time, value }));
}

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
  const points = useMemo(() => toLivelinePoints(prices), [prices]);
  const value =
    currentPrice ?? points[points.length - 1]?.value ?? 0;
  const color = colorProp ?? ASSET_COLORS[symbol] ?? "#8b8b8b";
  const icon = logoUrl ?? `https://app.hyperliquid.xyz/coins/${symbol}.svg`;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 backdrop-blur-sm">
        <img alt={symbol} className="h-4 w-4 rounded-full" src={icon} />
        <span className="text-[11px] font-medium text-white/70">{symbol}</span>
      </div>
      <Liveline
        badge
        color={color}
        data={points}
        exaggerate
        fill
        formatValue={formatChartPrice}
        grid
        loading={points.length === 0}
        momentum
        pulse
        referenceLine={
          targetPrice != null
            ? { label: formatChartPrice(targetPrice), value: targetPrice }
            : undefined
        }
        scrub
        theme={theme}
        value={value}
        window={900}
        windows={[
          { label: "5m", secs: 300 },
          { label: "15m", secs: 900 },
          { label: "1h", secs: 3_600 },
        ]}
        windowStyle="rounded"
      />
    </div>
  );
}
