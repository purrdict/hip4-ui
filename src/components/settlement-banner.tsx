/**
 * SettlementBanner — shows a resolved market result.
 *
 * Usage:
 *   <SettlementBanner result="Yes" settlePrice="69500" outcomeId={234} />
 */

"use client";

export interface SettlementBannerProps {
  /** The winning side */
  result: "Yes" | "No";
  /** The underlying oracle price at settlement */
  settlePrice?: string | number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A banner indicating a market has been resolved.
 *
 * Shows the winning outcome and the oracle price that triggered resolution.
 */
export function SettlementBanner({
  result,
  settlePrice,
  className = "",
}: SettlementBannerProps) {
  const isYes = result === "Yes";

  return (
    <div
      role="status"
      aria-label={`Market resolved: ${result} wins`}
      className={[
        "rounded-lg border p-4 flex items-center gap-3",
        isYes
          ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Icon */}
      <span className="text-2xl" aria-hidden>
        {isYes ? "✓" : "✗"}
      </span>

      {/* Text */}
      <div className="flex-1">
        <p className="font-semibold text-sm">Market Resolved</p>
        <p className="text-sm opacity-80">
          <span className="font-bold">{result}</span> wins
          {settlePrice !== undefined && (
            <> — Oracle price: {Number(settlePrice).toLocaleString()}</>
          )}
        </p>
      </div>

      {/* Outcome badge */}
      <span
        className={[
          "shrink-0 px-3 py-1 rounded-full font-bold text-sm",
          isYes
            ? "bg-green-500/20 text-green-700 dark:text-green-400"
            : "bg-red-500/20 text-red-700 dark:text-red-400",
        ].join(" ")}
      >
        {result}
      </span>
    </div>
  );
}
