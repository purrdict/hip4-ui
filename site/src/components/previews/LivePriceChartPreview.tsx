"use client";

import { useState, useEffect, useRef } from "react";

const CHART_W = 440;
const CHART_H = 200;
const MAX_POINTS = 120;
const PADDING = { top: 28, right: 64, bottom: 28, left: 8 };

// Smooth random walk with momentum — mimics real Polymarket-style price movement
function generateInitialData(): number[] {
  const pts: number[] = [];
  let price = 87450;
  let momentum = 0;
  for (let i = 0; i < MAX_POINTS; i++) {
    // Momentum-based walk: 80% previous direction + 20% random
    momentum = momentum * 0.8 + (Math.random() - 0.5) * 8;
    // Mean-revert gently toward 87450
    momentum += (87450 - price) * 0.002;
    price += momentum;
    pts.push(price);
  }
  return pts;
}

export default function LivePriceChartPreview() {
  const [prices, setPrices] = useState(generateInitialData);
  const momentumRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = setInterval(() => {
      setPrices((prev) => {
        const last = prev[prev.length - 1];
        // Smooth momentum: continues previous trend with gentle randomness
        momentumRef.current = momentumRef.current * 0.85 + (Math.random() - 0.5) * 6;
        // Mean-revert toward target
        momentumRef.current += (87450 - last) * 0.001;
        const next = [...prev, last + momentumRef.current];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CHART_W * dpr;
    canvas.height = CHART_H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const chartW = CHART_W - PADDING.left - PADDING.right;
    const chartH = CHART_H - PADDING.top - PADDING.bottom;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pad = range * 0.08;
    const yMin = min - pad;
    const yMax = max + pad;
    const yRange = yMax - yMin;

    const toX = (i: number) => PADDING.left + (i / (prices.length - 1)) * chartW;
    const toY = (v: number) => PADDING.top + chartH - ((v - yMin) / yRange) * chartH;

    ctx.clearRect(0, 0, CHART_W, CHART_H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
      const y = PADDING.top + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + chartW, y);
      ctx.stroke();
    }

    // Target price reference line (dashed)
    const targetPrice = 87450;
    if (targetPrice >= yMin && targetPrice <= yMax) {
      const ty = toY(targetPrice);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, ty);
      ctx.lineTo(PADDING.left + chartW, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText("Target", PADDING.left + chartW + 4, ty + 3);
    }

    // Price line — BTC orange
    const lineColor = "#f7931a";
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    prices.forEach((p, i) => {
      const x = toX(i);
      const y = toY(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under curve
    const lastIdx = prices.length - 1;
    ctx.lineTo(toX(lastIdx), PADDING.top + chartH);
    ctx.lineTo(toX(0), PADDING.top + chartH);
    ctx.closePath();
    ctx.fillStyle = "rgba(247, 147, 26, 0.08)";
    ctx.fill();

    // Pulsing dot
    const lastX = toX(lastIdx);
    const lastY = toY(prices[lastIdx]);
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Current price label (right side)
    ctx.fillStyle = lineColor;
    ctx.font = "bold 11px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`$${prices[lastIdx].toLocaleString("en-US", { maximumFractionDigits: 0 })}`, lastX + 12, lastY + 4);

    // Y-axis price labels (right side)
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "left";
    for (let i = 0; i <= 3; i++) {
      const y = PADDING.top + (chartH / 3) * i;
      const val = yMax - (i / 3) * yRange;
      ctx.fillText(`$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, PADDING.left + chartW + 4, y + 3);
    }

    // X-axis time labels (bottom)
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.textAlign = "center";
    const now = new Date();
    const timeLabels = [0, Math.floor(prices.length / 3), Math.floor(prices.length * 2 / 3), prices.length - 1];
    for (const idx of timeLabels) {
      const t = new Date(now.getTime() - (prices.length - 1 - idx) * 1000);
      const label = t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      ctx.fillText(label, toX(idx), CHART_H - 4);
    }
  }, [prices]);

  return (
    <div className="rounded-2xl border bg-card text-card-foreground overflow-hidden w-[440px] relative">
      {/* Asset badge — same as production app */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-card/80 backdrop-blur-sm">
        <img src="https://app.hyperliquid.xyz/coins/BTC.svg" alt="BTC" className="h-4 w-4 rounded-full" />
        <span className="text-[11px] font-medium text-muted-foreground">BTC</span>
      </div>

      <div ref={containerRef}>
        <canvas
          ref={canvasRef}
          style={{ width: CHART_W, height: CHART_H }}
          className="w-full"
        />
      </div>
    </div>
  );
}
