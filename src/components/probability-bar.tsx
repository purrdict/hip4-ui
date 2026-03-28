/**
 * ProbabilityBar — two-tone horizontal probability visualization.
 *
 * Displays Yes/No prices as a split bar using shadcn CSS variables so it
 * inherits the host app's theme automatically.
 *
 * Usage:
 *   <ProbabilityBar yesPx={0.65} noPx={0.35} />
 *   <ProbabilityBar yesPx={0.72} noPx={0.28} yesLabel="Up" noLabel="Down" />
 *   <ProbabilityBar yesPx={0.5} noPx={0.5} className="my-4" />
 */

"use client";

export interface ProbabilityBarProps {
  /** Yes price (0–1) */
  yesPx: number;
  /** No price (0–1) */
  noPx: number;
  /** Label for the yes side — defaults to "Yes" */
  yesLabel?: string;
  /** Label for the no side — defaults to "No" */
  noLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A compact two-tone horizontal bar showing the probability split between
 * two outcomes. Uses `text-success` / `text-destructive` and
 * `bg-success` / `bg-destructive` CSS variables so it integrates with any
 * shadcn/ui theme.
 *
 * Example:
 * ```tsx
 * <ProbabilityBar yesPx={0.65} noPx={0.35} yesLabel="Yes" noLabel="No" />
 * ```
 */
export function ProbabilityBar({
  yesPx,
  noPx,
  yesLabel = "Yes",
  noLabel = "No",
  className,
}: ProbabilityBarProps) {
  // Clamp to [0, 1] and normalize so the bar always fills 100%.
  const clampedYes = Math.max(0, Math.min(1, yesPx));
  const clampedNo = Math.max(0, Math.min(1, noPx));
  const total = clampedYes + clampedNo;
  const normalizedYes = total > 0 ? (clampedYes / total) * 100 : 50;
  const normalizedNo = total > 0 ? (clampedNo / total) * 100 : 50;

  const yesPct = (yesPx * 100).toFixed(1);
  const noPct = (noPx * 100).toFixed(1);

  return (
    <div className={["space-y-2.5", className].filter(Boolean).join(" ")}>
      {/* Price labels */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-success uppercase tracking-wide">
            {yesLabel}
          </span>
          <span className="text-2xl font-bold tabular-nums text-success">
            {yesPct}¢
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-destructive">
            {noPct}¢
          </span>
          <span className="text-xs font-medium text-destructive uppercase tracking-wide">
            {noLabel}
          </span>
        </div>
      </div>

      {/* Visual bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary/60">
        <div
          className="bg-success/70 transition-all duration-700 ease-out"
          style={{ width: `${normalizedYes}%` }}
          role="presentation"
        />
        <div
          className="bg-destructive/70 transition-all duration-700 ease-out"
          style={{ width: `${normalizedNo}%` }}
          role="presentation"
        />
      </div>
    </div>
  );
}
