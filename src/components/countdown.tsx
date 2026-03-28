/**
 * Countdown — live countdown timer for prediction market expiries.
 *
 * Two exports:
 *   - `Countdown` — segmented Polymarket-style display (DAYS/HRS/MINS/SECS boxes)
 *     with urgency color coding: red (<1h), amber (<6h), normal (>6h)
 *   - `CountdownTimer` — simple inline text countdown (legacy, kept for compat)
 *
 * Usage:
 *   // Segmented display (primary):
 *   <Countdown expiry={market.expiry} />
 *
 *   // Simple inline text (legacy):
 *   <CountdownTimer expiry={market.expiry} />
 *   <CountdownTimer expiry={market.expiry} className="text-sm text-muted-foreground" />
 */

"use client";

import { useState, useEffect } from "react";
import { formatCountdown } from "../lib/format.js";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function getTimeLeft(expiry: Date, now: number) {
  const diff = expiry.getTime() - now;
  if (diff <= 0) return { expired: true, d: 0, h: 0, m: 0, s: 0, diff: 0 };
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return { expired: false, d, h, m, s, diff };
}

function useCountdownTick(expiry: Date) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return getTimeLeft(expiry, now);
}

// ─── Countdown (segmented, primary export) ────────────────────────────────────

export interface CountdownProps {
  /** Expiry date */
  expiry: Date;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Segmented countdown display in Polymarket style.
 *
 * Shows DAYS/HRS/MINS/SECS boxes with urgency color coding:
 *   - Red when < 1 hour remaining
 *   - Amber when < 6 hours remaining
 *   - Normal foreground color otherwise
 *
 * Shows "Settled" in muted foreground after expiry.
 *
 * Example:
 * ```tsx
 * <Countdown expiry={new Date(Date.now() + 86400000)} />
 * ```
 */
export function Countdown({ expiry, className }: CountdownProps) {
  const time = useCountdownTick(expiry);

  if (time.expired) {
    return (
      <span className={["text-muted-foreground text-sm", className].filter(Boolean).join(" ")}>
        Settled
      </span>
    );
  }

  // Urgency color
  const isUrgent = time.diff < 1000 * 60 * 60; // < 1h
  const isWarning = time.diff < 1000 * 60 * 60 * 6; // < 6h
  const colorClass = isUrgent
    ? "text-destructive"
    : isWarning
      ? "text-amber-500"
      : "text-foreground";

  // Segments: show DAYS when there are days, else show SECS
  const segments: { value: string; label: string }[] = time.d > 0
    ? [
        { value: String(time.d), label: "DAYS" },
        { value: pad(time.h), label: "HRS" },
        { value: pad(time.m), label: "MINS" },
      ]
    : [
        { value: pad(time.h), label: "HRS" },
        { value: pad(time.m), label: "MINS" },
        { value: pad(time.s), label: "SECS" },
      ];

  return (
    <div
      className={["flex items-center gap-1", className].filter(Boolean).join(" ")}
      role="timer"
      aria-label={`${time.d > 0 ? `${time.d} days ` : ""}${pad(time.h)} hours ${pad(time.m)} minutes remaining`}
    >
      {segments.map((seg) => (
        <div key={seg.label} className="text-center min-w-[2.2rem]">
          <div
            className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums leading-none ${colorClass}`}
          >
            {seg.value}
          </div>
          <div className="text-[9px] text-muted-foreground tracking-widest mt-0.5 font-medium">
            {seg.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CountdownTimer (simple text, legacy compat) ──────────────────────────────

export interface CountdownTimerProps {
  /** UTC expiry date */
  expiry: Date;
  /** Additional CSS classes */
  className?: string;
  /** Called when the timer reaches zero (once) */
  onExpire?: () => void;
}

/**
 * Simple inline countdown timer that ticks every second.
 *
 * Renders the remaining time as a string (e.g. "2h 15m 30s").
 * Shows "Settled" after expiry.
 *
 * Example:
 * ```tsx
 * <CountdownTimer expiry={market.expiry} className="text-sm text-muted-foreground" />
 * ```
 */
export function CountdownTimer({
  expiry,
  className = "",
  onExpire,
}: CountdownTimerProps) {
  const [display, setDisplay] = useState(() => formatCountdown(expiry));
  const [expired, setExpired] = useState(() => expiry.getTime() <= Date.now());

  useEffect(() => {
    setDisplay(formatCountdown(expiry));
    setExpired(expiry.getTime() <= Date.now());
  }, [expiry]);

  useEffect(() => {
    if (expired) return;

    const interval = setInterval(() => {
      const formatted = formatCountdown(expiry);
      setDisplay(formatted);

      if (formatted === "Settled") {
        setExpired(true);
        onExpire?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiry, expired, onExpire]);

  return (
    <span
      className={`font-mono tabular-nums ${expired ? "text-muted-foreground" : ""} ${className}`}
      aria-label={`Time until expiry: ${display}`}
    >
      {display}
    </span>
  );
}
