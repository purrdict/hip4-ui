/**
 * MarketGrid — filterable grid of MarketCard components.
 *
 * Usage:
 *   <MarketGrid
 *     markets={markets}
 *     mids={mids}
 *     onMarketClick={(m) => router.push(`/market/${m.yesCoin}`)}
 *   />
 */

"use client";

import { useState, useMemo } from "react";
import type { Market } from "@purrdict/hip4";
import { parseMid } from "../lib/format.js";
import { MarketCard } from "./market-card.js";

export type MarketFilter = "all" | "btc" | "eth" | "sol" | "other";

export interface MarketGridProps {
  markets: Market[];
  /** Live mid prices from useMarkets() */
  mids: Record<string, string>;
  /** Called when a market card is clicked */
  onMarketClick?: (market: Market) => void;
  /** Initial filter. Default: "all" */
  initialFilter?: MarketFilter;
  /** Additional CSS classes for the outer container */
  className?: string;
}

/**
 * A responsive grid of market cards with search and filter controls.
 *
 * Filters by underlying asset (BTC, ETH, SOL, other).
 * Search matches on underlying symbol, period, or coin name.
 */
export function MarketGrid({
  markets,
  mids,
  onMarketClick,
  initialFilter = "all",
  className = "",
}: MarketGridProps) {
  const [filter, setFilter] = useState<MarketFilter>(initialFilter);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = markets;

    // Filter by underlying.
    if (filter !== "all") {
      if (filter === "other") {
        list = list.filter(
          (m) => !["BTC", "ETH", "SOL"].includes(m.underlying.toUpperCase()),
        );
      } else {
        list = list.filter(
          (m) => m.underlying.toUpperCase() === filter.toUpperCase(),
        );
      }
    }

    // Search filter.
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.underlying.toLowerCase().includes(q) ||
          m.period.toLowerCase().includes(q) ||
          m.yesCoin.toLowerCase().includes(q) ||
          m.noCoin.toLowerCase().includes(q),
      );
    }

    return list;
  }, [markets, filter, search]);

  const tabs: { value: MarketFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "btc", label: "BTC" },
    { value: "eth", label: "ETH" },
    { value: "sol", label: "SOL" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={[
                "px-3 py-1 rounded text-sm font-medium transition-colors",
                filter === t.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[140px] h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Count */}
        <span className="text-xs text-muted-foreground shrink-0">
          {filtered.length} market{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No markets found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((market) => (
            <MarketCard
              key={market.yesCoin}
              market={market}
              yesMid={parseMid(mids[market.yesCoin])}
              noMid={parseMid(mids[market.noCoin])}
              onClick={onMarketClick ? () => onMarketClick(market) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
