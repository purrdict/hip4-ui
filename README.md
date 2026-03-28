# @purrdict/hip4-ui

shadcn-compatible React components for building HIP-4 prediction market UIs on Hyperliquid.

> Built on top of [@purrdict/hip4](https://github.com/purrdict/hip4-sdk) with wagmi for wallet connectivity.

---

## What's included

| Component | Description |
|-----------|-------------|
| `MarketCard` | Card showing market name, Yes/No prices, countdown |
| `MarketGrid` | Filterable responsive grid of market cards |
| `TradeForm` | Full trade form with market/limit modes, validation |
| `Orderbook` | L2 orderbook with depth visualization |
| `SettlementBanner` | Resolved market result display |
| `PositionCard` | User position with P&L |
| `CountdownTimer` | Live expiry countdown |

| Hook | Description |
|------|-------------|
| `useHIP4Client` | Creates/caches an @purrdict/hip4 client |
| `useHIP4Signer` | Adapts any wagmi wallet to SDK signer interface |
| `useMarkets` | Discovers markets + subscribes to live prices |
| `useOrderbook` | L2 book WebSocket subscription |
| `useTrade` | Place/cancel orders |
| `useMinShares` | Compute minimum order size |
| `usePortfolio` | Balances, positions, open orders |
| `useSettlement` | Detect market resolution |

---

## Install

```bash
bun add @purrdict/hip4 @nktkas/hyperliquid wagmi viem
bun add @purrdict/hip4-ui
```

Or install components individually via shadcn CLI:

```bash
npx shadcn add https://ui.purrdict.xyz/r/market-card
npx shadcn add https://ui.purrdict.xyz/r/trade-form
npx shadcn add https://ui.purrdict.xyz/r/orderbook
```

---

## Quick start

```tsx
"use client";

import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi-config"; // your own config

import {
  useHIP4Client,
  useMarkets,
  MarketGrid,
} from "@purrdict/hip4-ui";

export default function MarketsPage() {
  const client = useHIP4Client({ testnet: true });
  const { markets, mids, isLoading, error } = useMarkets(client);

  if (isLoading) return <p>Loading markets...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <MarketGrid
      markets={markets}
      mids={mids}
      onMarketClick={(m) => console.log("Selected:", m.yesCoin)}
    />
  );
}
```

---

## Trade form example

```tsx
"use client";

import {
  useHIP4Client,
  useHIP4Signer,
  useTrade,
  TradeForm,
} from "@purrdict/hip4-ui";
import type { Market } from "@purrdict/hip4";

interface Props {
  market: Market;
}

export function TradingPanel({ market }: Props) {
  const client = useHIP4Client({ testnet: true });
  const signer = useHIP4Signer();
  const { buy, sell, isSubmitting, lastResult, error } = useTrade(client, signer);

  return (
    <TradeForm
      market={market}
      side="Yes"
      currentPrice={0.55}
      minShares={20}
      isConnected={!!signer}
      onTrade={async (params) => {
        const result = await buy(params);
        console.log("Order result:", result);
      }}
    />
  );
}
```

---

## Wallet setup

Components are wallet-agnostic — use any wagmi connector:

```tsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const config = createConfig({
  chains: [arbitrum],
  connectors: [injected(), walletConnect({ projectId: "..." })],
  transports: { [arbitrum.id]: http() },
});

function App({ children }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
```

---

## Theming

Components use shadcn CSS variables. Add HIP-4 specific colors to your `globals.css`:

```css
:root {
  --hip4-positive: oklch(0.75 0.18 142);  /* green for Yes/gains */
  --hip4-negative: oklch(0.65 0.2 25);    /* red for No/losses */
  --hip4-accent: oklch(0.83 0.18 85);     /* gold accent */
}
```

---

## Builder fee

Pass an optional `builder` prop to collect fees on sell orders:

```tsx
<TradeForm
  market={market}
  side="Yes"
  builder={{
    address: "0xYourBuilderAddress",
    fee: 100, // 100 = 0.1% (tenths of a basis point)
  }}
/>
```

Builder fees apply to sell orders only (buy-side fee is always 0 on prediction markets).
The builder address must hold 100+ USDC in a Hyperliquid perps account to be approved.

---

## Resources

- [Purrdict](https://purrdict.xyz) — HIP-4 prediction market app
- [UI registry](https://ui.purrdict.xyz) — shadcn component registry
- [@purrdict/hip4](https://github.com/purrdict/hip4-sdk) — underlying SDK
- [Hyperliquid](https://hyperliquid.xyz) — underlying exchange

---

## License

MIT
