"use client";

import { useState, useEffect, useRef } from "react";

const OUTCOME_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];
const MAX_POINTS = 120;

interface Series {
  label: string;
  color: string;
  data: { time: number; value: number }[];
  currentValue: number;
}

function generateHistory(baseValue: number): { time: number; value: number }[] {
  const pts: { time: number; value: number }[] = [];
  let val = baseValue;
  const now = Math.floor(Date.now() / 1000);
  for (let i = MAX_POINTS; i >= 0; i--) {
    // Step function: value changes occasionally, not every tick
    if (Math.random() < 0.15) {
      val = Math.max(0.02, Math.min(0.6, val + (Math.random() - 0.5) * 0.04));
    }
    pts.push({ time: now - i, value: val });
  }
  return pts;
}

function initSeries(): Series[] {
  const outcomes = [
    { label: "Akami", base: 0.42 },
    { label: "Canned Tuna", base: 0.28 },
    { label: "Otoro", base: 0.18 },
    { label: "Other", base: 0.12 },
  ];
  return outcomes.map((o, i) => ({
    label: o.label,
    color: OUTCOME_COLORS[i],
    data: generateHistory(o.base),
    currentValue: o.base,
  }));
}

export default function ProbabilityChartPreview() {
  const [series, setSeries] = useState(initSeries);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Live updates — step function style
  useEffect(() => {
    const tick = setInterval(() => {
      setSeries((prev) =>
        prev.map((s) => {
          const shouldChange = Math.random() < 0.2;
          const newVal = shouldChange
            ? Math.max(0.02, Math.min(0.6, s.currentValue + (Math.random() - 0.5) * 0.03))
            : s.currentValue;
          const now = Math.floor(Date.now() / 1000);
          const newData = [...s.data, { time: now, value: newVal }].slice(-MAX_POINTS);
          return { ...s, data: newData, currentValue: newVal };
        }),
      );
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 480;
    const H = 200;
    const PAD = { top: 8, right: 50, bottom: 24, left: 4 };
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    // Y range: auto-scale
    let yMin = 1, yMax = 0;
    for (const s of series) {
      for (const p of s.data) {
        if (p.value < yMin) yMin = p.value;
        if (p.value > yMax) yMax = p.value;
      }
    }
    const yPad = (yMax - yMin) * 0.15 || 0.05;
    yMin = Math.max(0, yMin - yPad);
    yMax = Math.min(1, yMax + yPad);
    const yRange = yMax - yMin || 0.1;

    const toX = (i: number, len: number) => PAD.left + (i / (len - 1)) * chartW;
    const toY = (v: number) => PAD.top + chartH - ((v - yMin) / yRange) * chartH;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + chartW, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "left";
    for (let i = 0; i <= 4; i++) {
      const val = yMax - (i / 4) * yRange;
      const y = PAD.top + (chartH / 4) * i;
      ctx.fillText(`${(val * 100).toFixed(0)}%`, PAD.left + chartW + 4, y + 3);
    }

    // Draw each series as step function
    for (const s of series) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < s.data.length; i++) {
        const x = toX(i, s.data.length);
        const y = toY(s.data[i].value);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Step: horizontal then vertical
          ctx.lineTo(x, toY(s.data[i - 1].value));
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Subtle fill
      const lastX = toX(s.data.length - 1, s.data.length);
      ctx.lineTo(lastX, PAD.top + chartH);
      ctx.lineTo(toX(0, s.data.length), PAD.top + chartH);
      ctx.closePath();
      ctx.fillStyle = s.color.replace(")", ", 0.04)").replace("rgb", "rgba");
      // Parse hex to rgba
      const r = parseInt(s.color.slice(1, 3), 16);
      const g = parseInt(s.color.slice(3, 5), 16);
      const b = parseInt(s.color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.04)`;
      ctx.fill();

      // Pulsing dot at current value
      const dotX = lastX;
      const dotY = toY(s.currentValue);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Hover crosshair
    if (hoverX !== null) {
      const rect = canvas.getBoundingClientRect();
      const relX = (hoverX - rect.left) * (W / rect.width);
      if (relX >= PAD.left && relX <= PAD.left + chartW) {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(relX, PAD.top);
        ctx.lineTo(relX, PAD.top + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // X-axis time labels
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    if (series[0]?.data.length > 0) {
      const timeLabels = [0, Math.floor(series[0].data.length / 3), Math.floor(series[0].data.length * 2 / 3), series[0].data.length - 1];
      for (const idx of timeLabels) {
        if (idx < series[0].data.length) {
          const t = new Date(series[0].data[idx].time * 1000);
          const label = t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
          ctx.fillText(label, toX(idx, series[0].data.length), H - 4);
        }
      }
    }
  }, [series, hoverX]);

  return (
    <div className="rounded-2xl border bg-card text-card-foreground overflow-hidden w-[500px]">
      {/* Legend */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="font-medium text-foreground">{s.label}</span>
            <span className="font-mono tabular-nums text-muted-foreground">{(s.currentValue * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div
        className="relative"
        onMouseMove={(e) => setHoverX(e.clientX)}
        onMouseLeave={() => setHoverX(null)}
      >
        <canvas
          ref={canvasRef}
          style={{ width: 480, height: 200 }}
          className="w-full"
        />
      </div>
    </div>
  );
}
