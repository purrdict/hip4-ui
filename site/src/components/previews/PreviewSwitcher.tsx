"use client";

/**
 * PreviewSwitcher — single Astro island that dynamically renders
 * the correct preview component based on the `name` prop.
 *
 * Astro requires static component references for client:* directives,
 * so we wrap all previews in one React component that handles dispatch.
 */

import MarketCardPreview from "./MarketCardPreview";
import OrderbookPreview from "./OrderbookPreview";
import TradeFormPreview from "./TradeFormPreview";
import CountdownPreview from "./CountdownPreview";
import PositionCardPreview from "./PositionCardPreview";
import ProbabilityBarPreview from "./ProbabilityBarPreview";
import MarketStatsPreview from "./MarketStatsPreview";
import RecentTradesPreview from "./RecentTradesPreview";
import LivePriceChartPreview from "./LivePriceChartPreview";
import ProbabilityChartPreview from "./ProbabilityChartPreview";

const previews: Record<string, React.ComponentType> = {
  "market-card": MarketCardPreview,
  "live-price-chart": LivePriceChartPreview,
  "probability-chart": ProbabilityChartPreview,
  "orderbook": OrderbookPreview,
  "trade-form": TradeFormPreview,
  "countdown": CountdownPreview,
  "position-card": PositionCardPreview,
  "probability-bar": ProbabilityBarPreview,
  "market-stats": MarketStatsPreview,
  "recent-trades": RecentTradesPreview,
};

export default function PreviewSwitcher({ name }: { name: string }) {
  const Component = previews[name];
  if (!Component) return null;
  return <Component />;
}
