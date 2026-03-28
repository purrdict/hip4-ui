/**
 * CountdownTimer — live countdown to a prediction market expiry.
 *
 * Updates every second. Shows "Settled" when the expiry has passed.
 *
 * Usage:
 *   <CountdownTimer expiry={market.expiry} />
 *   <CountdownTimer expiry={market.expiry} className="text-sm text-muted-foreground" />
 */

"use client";

import { useState, useEffect } from "react";
import { formatCountdown } from "../lib/format.js";

export interface CountdownTimerProps {
  /** UTC expiry date */
  expiry: Date;
  /** Additional CSS classes */
  className?: string;
  /** Called when the timer reaches zero (once) */
  onExpire?: () => void;
}

/**
 * Live countdown timer that ticks every second.
 *
 * Renders the remaining time as a string (e.g. "2h 15m 30s").
 * Shows "Settled" after expiry.
 */
export function CountdownTimer({
  expiry,
  className = "",
  onExpire,
}: CountdownTimerProps) {
  const [display, setDisplay] = useState(() => formatCountdown(expiry));
  const [expired, setExpired] = useState(() => expiry.getTime() <= Date.now());

  useEffect(() => {
    // Recalculate when expiry changes.
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
