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

// ----- Registry items -----

const items: RegistryItem[] = [
  // Lib
  {
    $schema: SCHEMA,
    name: "hip4-format",
    type: "registry:lib",
    title: "HIP-4 Formatting Utilities",
    description:
      "Price, USDH, countdown, and period formatters for HIP-4 prediction market data.",
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
      "Display card for HIP-4 prediction markets with 4 variants: recurring (Up/Down), event (Yes/No), named-binary (custom sides), and question (multi-outcome).",
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
      "Real-time ticking price chart for prediction markets. Shows asset price history with 1-second updates, target price reference line, and asset-branded color. Polymarket-style.",
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
      "Dual-pane L2 orderbook with color-coded depth bars, spread display, user order highlighting, and click-to-set-price interaction.",
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
      "Scrollable trade feed showing recent market trades with color-coded buy/sell sides, monospace prices, and timestamps.",
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
      "Complete prediction market trade form with market/limit modes, order summary (payout, profit, slippage), tick-size validation, min-shares enforcement, and builder fee support.",
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
      "Compact inline stats display showing volume, trade count, and unique trader count with icons.",
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
      "Two-tone horizontal probability bar showing Yes/No (or custom) side probabilities with labels and smooth transitions.",
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
      "Segmented countdown timer with urgency colors. Shows DAYS/HRS/MINS/SECS with red (<1h), amber (<6h), normal states. Includes text variant.",
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
      "Displays a user's position with shares, current value, average entry, and unrealized P&L with color coding.",
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
      "Creates and caches an @purrdict/hip4 client with WebSocket subscription support. Manages lifecycle and cleanup on unmount.",
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
      "Optional React context provider for zero prop-drilling. Wrap your app in <HIP4Provider> and all hooks auto-resolve the client.",
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
      "Adapts any wagmi wallet (MetaMask, WalletConnect, Privy, etc.) to the HIP-4 SDK signer interface. Returns null when disconnected.",
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
      "Discovers active HIP-4 markets and subscribes to live mid prices via WebSocket. Returns stable markets array with useMemo to prevent downstream rerenders.",
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
      "Subscribes to the L2 orderbook for a prediction market coin. Returns bids, asks, spread, and mid price with live WebSocket updates.",
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
      "Fetches USDH balance, outcome token positions, and open orders for a wallet address. Stable return object with useCallback for refresh.",
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
      "Place and cancel HIP-4 prediction market orders. Handles builder fee attachment, tick alignment, and order signing via the SDK.",
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
      "Computes the minimum order size for a prediction market coin based on mark price from spotMetaAndAssetCtxs.",
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
      "Subscribes to recent trades for a prediction market coin. Returns live trade feed via WebSocket with initial history fetch.",
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
