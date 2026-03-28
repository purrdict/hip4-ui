/**
 * generate-registry.ts
 *
 * Reads source files from packages/hip4-ui/src and generates shadcn v2
 * registry JSONs with inline `content` fields at public/r/*.json.
 *
 * Run: bun scripts/generate-registry.ts
 * Also invoked automatically during `bun run build`.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");
const SRC = resolve(ROOT, "../src");
const OUT = join(ROOT, "public/r");
const PKG_OUT = resolve(ROOT, "../registry/hip4");

const AUTHOR = "Purrdict <https://purrdict.xyz>";
const SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
const BASE_URL = "https://ui.purrdict.xyz/r";

function readSrc(path: string): string {
  let content = readFileSync(join(SRC, path), "utf-8");

  // Rewrite relative imports to @/ paths that shadcn CLI transforms at install time.
  // The CLI's transformImport rewrites @/... to match the user's components.json aliases.
  //
  // Source:  ../lib/format.js           → @/lib/hip4/format
  // Source:  ./countdown.js             → @/components/hip4/countdown
  // Source:  ../hooks/use-hip4-client.js → @/hooks/hip4/use-hip4-client
  // Source:  ./use-hip4-client.js       → @/hooks/hip4/use-hip4-client

  // lib imports (from components or hooks)
  content = content.replace(/from ["']\.\.\/lib\/format\.js["']/g, 'from "@/lib/hip4/format"');
  content = content.replace(/from ["']\.\/format\.js["']/g, 'from "@/lib/hip4/format"');

  // hook-to-hook imports (within hooks/)
  content = content.replace(/from ["']\.\/(use-[\w-]+)\.js["']/g, 'from "@/hooks/hip4/$1"');
  content = content.replace(/from ["']\.\/(hip4-provider)\.js["']/g, 'from "@/hooks/hip4/$1"');

  // component-to-hook imports (from components/)
  content = content.replace(/from ["']\.\.\/hooks\/([\w-]+)\.js["']/g, 'from "@/hooks/hip4/$1"');

  // component-to-component imports
  content = content.replace(/from ["']\.\/(countdown|market-card|orderbook|trade-form|position-card|probability-bar|market-stats|recent-trades|live-price-chart)\.js["']/g, 'from "@/components/hip4/$1"');

  return content;
}

interface RegistryFile {
  path: string;
  type: string;
  content: string;
}

interface RegistryItem {
  $schema: string;
  name: string;
  type: string;
  title: string;
  description: string;
  author: string;
  dependencies: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
}

// ----- Source content -----

const formatContent = readSrc("lib/format.ts");
const countdownContent = readSrc("components/countdown.tsx");
const marketCardContent = readSrc("components/market-card.tsx");
const orderbookContent = readSrc("components/orderbook.tsx");
const positionCardContent = readSrc("components/position-card.tsx");
const tradeFormContent = readSrc("components/trade-form.tsx");
const probabilityBarContent = readSrc("components/probability-bar.tsx");
const marketStatsContent = readSrc("components/market-stats.tsx");
const recentTradesContent = readSrc("components/recent-trades.tsx");
const livePriceChartContent = readSrc("components/live-price-chart.tsx");
const useHip4ClientContent = readSrc("hooks/use-hip4-client.ts");
const useHip4SignerContent = readSrc("hooks/use-hip4-signer.ts");
const useMarketsContent = readSrc("hooks/use-markets.ts");
const useOrderbookContent = readSrc("hooks/use-orderbook.ts");
const usePortfolioContent = readSrc("hooks/use-portfolio.ts");
const useTradeContent = readSrc("hooks/use-trade.ts");
const useMinSharesContent = readSrc("hooks/use-min-shares.ts");
const useRecentTradesContent = readSrc("hooks/use-recent-trades.ts");
const hip4ProviderContent = readSrc("hooks/hip4-provider.tsx");

// ----- Helper files -----

const formatFile: RegistryFile = {
  path: "lib/hip4/format.ts",
  type: "registry:lib",
  content: formatContent,
};

const countdownFile: RegistryFile = {
  path: "components/hip4/countdown.tsx",
  type: "registry:ui",
  content: countdownContent,
};

const useHip4SignerFile: RegistryFile = {
  path: "hooks/hip4/use-hip4-signer.ts",
  type: "registry:hook",
  content: useHip4SignerContent,
};

const hip4ProviderFile: RegistryFile = {
  path: "hooks/hip4/hip4-provider.tsx",
  type: "registry:hook",
  content: hip4ProviderContent,
};

// ----- Quickstart example content -----

const quickstartContent = `"use client";

/**
 * HIP-4 Quickstart — complete working example.
 *
 * This file demonstrates the full setup for a prediction market UI:
 *   1. HIP4Provider wraps the app (creates InfoClient + SubscriptionClient)
 *   2. useMarkets discovers active markets + subscribes to live prices
 *   3. MarketCard renders each market with live mid prices
 *   4. useOrderbook + TradeForm for the trading panel
 *
 * Install: npx shadcn@latest add https://ui.purrdict.xyz/r/hip4-quickstart.json
 *
 * Prerequisites:
 *   - shadcn/ui project with Tailwind
 *   - CSS variables: --success, --success-foreground, --destructive, --destructive-foreground
 *   - Remove React.StrictMode (it kills WebSocket connections)
 */

import React, { useState } from "react";
import { HIP4Provider } from "@/hooks/hip4/hip4-provider";
import { useMarkets } from "@/hooks/hip4/use-markets";
import { useOrderbook } from "@/hooks/hip4/use-orderbook";
import { useMinShares } from "@/hooks/hip4/use-min-shares";
import { useRecentTrades } from "@/hooks/hip4/use-recent-trades";
import { MarketCard } from "@/components/hip4/market-card";
import { Orderbook } from "@/components/hip4/orderbook";
import { TradeForm } from "@/components/hip4/trade-form";
import { RecentTrades } from "@/components/hip4/recent-trades";
import { ProbabilityBar } from "@/components/hip4/probability-bar";
import type { Market } from "@purrdict/hip4";

/**
 * MarketGrid — discovers and displays all active prediction markets.
 *
 * Data flow:
 *   useMarkets() -> fetches outcomeMeta + allMids, subscribes to WS prices
 *   MarketCard   -> receives market object + yesMid from mids map
 */
function MarketGrid({ onSelect }: { onSelect: (m: Market) => void }) {
  const { markets, mids, isLoading, error } = useMarkets();

  if (isLoading) return <div className="text-muted-foreground p-8 text-center">Discovering markets...</div>;
  if (error) return <div className="text-destructive p-8 text-center">Error: {error.message}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {markets.map((market) => {
        const yesMid = mids[market.yesOutcome.coin]
          ? parseFloat(mids[market.yesOutcome.coin])
          : null;
        return (
          <MarketCard
            key={market.yesOutcome.coin}
            market={market}
            yesMid={yesMid ?? 0.5}
            onClick={() => onSelect(market)}
          />
        );
      })}
    </div>
  );
}

/**
 * TradingPanel — orderbook + trade form for a single market.
 *
 * Data flow:
 *   useOrderbook(coin) -> L2 book subscription -> { bids, asks, spread, midPrice }
 *   useMinShares(coin)  -> spotMetaAndAssetCtxs -> { minShares }
 *   TradeForm           -> receives bookData={{ bids, asks }}, auto-resolves mid/bid/ask
 */
function TradingPanel({ market }: { market: Market }) {
  const coin = market.yesOutcome.coin;
  const { bids, asks, spread, midPrice } = useOrderbook(coin);
  const { minShares } = useMinShares(coin);
  const { trades } = useRecentTrades(coin);

  const sides = [
    { name: market.yesOutcome.name ?? "Yes", coin },
    ...(market.noOutcome ? [{ name: market.noOutcome.name ?? "No", coin: market.noOutcome.coin }] : []),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Orderbook</h3>
        <Orderbook bids={bids} asks={asks} spread={spread} midPrice={midPrice} />
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Trade</h3>
        {midPrice && <ProbabilityBar yesPx={midPrice} noPx={1 - midPrice} className="mb-4" />}
        <TradeForm
          sides={sides}
          bookData={{ bids, asks }}
          minShares={minShares}
          isConnected={false}
          onSubmit={async (params) => {
            console.log("Order submitted:", params);
            // Wire to useTrade(exchange).buy() / .sell() here
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Trades</h3>
        <RecentTrades trades={trades} />
      </div>
    </div>
  );
}

/**
 * HIP4Quickstart — the complete app wrapper.
 *
 * Wrap in <HIP4Provider> so all hooks auto-resolve the client from context.
 * Set testnet={true} to connect to Hyperliquid testnet during development.
 */
export function HIP4Quickstart({ testnet = false }: { testnet?: boolean }) {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  return (
    <HIP4Provider testnet={testnet}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">HIP-4 Markets</h1>
          {selectedMarket && (
            <button
              onClick={() => setSelectedMarket(null)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to markets
            </button>
          )}
        </header>
        {selectedMarket ? (
          <TradingPanel market={selectedMarket} />
        ) : (
          <MarketGrid onSelect={setSelectedMarket} />
        )}
      </div>
    </HIP4Provider>
  );
}
`;

// ----- Registry items -----

const items: RegistryItem[] = [
  // Lib
  {
    $schema: SCHEMA,
    name: "hip4-format",
    type: "registry:lib",
    title: "HIP-4 Formatting Utilities",
    description:
      "Price, USDH, countdown, and period formatters for HIP-4 prediction market data. Exports formatMidPrice(px, style?), formatUsdh(amount), formatTargetPrice(price), formatPeriod(market), parseMid(midStr). Used internally by MarketCard, Orderbook, PositionCard, and MarketStats.",
    author: AUTHOR,
    dependencies: [],
    files: [formatFile],
  },

  // Components — ordered: cards → chart → book → trades → form → stats → bar → countdown → position
  {
    $schema: SCHEMA,
    name: "market-card",
    type: "registry:ui",
    title: "Market Card",
    description:
      'Display card for HIP-4 prediction markets with 4 variants: "event" (Yes/No), "recurring" (Up/Down with asset logo), "named-binary" (custom side names), "question" (multi-outcome). Pass market object from useMarkets() and yesMid from mids map. Key props: market (Market), yesMid (number), volume? (number), variant? (MarketVariant), onClick? (callback).',
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    registryDependencies: [
      `${BASE_URL}/countdown.json`,
      `${BASE_URL}/hip4-format.json`,
    ],
    files: [
      {
        path: "components/hip4/market-card.tsx",
        type: "registry:ui",
        content: marketCardContent,
      },
      countdownFile,
      formatFile,
    ],
  },
  {
    $schema: SCHEMA,
    name: "live-price-chart",
    type: "registry:ui",
    title: "Live Price Chart",
    description:
      "Canvas-based real-time price chart for prediction markets. Append PricePoint[] from a WebSocket subscription. Key props: symbol (string, e.g. 'BTC'), prices (PricePoint[]), currentPrice (number), targetPrice? (number), height? (number). No hook required — build price array manually from allMids or l2Book subscription.",
    author: AUTHOR,
    dependencies: [],
    registryDependencies: [`${BASE_URL}/hip4-format.json`],
    files: [
      {
        path: "components/hip4/live-price-chart.tsx",
        type: "registry:ui",
        content: livePriceChartContent,
      },
      formatFile,
    ],
  },
  {
    $schema: SCHEMA,
    name: "orderbook",
    type: "registry:ui",
    title: "Orderbook",
    description:
      "Dual-pane L2 orderbook with color-coded depth bars, spread display, and click-to-set-price. Feed with useOrderbook(coin) which returns { bids, asks, spread, midPrice }. Key props: bids (BookLevel[]), asks (BookLevel[]), spread? (number), midPrice? (number), onPriceClick? (price => void), userOrders? (array for highlighting).",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    registryDependencies: [`${BASE_URL}/hip4-format.json`],
    files: [
      {
        path: "components/hip4/orderbook.tsx",
        type: "registry:ui",
        content: orderbookContent,
      },
      formatFile,
    ],
  },
  {
    $schema: SCHEMA,
    name: "recent-trades",
    type: "registry:ui",
    title: "Recent Trades",
    description:
      "Scrollable trade feed with color-coded buy/sell sides and monospace prices. Feed with useRecentTrades(coin) which returns { trades }. Key props: trades (Trade[] with side, price, size, time), maxRows? (number, default 50). Pure presentation — no data fetching.",
    author: AUTHOR,
    dependencies: [],
    files: [
      {
        path: "components/hip4/recent-trades.tsx",
        type: "registry:ui",
        content: recentTradesContent,
      },
    ],
  },
  {
    $schema: SCHEMA,
    name: "trade-form",
    type: "registry:ui",
    title: "Trade Form",
    description:
      "Complete prediction market trade form. Pass bookData={{ bids, asks }} from useOrderbook to auto-resolve mid/bid/ask. Requires sides array from market.sides (e.g. [{name: 'Yes', coin: '#9860'}]). Connect useTrade(exchange) for order submission via onSubmit. Key props: sides, bookData?, minShares? (from useMinShares), usdhBalance? (from usePortfolio), shareBalance?, isConnected?, builder? ({address, fee}), onSubmit? (TradeSubmitParams => Promise).",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    registryDependencies: [
      `${BASE_URL}/hip4-format.json`,
      `${BASE_URL}/use-trade.json`,
    ],
    files: [
      {
        path: "components/hip4/trade-form.tsx",
        type: "registry:ui",
        content: tradeFormContent,
      },
      formatFile,
    ],
  },
  {
    $schema: SCHEMA,
    name: "market-stats",
    type: "registry:ui",
    title: "Market Stats",
    description:
      "Compact inline stats bar showing volume, trade count, and unique trader count with icons. Pure presentation — pass data directly, no hook needed. Key props: volume (number, 24h USDH), trades (number, total count), traders (number, unique count).",
    author: AUTHOR,
    dependencies: [],
    registryDependencies: [`${BASE_URL}/hip4-format.json`],
    files: [
      {
        path: "components/hip4/market-stats.tsx",
        type: "registry:ui",
        content: marketStatsContent,
      },
      formatFile,
    ],
  },
  {
    $schema: SCHEMA,
    name: "probability-bar",
    type: "registry:ui",
    title: "Probability Bar",
    description:
      "Two-tone horizontal probability bar. Pure presentation — pass probabilities directly, no hook needed. Key props: yesPx (number 0-1), noPx (number 0-1), yesLabel? (string, default 'Yes'), noLabel? (string, default 'No'). Uses --success and --destructive CSS variables.",
    author: AUTHOR,
    dependencies: [],
    files: [
      {
        path: "components/hip4/probability-bar.tsx",
        type: "registry:ui",
        content: probabilityBarContent,
      },
    ],
  },
  {
    $schema: SCHEMA,
    name: "countdown",
    type: "registry:ui",
    title: "Countdown",
    description:
      "Segmented countdown timer with urgency colors: red (<1h), amber (<6h), normal. Two variants: 'segments' (DAYS/HRS/MINS/SECS boxes) and 'text' (inline). Key props: expiry (Date), variant? ('segments' | 'text'). Pure presentation — no hook needed.",
    author: AUTHOR,
    dependencies: [],
    registryDependencies: [`${BASE_URL}/hip4-format.json`],
    files: [countdownFile, formatFile],
  },
  {
    $schema: SCHEMA,
    name: "position-card",
    type: "registry:ui",
    title: "Position Card",
    description:
      "Displays a user's position with shares, current value, average entry, and unrealized P&L. Feed with usePortfolio(address) for positions array, and mids from useMarkets for currentPrice. Key props: coin (string), shares (number), currentPrice (number), avgEntry? (number), onSell? (coin => void).",
    author: AUTHOR,
    dependencies: [],
    registryDependencies: [`${BASE_URL}/hip4-format.json`],
    files: [
      {
        path: "components/hip4/position-card.tsx",
        type: "registry:ui",
        content: positionCardContent,
      },
      formatFile,
    ],
  },

  // Hooks
  {
    $schema: SCHEMA,
    name: "use-hip4-client",
    type: "registry:hook",
    title: "useHIP4Client",
    description:
      "Creates and caches InfoClient + SubscriptionClient from @nktkas/hyperliquid. Returns { info, sub, close }. Cached in ref — stable across rerenders. Pass { testnet: true } for testnet. Usually consumed via HIP4Provider rather than directly.",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    files: [
      {
        path: "hooks/hip4/use-hip4-client.ts",
        type: "registry:hook",
        content: useHip4ClientContent,
      },
    ],
  },
  {
    $schema: SCHEMA,
    name: "hip4-provider",
    type: "registry:hook",
    title: "HIP4Provider",
    description:
      "React context provider — wrap your app in <HIP4Provider testnet={false}> and all hooks (useMarkets, useOrderbook, etc.) auto-resolve the client. No prop-drilling needed. Key props: testnet? (boolean, default false), children.",
    author: AUTHOR,
    dependencies: ["@nktkas/hyperliquid"],
    registryDependencies: [
      `${BASE_URL}/use-hip4-client.json`,
      `${BASE_URL}/hip4-provider.json`,
    ],
    files: [
      hip4ProviderFile,
      {
        path: "hooks/hip4/use-hip4-client.ts",
        type: "registry:hook",
        content: useHip4ClientContent,
      },
    ],
  },
  {
    $schema: SCHEMA,
    name: "use-hip4-signer",
    type: "registry:hook",
    title: "useHIP4Signer",
    description:
      "Adapts any wagmi wallet to { address, walletClient } for use with ExchangeClient. Returns null when disconnected. Works with MetaMask, WalletConnect, Privy, Coinbase Wallet. Pass walletClient to new ExchangeClient({ transport, wallet: signer.walletClient }).",
    author: AUTHOR,
    dependencies: ["wagmi", "viem"],
    files: [useHip4SignerFile],
  },
  {
    $schema: SCHEMA,
    name: "use-markets",
    type: "registry:hook",
    title: "useMarkets",
    description:
      "Discovers all active HIP-4 markets and subscribes to live mid prices via WebSocket. Returns { markets: Market[], mids: Record<string, string>, isLoading, error }. Feed markets to MarketCard and mids[coin] for yesMid. Stable markets array (useMemo) prevents downstream rerenders.",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    registryDependencies: [
      `${BASE_URL}/use-hip4-client.json`,
      `${BASE_URL}/hip4-provider.json`,
    ],
    files: [
      {
        path: "hooks/hip4/use-markets.ts",
        type: "registry:hook",
        content: useMarketsContent,
      },
    ],
  },
  {
    $schema: SCHEMA,
    name: "use-orderbook",
    type: "registry:hook",
    title: "useOrderbook",
    description:
      "Subscribes to the L2 orderbook for a prediction market coin via WebSocket. Returns { bids: BookLevel[], asks: BookLevel[], spread: number|null, midPrice: number|null, isLoading, error }. Pass { bids, asks } as bookData to TradeForm. Call as useOrderbook(coin) with HIP4Provider or useOrderbook(client, coin).",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    registryDependencies: [
      `${BASE_URL}/use-hip4-client.json`,
      `${BASE_URL}/hip4-provider.json`,
    ],
    files: [
      {
        path: "hooks/hip4/use-orderbook.ts",
        type: "registry:hook",
        content: useOrderbookContent,
      },
    ],
  },
  {
    $schema: SCHEMA,
    name: "use-portfolio",
    type: "registry:hook",
    title: "usePortfolio",
    description:
      "Fetches USDH balance, outcome token positions, and open orders for a wallet address. Returns { usdh: TokenBalance|null, positions: Position[], openOrders: OpenOrder[], isLoading, error, refresh() }. Pass usdh.total to TradeForm as usdhBalance. Call refresh() after placing an order.",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    registryDependencies: [
      `${BASE_URL}/use-hip4-client.json`,
      `${BASE_URL}/hip4-provider.json`,
    ],
    files: [
      {
        path: "hooks/hip4/use-portfolio.ts",
        type: "registry:hook",
        content: usePortfolioContent,
      },
    ],
  },
  {
    $schema: SCHEMA,
    name: "use-trade",
    type: "registry:hook",
    title: "useTrade",
    description:
      "Place and cancel HIP-4 prediction market orders. Takes ExchangeClient (NOT HIP4Client) — create with new ExchangeClient({ transport, wallet }). Returns { buy(params), sell(params), cancel(asset, oid), isSubmitting, lastResult, error }. TradeParams: { coin, asset, shares, price, tif?, markPx?, builder? }.",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    registryDependencies: [
      `${BASE_URL}/use-hip4-client.json`,
      `${BASE_URL}/use-hip4-signer.json`,
    ],
    files: [
      {
        path: "hooks/hip4/use-trade.ts",
        type: "registry:hook",
        content: useTradeContent,
      },
      useHip4SignerFile,
    ],
  },
  {
    $schema: SCHEMA,
    name: "use-min-shares",
    type: "registry:hook",
    title: "useMinShares",
    description:
      "Computes the minimum order size for a prediction market coin. Fetches mark price from spotMetaAndAssetCtxs, applies formula: ceil(10/max(min(markPx,1-markPx),0.01)). Returns { minShares: number, markPx: number|null, isLoading, error }. Pass minShares to TradeForm.",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4"],
    registryDependencies: [
      `${BASE_URL}/use-hip4-client.json`,
      `${BASE_URL}/hip4-provider.json`,
    ],
    files: [
      {
        path: "hooks/hip4/use-min-shares.ts",
        type: "registry:hook",
        content: useMinSharesContent,
      },
    ],
  },
  {
    $schema: SCHEMA,
    name: "use-recent-trades",
    type: "registry:hook",
    title: "useRecentTrades",
    description:
      "Subscribes to recent trades for a prediction market coin. Returns { trades: RecentTrade[], isLoading, error }. Each trade has { side: 'B'|'S', price: number, size: number, time: number }. Fetches initial history via HTTP then appends live trades via WebSocket. Pass trades to RecentTrades component.",
    author: AUTHOR,
    dependencies: ["@nktkas/hyperliquid"],
    registryDependencies: [
      `${BASE_URL}/use-hip4-client.json`,
      `${BASE_URL}/hip4-provider.json`,
    ],
    files: [
      {
        path: "hooks/hip4/use-recent-trades.ts",
        type: "registry:hook",
        content: useRecentTradesContent,
      },
    ],
  },

  // Quickstart — installs everything + example
  {
    $schema: SCHEMA,
    name: "hip4-quickstart",
    type: "registry:example",
    title: "HIP-4 Quickstart",
    description:
      "Complete working example: HIP4Provider + useMarkets + MarketCard grid + Orderbook + TradeForm + RecentTrades. Installs ALL components and hooks. One command to get a full prediction market UI.",
    author: AUTHOR,
    dependencies: ["@purrdict/hip4", "@nktkas/hyperliquid"],
    registryDependencies: [
      `${BASE_URL}/hip4-provider.json`,
      `${BASE_URL}/market-card.json`,
      `${BASE_URL}/live-price-chart.json`,
      `${BASE_URL}/orderbook.json`,
      `${BASE_URL}/recent-trades.json`,
      `${BASE_URL}/trade-form.json`,
      `${BASE_URL}/market-stats.json`,
      `${BASE_URL}/probability-bar.json`,
      `${BASE_URL}/countdown.json`,
      `${BASE_URL}/position-card.json`,
      `${BASE_URL}/use-markets.json`,
      `${BASE_URL}/use-orderbook.json`,
      `${BASE_URL}/use-portfolio.json`,
      `${BASE_URL}/use-trade.json`,
      `${BASE_URL}/use-min-shares.json`,
      `${BASE_URL}/use-recent-trades.json`,
      `${BASE_URL}/use-hip4-signer.json`,
      `${BASE_URL}/hip4-format.json`,
    ],
    files: [
      {
        path: "components/hip4/hip4-quickstart.tsx",
        type: "registry:example",
        content: quickstartContent,
      },
    ],
  },
];

// ----- Write output -----

mkdirSync(OUT, { recursive: true });
mkdirSync(PKG_OUT, { recursive: true });

for (const item of items) {
  const json = JSON.stringify(item, null, 2) + "\n";
  writeFileSync(join(OUT, `${item.name}.json`), json);
  writeFileSync(join(PKG_OUT, `${item.name}.json`), json);
}

// Top-level registry index
const registryIndex = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "purrdict",
  homepage: "https://ui.purrdict.xyz",
  items: items.map((item) => ({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
    registryDependencies: item.registryDependencies,
  })),
};

writeFileSync(join(OUT, "index.json"), JSON.stringify(registryIndex, null, 2) + "\n");

console.log(`Generated ${items.length} registry items + index.json`);
console.log(`  -> ${OUT}/`);
console.log(`  -> ${PKG_OUT}/`);
