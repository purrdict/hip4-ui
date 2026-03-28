/**
 * MarketCard — display card for a HIP-4 prediction market.
 *
 * Supports four variants via the `variant` prop:
 *   - "event" (default) — standard binary Yes/No market card
 *   - "recurring" — price-binary market with Up/Down buttons and asset logo area
 *   - "named-binary" — binary market where sides have custom names and optional avatars
 *   - "question" — multi-outcome group showing top outcomes with "+N more"
 *
 * All variants use shadcn CSS variables for theming.
 *
 * Usage:
 *   // Default event card:
 *   <MarketCard market={market} yesMid={0.65} volume={4200} onClick={...} />
 *
 *   // Recurring market:
 *   <MarketCard variant="recurring" market={market} yesMid={0.65} underlying="BTC" />
 *
 *   // Named binary:
 *   <MarketCard
 *     variant="named-binary"
 *     market={market}
 *     sides={[
 *       { name: "Team A", pct: 60, avatarUrl: "/a.png" },
 *       { name: "Team B", pct: 40 },
 *     ]}
 *   />
 *
 *   // Multi-outcome question:
 *   <MarketCard
 *     variant="question"
 *     questionName="What will happen?"
 *     outcomes={[
 *       { name: "Outcome A", pct: 45, href: "/market/a" },
 *       { name: "Outcome B", pct: 30, href: "/market/b" },
 *       { name: "Outcome C", pct: 25, href: "/market/c" },
 *     ]}
 *   />
 */

"use client";

import type { Market } from "@purrdict/hip4";
import { Countdown } from "./countdown.js";
import { formatMidPrice, formatTargetPrice, formatPeriod, parseMid } from "../lib/format.js";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type MarketVariant = "event" | "recurring" | "named-binary" | "question";

/** A named side for named-binary or outcome variants */
export interface NamedSide {
  name: string;
  /** Probability percentage (0–100) */
  pct?: number;
  /** Optional avatar URL */
  avatarUrl?: string;
}

/** An outcome row for multi-outcome question cards */
export interface Outcome {
  name: string;
  description?: string;
  /** Probability percentage (0–100) */
  pct?: number;
  /** Link href for the outcome */
  href?: string;
}

export interface MarketCardProps {
  /** Variant — auto-detected from market data if omitted */
  variant?: MarketVariant;
  /** The market data — component auto-extracts underlying, sides, prices from this */
  market?: Market;
  /** Live mid prices map — component reads mids[market.yesCoin] automatically */
  mids?: Record<string, string>;
  /** Override: Yes mid price (0–1). Auto-resolved from mids if not set. */
  yesMid?: number | string;
  /** Override: No mid price (0–1). Defaults to 1 − yesMid. */
  noMid?: number | string;
  /** Optional 24h volume in USDH */
  volume?: number;
  /** Called when the card body is clicked (navigate to market) */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;

  // ── Overrides (auto-extracted from market if not set) ──────────────────────
  /** Override: Underlying asset symbol. Auto-extracted from market.description for recurring. */
  underlying?: string;
  /** Override: Card title for named-binary. */
  title?: string;
  /** Override: Named sides for named-binary variant. */
  sides?: NamedSide[];
  /** Override: Question title for question variant. */
  questionName?: string;
  /** Override: Outcomes for question variant. */
  outcomes?: Outcome[];

  // ── Click handlers for side/outcome buttons ─────────────────────────────────
  /**
   * Called when a side button is clicked on event / recurring / named-binary variants.
   * sideIndex: 0 = Yes/Up/SideA, 1 = No/Down/SideB.
   * Use e.stopPropagation() internally so card onClick does not also fire.
   */
  onSideClick?: (sideIndex: number) => void;
  /**
   * Called when a Yes/No button is clicked on an outcome row in the question variant.
   * outcomeIndex: index into the outcomes array.
   * sideIndex: 0 = Yes, 1 = No.
   */
  onOutcomeClick?: (outcomeIndex: number, sideIndex: number) => void;
}

// ─── Variant auto-detection ──────────────────────────────────────────────────

/**
 * Auto-detect the card variant from market data.
 * If `variant` is explicitly set, it takes priority.
 * Otherwise, infer from the market's description and sides:
 *   - description starts with "class:priceBinary" → "recurring"
 *   - sides have custom names (not Yes/No) → "named-binary"
 *   - outcomes array provided → "question"
 *   - default → "event"
 */
function detectVariant(props: MarketCardProps): MarketVariant {
  if (props.variant) return props.variant;

  // Question variant — outcomes array provided
  if (props.outcomes && props.outcomes.length > 0) return "question";

  // Named binary — sides array with custom names
  if (props.sides && props.sides.length >= 2) return "named-binary";

  // Recurring — market has an underlying asset (priceBinary markets always have this)
  if (props.market?.underlying) return "recurring";

  // Recurring — underlying prop set explicitly
  if (props.underlying) return "recurring";

  return "event";
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function yesColorClass(px: number): string {
  if (px >= 0.6) return "text-success";
  if (px <= 0.4) return "text-destructive";
  return "text-foreground";
}

function noColorClass(px: number): string {
  if (px >= 0.6) return "text-success";
  if (px <= 0.4) return "text-destructive";
  return "text-foreground";
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function CardShell({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const isClickable = !!onClick;
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onClick?.() : undefined}
      className={[
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        "flex flex-col",
        isClickable
          ? "cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

// ─── Recurring variant ────────────────────────────────────────────────────────

function RecurringCard({
  market,
  yesPx,
  underlying,
  onClick,
  onSideClick,
  className,
}: {
  market: Market;
  yesPx: number;
  underlying?: string;
  onClick?: () => void;
  onSideClick?: (sideIndex: number) => void;
  className?: string;
}) {
  const pct = Math.round(yesPx > 0.5 ? yesPx * 100 : (1 - yesPx) * 100);
  const symbol = underlying ?? market.underlying;
  const isUp = yesPx > 0.5;

  return (
    <CardShell onClick={onClick} className={className}>
      {/* Header: asset logo area + title + percentage */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        {/* Asset logo placeholder */}
        <div className="h-10 w-10 shrink-0 rounded-full bg-secondary/60 ring-1 ring-border/40 flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">{symbol?.slice(0, 3)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{symbol}</p>
          <h3 className="font-semibold text-[15px] leading-snug">
            {symbol} Up or Down — {formatPeriod(market.period)}
          </h3>
          <p className="text-xs text-muted-foreground">
            Target: {formatTargetPrice(market.targetPrice)}
          </p>
        </div>
        {yesPx > 0 && (
          <span
            className={`text-lg font-bold tabular-nums shrink-0 ${
              Math.abs(yesPx - 0.5) < 0.01
                ? "text-muted-foreground"
                : isUp
                  ? "text-success"
                  : "text-destructive"
            }`}
          >
            {pct}%
          </span>
        )}
      </div>

      {/* Up / Down buttons */}
      <div className="px-4 pb-3 mt-auto">
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSideClick?.(0); }}
            className="flex-1 text-center rounded-xl py-2.5 text-sm font-semibold bg-success/15 text-success hover:bg-success/25 transition-colors"
          >
            Up
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSideClick?.(1); }}
            className="flex-1 text-center rounded-xl py-2.5 text-sm font-semibold bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
          >
            Down
          </button>
        </div>
      </div>

      {/* Footer: countdown */}
      <div className="px-4 pb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Expires</span>
        <Countdown expiry={market.expiry} className="text-xs" />
      </div>
    </CardShell>
  );
}

// ─── Named-binary variant ─────────────────────────────────────────────────────

function NamedBinaryCard({
  title,
  sides,
  onClick,
  onSideClick,
  className,
}: {
  title: string;
  sides: NamedSide[];
  onClick?: () => void;
  onSideClick?: (sideIndex: number) => void;
  className?: string;
}) {
  const sideA = sides[0];
  const sideB = sides[1];

  return (
    <CardShell onClick={onClick} className={className}>
      {/* Title */}
      <div className="px-5 pt-5 pb-1 flex items-start gap-2">
        <h2 className="font-semibold text-base leading-snug flex-1">{title}</h2>
      </div>

      {/* Side rows with optional avatars */}
      <div className="px-5 py-3 space-y-3">
        {sides.map((side) => (
          <div key={side.name} className="flex items-center gap-3">
            {side.avatarUrl && (
              <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-secondary/60 ring-1 ring-border/40">
                <img
                  src={side.avatarUrl}
                  alt={side.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <span className="text-sm font-semibold flex-1">{side.name}</span>
            {side.pct !== undefined && (
              <span className="text-sm font-bold tabular-nums text-muted-foreground">
                {side.pct}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-5 mt-auto">
        <div className="flex gap-2">
          {sideA && (
            <button
              onClick={(e) => { e.stopPropagation(); onSideClick?.(0); }}
              className="flex-1 text-center rounded-xl py-2.5 text-sm font-semibold bg-success/15 text-success hover:bg-success/25 transition-colors"
            >
              {sideA.name} {sideA.pct !== undefined ? `${sideA.pct}%` : ""}
            </button>
          )}
          {sideB && (
            <button
              onClick={(e) => { e.stopPropagation(); onSideClick?.(1); }}
              className="flex-1 text-center rounded-xl py-2.5 text-sm font-semibold bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
            >
              {sideB.name} {sideB.pct !== undefined ? `${sideB.pct}%` : ""}
            </button>
          )}
        </div>
      </div>
    </CardShell>
  );
}

// ─── Question / multi-outcome variant ────────────────────────────────────────

function QuestionCard({
  questionName,
  outcomes,
  onClick,
  onOutcomeClick,
  className,
}: {
  questionName: string;
  outcomes: Outcome[];
  onClick?: () => void;
  onOutcomeClick?: (outcomeIndex: number, sideIndex: number) => void;
  className?: string;
}) {
  // Show top 2 outcomes, hide the rest
  const top2 = outcomes.slice(0, 2);
  const moreCount = outcomes.length - 2;

  return (
    <CardShell onClick={onClick} className={className}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-semibold text-[15px] leading-snug">{questionName}</h2>
      </div>

      {/* Top 2 outcome rows */}
      <div className="px-1.5 pb-2 space-y-0.5">
        {top2.map((outcome, i) => (
          <div
            key={outcome.name}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{outcome.name}</span>
              {outcome.description && (
                <span className="text-[11px] text-muted-foreground truncate block leading-tight mt-0.5">
                  {outcome.description}
                </span>
              )}
            </div>
            {outcome.pct !== undefined ? (
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-16 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success/60 transition-all duration-500"
                    style={{ width: `${outcome.pct}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums w-11 text-right">
                  {outcome.pct.toFixed(0)}%
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground w-11 text-right">--</span>
            )}
            {onOutcomeClick && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onOutcomeClick(i, 0); }}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-success/15 text-success hover:bg-success/25 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onOutcomeClick(i, 1); }}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                >
                  No
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer: total count + "+N more" */}
      <div className="px-5 pb-4 pt-1 mt-auto text-xs text-muted-foreground">
        {outcomes.length} {outcomes.length === 1 ? "outcome" : "outcomes"}
        {moreCount > 0 && <span> · +{moreCount} more</span>}
      </div>
    </CardShell>
  );
}

// ─── Event variant (default) ──────────────────────────────────────────────────

function EventCard({
  market,
  yesPx,
  noPx,
  hasPrice,
  volume,
  onClick,
  onSideClick,
  className,
}: {
  market: Market;
  yesPx: number;
  noPx: number;
  hasPrice: boolean;
  volume?: number;
  onClick?: () => void;
  onSideClick?: (sideIndex: number) => void;
  className?: string;
}) {
  return (
    <CardShell onClick={onClick} className={className}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {market.underlying}
          </p>
          <h3 className="font-semibold text-sm leading-tight">
            {market.underlying} Up or Down — {formatPeriod(market.period)}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target: {formatTargetPrice(market.targetPrice)}
          </p>
        </div>
        {volume !== undefined && (
          <span className="shrink-0 text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
            Vol ${volume.toLocaleString()}
          </span>
        )}
      </div>

      {/* Yes / No prices */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <div
          role={onSideClick ? "button" : undefined}
          tabIndex={onSideClick ? 0 : undefined}
          onClick={onSideClick ? (e) => { e.stopPropagation(); onSideClick(0); } : undefined}
          onKeyDown={onSideClick ? (e) => e.key === "Enter" && onSideClick(0) : undefined}
          className={[
            "rounded bg-muted/50 p-2 text-center",
            onSideClick ? "cursor-pointer hover:bg-success/10 transition-colors" : "",
          ].filter(Boolean).join(" ")}
        >
          <p className="text-xs text-muted-foreground mb-0.5">Yes</p>
          <p className={`font-bold text-base tabular-nums ${hasPrice ? yesColorClass(yesPx) : "text-muted-foreground"}`}>
            {hasPrice ? formatMidPrice(yesPx, "cents") : "—"}
          </p>
        </div>
        <div
          role={onSideClick ? "button" : undefined}
          tabIndex={onSideClick ? 0 : undefined}
          onClick={onSideClick ? (e) => { e.stopPropagation(); onSideClick(1); } : undefined}
          onKeyDown={onSideClick ? (e) => e.key === "Enter" && onSideClick(1) : undefined}
          className={[
            "rounded bg-muted/50 p-2 text-center",
            onSideClick ? "cursor-pointer hover:bg-destructive/10 transition-colors" : "",
          ].filter(Boolean).join(" ")}
        >
          <p className="text-xs text-muted-foreground mb-0.5">No</p>
          <p className={`font-bold text-base tabular-nums ${hasPrice ? noColorClass(noPx) : "text-muted-foreground"}`}>
            {hasPrice ? formatMidPrice(noPx, "cents") : "—"}
          </p>
        </div>
      </div>

      {/* Footer: countdown */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-4 pb-4">
        <span>Expires in</span>
        <Countdown expiry={market.expiry} className="text-xs" />
      </div>
    </CardShell>
  );
}

// ─── MarketCard (main export, dispatches to variant) ─────────────────────────

/**
 * A flexible prediction market card supporting four display variants.
 *
 * Example — standard event card:
 * ```tsx
 * <MarketCard market={market} yesMid={0.65} volume={4200} onClick={...} />
 * ```
 *
 * Example — recurring price-binary:
 * ```tsx
 * <MarketCard variant="recurring" market={market} yesMid={0.72} underlying="BTC" />
 * ```
 *
 * Example — named binary (sports-style):
 * ```tsx
 * <MarketCard
 *   variant="named-binary"
 *   title="Who wins?"
 *   sides={[{ name: "Team A", pct: 60 }, { name: "Team B", pct: 40 }]}
 * />
 * ```
 *
 * Example — multi-outcome question:
 * ```tsx
 * <MarketCard
 *   variant="question"
 *   questionName="What will happen?"
 *   outcomes={[
 *     { name: "Outcome A", pct: 45 },
 *     { name: "Outcome B", pct: 30 },
 *     { name: "Outcome C", pct: 25 },
 *   ]}
 * />
 * ```
 */
export function MarketCard(props: MarketCardProps) {
  const {
    market,
    mids,
    volume,
    onClick,
    className = "",
    onSideClick,
    onOutcomeClick,
  } = props;

  // Auto-detect variant from market data
  const variant = detectVariant(props);

  // Auto-resolve prices from mids map
  const yesMidProp = props.yesMid ?? (mids && market ? mids[market.yesCoin] : undefined);
  const noMidProp = props.noMid ?? (mids && market ? mids[market.noCoin] : undefined);

  // Auto-extract underlying from market data for recurring
  const underlying = props.underlying ?? market?.underlying;

  // Auto-extract title/sides/outcomes from market data
  // Market has no name field — derive a label from underlying + period for recurring markets.
  const derivedTitle = market?.underlying
    ? `${market.underlying}-${market.period}`
    : undefined;
  const title = props.title ?? derivedTitle;
  const sides = props.sides;
  const questionName = props.questionName;
  const outcomes = props.outcomes;
  if (variant === "named-binary") {
    if (!sides || sides.length === 0) return null;
    return (
      <NamedBinaryCard
        title={title ?? ""}
        sides={sides}
        onClick={onClick}
        onSideClick={onSideClick}
        className={className}
      />
    );
  }

  if (variant === "question") {
    if (!outcomes || outcomes.length === 0) return null;
    return (
      <QuestionCard
        questionName={questionName ?? ""}
        outcomes={outcomes}
        onClick={onClick}
        onOutcomeClick={onOutcomeClick}
        className={className}
      />
    );
  }

  if (!market) return null;

  const yesPx = yesMidProp !== undefined ? parseMid(String(yesMidProp)) : 0;
  const noPx =
    noMidProp !== undefined
      ? parseMid(String(noMidProp))
      : yesPx > 0
        ? 1 - yesPx
        : 0;
  const hasPrice = yesPx > 0;

  if (variant === "recurring") {
    return (
      <RecurringCard
        market={market}
        yesPx={yesPx}
        underlying={underlying}
        onClick={onClick}
        onSideClick={onSideClick}
        className={className}
      />
    );
  }

  // Default: "event"
  return (
    <EventCard
      market={market}
      yesPx={yesPx}
      noPx={noPx}
      hasPrice={hasPrice}
      volume={volume}
      onClick={onClick}
      onSideClick={onSideClick}
      className={className}
    />
  );
}
