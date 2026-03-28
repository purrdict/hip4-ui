/**
 * @purrdict/hip4-ui — barrel exports
 *
 * Hooks and components for building HIP-4 prediction market UIs.
 * All components are "use client" — they require a React 18+ environment
 * with a wagmi provider configured by the host application.
 *
 * Install the shadcn-compatible components into your project:
 *   npx shadcn add https://ui.purrdict.xyz/r/market-card
 *   npx shadcn add https://ui.purrdict.xyz/r/trade-form
 *
 * Or import from this package directly:
 *   import { MarketCard, useMarkets } from "@purrdict/hip4-ui";
 */

// Hooks
export { useHIP4Client } from "./hooks/use-hip4-client.js";
export type { HIP4Client, UseHIP4ClientOptions } from "./hooks/use-hip4-client.js";

export { HIP4Provider, useHIP4Context } from "./hooks/hip4-provider.js";
export type { HIP4ProviderProps } from "./hooks/hip4-provider.js";

export { useHIP4Signer } from "./hooks/use-hip4-signer.js";
export type { HIP4Signer } from "./hooks/use-hip4-signer.js";

export { useMarkets } from "./hooks/use-markets.js";
export type { UseMarketsResult } from "./hooks/use-markets.js";

export { useOrderbook } from "./hooks/use-orderbook.js";
export type { BookLevel, UseOrderbookResult } from "./hooks/use-orderbook.js";

export { useTrade } from "./hooks/use-trade.js";
export type { TradeParams, UseTradeResult } from "./hooks/use-trade.js";

export { useMinShares } from "./hooks/use-min-shares.js";
export type { UseMinSharesResult } from "./hooks/use-min-shares.js";

export { useMarket } from "./hooks/use-market.js";
export type { UseMarketResult } from "./hooks/use-market.js";

export { usePortfolio } from "./hooks/use-portfolio.js";
export type { TokenBalance, OpenOrder, Position, UsePortfolioResult } from "./hooks/use-portfolio.js";

export { useRecentTrades } from "./hooks/use-recent-trades.js";
export type { RecentTrade, UseRecentTradesResult } from "./hooks/use-recent-trades.js";

export { useUnderlyingPrice } from "./hooks/use-underlying-price.js";
export type { UseUnderlyingPriceOptions, UseUnderlyingPriceResult } from "./hooks/use-underlying-price.js";

// Components
export { Countdown, CountdownTimer } from "./components/countdown.js";
export type { CountdownProps, CountdownTimerProps } from "./components/countdown.js";

export { MarketCard } from "./components/market-card.js";
export type {
  MarketCardProps,
  MarketVariant,
  NamedSide,
  Outcome,
} from "./components/market-card.js";

export { Orderbook } from "./components/orderbook.js";
export type { OrderbookProps, OrderbookLevelClick } from "./components/orderbook.js";

export { TradeForm, OrderSummary } from "./components/trade-form.js";
export type {
  TradeFormProps,
  TradeFormPrefill,
  TradeSubmitParams,
  TradeDirection,
  TradeOrderMode,
  OrderSummaryProps,
  TradeSide,
  OrderMode,
  BuilderConfig,
} from "./components/trade-form.js";

export { PositionCard } from "./components/position-card.js";
export type { PositionCardProps } from "./components/position-card.js";

export { ProbabilityBar } from "./components/probability-bar.js";
export type { ProbabilityBarProps } from "./components/probability-bar.js";

export { MarketStats } from "./components/market-stats.js";
export type { MarketStatsProps } from "./components/market-stats.js";

export { RecentTrades } from "./components/recent-trades.js";
export type { RecentTradesProps, Trade } from "./components/recent-trades.js";

export { LivePriceChart } from "./components/live-price-chart.js";
export type { LivePriceChartProps, PricePoint } from "./components/live-price-chart.js";

// Formatting utilities
export {
  formatMidPrice,
  formatUsdh,
  formatCountdown,
  formatPeriod,
  formatTargetPrice,
  parseMid,
  noPrice,
} from "./lib/format.js";
