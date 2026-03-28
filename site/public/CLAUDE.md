# @purrdict/hip4-ui -- AI Development Guide

shadcn-compatible React component registry for HIP-4 prediction markets on Hyperliquid.

- **Registry**: https://ui.purrdict.xyz
- **npm**: `@purrdict/hip4-ui` (v0.1.0)
- **Install any item**: `npx shadcn@latest add https://ui.purrdict.xyz/r/<name>.json`

## Quick Start (for AI agents building with this)

### 1. Install the provider + components you need

```bash
npx shadcn@latest add https://ui.purrdict.xyz/r/hip4-provider.json
npx shadcn@latest add https://ui.purrdict.xyz/r/market-card.json
npx shadcn@latest add https://ui.purrdict.xyz/r/trade-form.json
npx shadcn@latest add https://ui.purrdict.xyz/r/orderbook.json
```

Or install everything at once:
```bash
npx shadcn@latest add https://ui.purrdict.xyz/r/hip4-quickstart.json
```

### 2. Install peer dependencies

```bash
npm install @purrdict/hip4 @nktkas/hyperliquid wagmi viem
```

### 3. Wrap your app in HIP4Provider

```tsx
import { HIP4Provider } from "@/hooks/hip4/hip4-provider";

function App() {
  return (
    <HIP4Provider testnet={false}>
      {/* All hip4 hooks work inside here without passing client */}
      <MarketGrid />
    </HIP4Provider>
  );
}
```

### 4. Display markets with live prices

```tsx
import { useMarkets } from "@/hooks/hip4/use-markets";
import { MarketCard } from "@/components/hip4/market-card";

function MarketGrid() {
  const { markets, mids, isLoading } = useMarkets();
  if (isLoading) return <div>Loading markets...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((market) => {
        const yesMid = mids[market.yesCoin]
          ? parseFloat(mids[market.yesCoin])
          : null;
        return (
          <MarketCard
            key={market.yesCoin}
            market={market}
            yesMid={yesMid ?? 0.5}
            onClick={() => navigate(`/market/${market.yesCoin}`)}
          />
        );
      })}
    </div>
  );
}
```

### 5. CSS variables required

Components use these shadcn CSS variables -- add to your `globals.css`:

```css
:root {
  --success: 142 71% 45%;           /* green for Yes/Up */
  --success-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;         /* red for No/Down */
  --destructive-foreground: 0 0% 100%;
}
```

These inherit from shadcn's standard variable system. If you already use shadcn/ui, you likely have `--destructive` defined. Add `--success` and `--success-foreground` if missing.

## Known Gotchas

1. **StrictMode kills WebSocket** -- React.StrictMode double-mounts components, which disconnects the WebSocket immediately. Remove StrictMode or the WS will cycle connect/disconnect endlessly.

2. **wagmi chain config doesn't matter** -- Hyperliquid accepts any chainId for signing. Don't waste time matching chain IDs.

3. **useTrade needs ExchangeClient** -- The hook takes `ExchangeClient | null` from `@nktkas/hyperliquid`, NOT the HIP4Client. Create it separately:
   ```ts
   const exchange = new ExchangeClient({ transport: httpTransport, wallet: walletClient });
   const { buy, sell } = useTrade(exchange);
   ```

4. **Builder address must be lowercased** -- In order actions, `builder.b` MUST be `.toLowerCase()`. The SDK handles this, but if constructing manually, lowercase it.

5. **Market order price** -- TradeForm handles slippage internally (1.3x best ask for buy, 0.7x best bid for sell). Don't hardcode 0.99.

6. **Tick size = 5 significant figures** -- All prices must have at most 5 sig figs. `computeTickSize()` from `@purrdict/hip4` computes this. `roundToTick()` rounds to the nearest valid price.

7. **Minimum order size varies by price** -- Use `useMinShares(coin)` to get the current minimum. Formula: `ceil(10 / max(min(markPx, 1-markPx), 0.01))`. At 50 cents = 20 shares, at 1 cent = 1000 shares.

## Registry Items (20 total)

### Lib (1)

| Name | Install | Description |
|------|---------|-------------|
| `hip4-format` | `npx shadcn@latest add https://ui.purrdict.xyz/r/hip4-format.json` | `formatMidPrice()`, `formatUsdh()`, `formatTargetPrice()`, `formatPeriod()`, `parseMid()` |

### Components (9)

| Name | Install | Fed by | Key Props |
|------|---------|--------|-----------|
| `market-card` | `npx shadcn@latest add https://ui.purrdict.xyz/r/market-card.json` | `useMarkets` (markets + mids) | `market`, `yesMid`, `volume?`, `variant?` ("event"\|"recurring"\|"named-binary"\|"question") |
| `live-price-chart` | `npx shadcn@latest add https://ui.purrdict.xyz/r/live-price-chart.json` | Manual price array | `symbol`, `prices: PricePoint[]`, `currentPrice`, `targetPrice?`, `height?` |
| `orderbook` | `npx shadcn@latest add https://ui.purrdict.xyz/r/orderbook.json` | `useOrderbook` | `coin`, `bids`, `asks`, `depth?`, `onPriceClick?` |
| `recent-trades` | `npx shadcn@latest add https://ui.purrdict.xyz/r/recent-trades.json` | `useRecentTrades` | `trades: Trade[]` (side, price, size, time) |
| `trade-form` | `npx shadcn@latest add https://ui.purrdict.xyz/r/trade-form.json` | `useOrderbook` for bookData, `useTrade` for submission | `sides`, `bookData?`, `minShares?`, `usdhBalance?`, `isConnected?`, `onSubmit` |
| `market-stats` | `npx shadcn@latest add https://ui.purrdict.xyz/r/market-stats.json` | Pure presentation | `volume`, `trades`, `traders` |
| `probability-bar` | `npx shadcn@latest add https://ui.purrdict.xyz/r/probability-bar.json` | Pure presentation | `yesPx`, `noPx`, `yesLabel?`, `noLabel?` |
| `countdown` | `npx shadcn@latest add https://ui.purrdict.xyz/r/countdown.json` | Pure presentation | `expiry: Date`, `variant?` ("segments"\|"text") |
| `position-card` | `npx shadcn@latest add https://ui.purrdict.xyz/r/position-card.json` | `usePortfolio` | `coin`, `shares`, `currentPrice`, `avgEntry?`, `onSell?` |

### Hooks (9)

| Name | Install | Purpose |
|------|---------|---------|
| `use-hip4-client` | `npx shadcn@latest add https://ui.purrdict.xyz/r/use-hip4-client.json` | Creates InfoClient + SubscriptionClient from @nktkas/hyperliquid. Cached in ref. |
| `hip4-provider` | `npx shadcn@latest add https://ui.purrdict.xyz/r/hip4-provider.json` | React context -- wrap app, all hooks auto-resolve client. `<HIP4Provider testnet={true}>` |
| `use-hip4-signer` | `npx shadcn@latest add https://ui.purrdict.xyz/r/use-hip4-signer.json` | Adapts wagmi wallet to `{ address, walletClient }`. Returns null when disconnected. |
| `use-markets` | `npx shadcn@latest add https://ui.purrdict.xyz/r/use-markets.json` | Discovers all active markets + live mid prices via WS. Returns `{ markets, mids, isLoading }`. |
| `use-orderbook` | `npx shadcn@latest add https://ui.purrdict.xyz/r/use-orderbook.json` | L2 book subscription. Returns `{ bids, asks, spread, midPrice }`. Pass to TradeForm as `bookData`. |
| `use-portfolio` | `npx shadcn@latest add https://ui.purrdict.xyz/r/use-portfolio.json` | Fetches USDH balance, outcome positions, open orders. Returns `{ usdh, positions, openOrders, refresh }`. |
| `use-trade` | `npx shadcn@latest add https://ui.purrdict.xyz/r/use-trade.json` | Order placement via `buy()` / `sell()` / `cancel()`. Takes `ExchangeClient` not HIP4Client. |
| `use-min-shares` | `npx shadcn@latest add https://ui.purrdict.xyz/r/use-min-shares.json` | Computes min order size from mark price. Returns `{ minShares, markPx }`. |
| `use-recent-trades` | `npx shadcn@latest add https://ui.purrdict.xyz/r/use-recent-trades.json` | Live trade feed via WS + initial history. Returns `{ trades: RecentTrade[] }`. |

### Meta (1)

| Name | Install | Description |
|------|---------|-------------|
| `hip4-quickstart` | `npx shadcn@latest add https://ui.purrdict.xyz/r/hip4-quickstart.json` | Installs ALL components + hooks + a working example. One command to get everything. |

## Component -> Hook Wiring

```
MarketCard        -> useMarkets       (markets array + mids map for yesMid)
LivePriceChart    -> manual           (build PricePoint[] from WS subscription)
Orderbook         -> useOrderbook     (coin, bids, asks)
TradeForm         -> useOrderbook     (pass { bids, asks } as bookData prop)
                  -> useTrade         (wire onSubmit to buy()/sell())
                  -> useMinShares     (pass minShares prop)
                  -> usePortfolio     (pass usdhBalance, shareBalance)
RecentTrades      -> useRecentTrades  (trades array)
PositionCard      -> usePortfolio     (positions array + currentPrice from mids)
ProbabilityBar    -> pure             (pass yesPx/noPx directly)
MarketStats       -> pure             (pass volume/trades/traders directly)
Countdown         -> pure             (pass expiry Date)
```

## Data Flow Architecture

```
@nktkas/hyperliquid (network layer)
  |
  v
useHIP4Client -- creates { info: InfoClient, sub: SubscriptionClient, close() }
  |
  v
<HIP4Provider> -- context wrapper, all hooks auto-resolve client
  |
  +-> useMarkets        -- info.outcomeMeta() + info.allMids() + sub.allMids()
  +-> useOrderbook      -- sub.l2Book({ coin })
  +-> usePortfolio      -- info.spotClearinghouseState() + info.frontendOpenOrders()
  +-> useMinShares      -- info.spotMetaAndAssetCtxs()
  +-> useRecentTrades   -- info.recentTrades() + sub.trades({ coin })
  |
  v
ExchangeClient (separate from HIP4Client -- needs wallet)
  |
  v
useTrade -- buildOrderAction() + exchange.order()
```

## SDK Exports (@purrdict/hip4)

The SDK is a pure knowledge layer. It does NOT do network I/O.

```ts
// Market discovery
discoverMarkets(outcomeMeta, allMids)  // -> Market[]
parseDescription(name)                 // -> ParsedDescription
getMinShares(markPx)                   // -> number (min order size)
timeToExpiry(market)                   // -> ms until expiry
periodMinutes(market)                  // -> period length in minutes
formatLabel(market)                    // -> human-readable label

// Pricing
computeTickSize(price)                 // -> tick size for 5 sig fig rule
roundToTick(price)                     // -> nearest valid price string
formatPrice(price)                     // -> display string
stripZeros(priceStr)                   // -> remove trailing zeros

// Orders
buildOrderAction({ asset, isBuy, price, size, tif, markPx?, builderAddress?, builderFee? })
  // -> { ok: OrderAction } | { err: string }

// Types
outcomeToAsset(coinNum)                // -> 100_000_000 + coinNum
```

## Full Trading Page Example

```tsx
import { HIP4Provider } from "@/hooks/hip4/hip4-provider";
import { useMarkets } from "@/hooks/hip4/use-markets";
import { useOrderbook } from "@/hooks/hip4/use-orderbook";
import { useMinShares } from "@/hooks/hip4/use-min-shares";
import { usePortfolio } from "@/hooks/hip4/use-portfolio";
import { useTrade } from "@/hooks/hip4/use-trade";
import { useHIP4Signer } from "@/hooks/hip4/use-hip4-signer";
import { MarketCard } from "@/components/hip4/market-card";
import { Orderbook } from "@/components/hip4/orderbook";
import { TradeForm } from "@/components/hip4/trade-form";
import { RecentTrades } from "@/components/hip4/recent-trades";
import { useRecentTrades } from "@/hooks/hip4/use-recent-trades";
import { ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";

function TradingPage({ coin }: { coin: string }) {
  const signer = useHIP4Signer();
  const { bids, asks, spread, midPrice } = useOrderbook(coin);
  const { minShares } = useMinShares(coin);
  const { trades } = useRecentTrades(coin);
  const { usdh, positions } = usePortfolio(signer?.address ?? null);

  // Create ExchangeClient when wallet is connected
  const exchange = signer
    ? new ExchangeClient({
        transport: new HttpTransport(),
        wallet: signer.walletClient,
      })
    : null;
  const { buy, sell, isSubmitting } = useTrade(exchange);

  return (
    <div className="grid grid-cols-3 gap-4">
      <Orderbook coin={coin} bids={bids} asks={asks} />
      <TradeForm
        sides={[{ name: "Yes", coin }, { name: "No", coin: coin.replace(/#(\d+)/, (_, n) => `#${+n+1}`) }]}
        bookData={{ bids, asks }}
        minShares={minShares}
        usdhBalance={usdh?.total ?? 0}
        isConnected={!!signer}
        onSubmit={async (params) => {
          const tradeFn = params.direction === "buy" ? buy : sell;
          // ... wire to tradeFn
        }}
      />
      <RecentTrades trades={trades} />
    </div>
  );
}

export default function App() {
  return (
    <HIP4Provider testnet={false}>
      <TradingPage coin="#9860" />
    </HIP4Provider>
  );
}
```

## Development

```bash
cd packages/hip4-ui
bun install
bun test                    # run tests
bun run build               # build dist/

# Regenerate registry JSONs
cd site && bun scripts/generate-registry.ts
# or from apps/hip4-registry:
cd apps/hip4-registry && bun scripts/generate-registry.ts
```

## File Structure

```
src/
  components/
    countdown.tsx           # Segmented countdown timer
    live-price-chart.tsx    # Canvas-based real-time price chart
    market-card.tsx         # 4-variant market display card
    market-stats.tsx        # Volume/trades/traders stats row
    orderbook.tsx           # Dual-pane L2 orderbook
    position-card.tsx       # Position with PnL
    probability-bar.tsx     # Two-tone probability visualization
    recent-trades.tsx       # Scrollable trade feed
    trade-form.tsx          # Full trading form with validation
  hooks/
    hip4-provider.tsx       # React context provider
    market-price-store.ts   # Module-level price store (useSyncExternalStore)
    use-hip4-client.ts      # Client creation + caching
    use-hip4-signer.ts      # wagmi wallet adapter
    use-market.ts           # Per-market subscription (minimal rerenders)
    use-markets.ts          # All markets + live mids
    use-min-shares.ts       # Min order size computation
    use-orderbook.ts        # L2 book subscription
    use-portfolio.ts        # Balances + positions + orders
    use-recent-trades.ts    # Live trade feed
    use-trade.ts            # Order placement
  lib/
    format.ts               # Price/time/number formatters
```
