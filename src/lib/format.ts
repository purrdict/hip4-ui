/**
 * @purrdict/hip4-ui — formatting utilities.
 *
 * Price/time/number formatters shared across components.
 */

/**
 * Format a mid price for display.
 *
 * For prediction markets (values 0–1), shows cents-style formatting:
 *   0.55 → "55¢" or "0.55" depending on style
 *
 * @param px    Price as a number or string
 * @param style "cents" | "decimal" | "percent" — default "decimal"
 */
export function formatMidPrice(
  px: number | string,
  style: "cents" | "decimal" | "percent" = "decimal",
): string {
  const p = typeof px === "string" ? parseFloat(px) : px;
  if (isNaN(p)) return "—";

  if (style === "cents") {
    return `${(p * 100).toFixed(0)}¢`;
  }
  if (style === "percent") {
    return `${(p * 100).toFixed(1)}%`;
  }
  // Decimal — strip trailing zeros after 4 decimal places.
  return p.toFixed(4).replace(/\.?0+$/, "");
}

/**
 * Format a USDH amount for display.
 *
 * @param amount  Amount as a number
 * @param compact Show compact form for large numbers (e.g. "$1.2K")
 */
export function formatUsdh(amount: number, compact = false): string {
  if (isNaN(amount)) return "$0";
  if (compact && amount >= 1_000) {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a countdown from now to a future date.
 *
 * Returns:
 *   "2h 15m 30s" for > 2 hours
 *   "14m 30s"    for < 2 hours
 *   "45s"        for < 1 minute
 *   "Settled"    for past dates
 */
export function formatCountdown(expiry: Date): string {
  const msLeft = expiry.getTime() - Date.now();
  if (msLeft <= 0) return "Settled";

  const secs = Math.floor(msLeft / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const h = hours % 24;
    return `${days}d ${h}h`;
  }
  if (hours > 0) {
    const m = mins % 60;
    const s = secs % 60;
    return `${hours}h ${m}m ${s}s`;
  }
  if (mins > 0) {
    const s = secs % 60;
    return `${mins}m ${s}s`;
  }
  return `${secs}s`;
}

/**
 * Format a period string to human-readable label.
 *
 * "1m" → "1 Min"
 * "15m" → "15 Min"
 * "1h" → "1 Hour"
 * "1d" → "1 Day"
 */
export function formatPeriod(period: string): string {
  const match = period.match(/^(\d+)(m|h|d)$/);
  if (!match) return period;
  const n = parseInt(match[1]);
  const unit = match[2];
  const plural = n > 1;
  if (unit === "m") return `${n} Min`;
  if (unit === "h") return `${n} Hour${plural ? "s" : ""}`;
  if (unit === "d") return `${n} Day${plural ? "s" : ""}`;
  return period;
}

/**
 * Format a target price for display.
 *
 * 66200 → "66,200"
 * 66200.5 → "66,200.5"
 */
export function formatTargetPrice(price: number): string {
  return price.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/**
 * Parse a mid price string to a number, returning 0 for invalid inputs.
 */
export function parseMid(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Compute implied "No" price from a "Yes" price (since Yes + No = 1).
 */
export function noPrice(yesPx: number): number {
  return Math.max(0, Math.min(1, 1 - yesPx));
}
