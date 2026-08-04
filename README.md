# Purrdict HIP-4 UI Registry

Public, MIT-licensed React components and hooks for building [Hyperliquid HIP-4 prediction-market](https://www.purrdict.xyz/hip4/) interfaces with shadcn/ui.

The registry uses the public [`@purrdict/hip4` TypeScript package](https://www.npmjs.com/package/@purrdict/hip4) for HIP-4 market discovery, outcome identifiers, prices, sizes, and order construction. Wallet connectivity uses wagmi and viem.

## What this repository provides

This is a source registry, not an npm package. The shadcn CLI copies the selected component and hook source into your application so you can inspect, customize, and own it.

The public registry currently exposes 24 entries: 11 UI components, 11 hooks, one formatting library, and one complete quickstart. It covers market discovery, live prices, order books, recent trades, trade entry, positions, probabilities, countdowns, and round history.

Browse every entry and its generated registry JSON at [ui.purrdict.xyz](https://ui.purrdict.xyz/).

## Install

Install the shared dependencies:

```bash
bun add @purrdict/hip4 @nktkas/hyperliquid wagmi viem
```

Add the complete working example:

```bash
npx shadcn@latest add https://ui.purrdict.xyz/r/hip4-quickstart.json
```

Or add individual entries:

```bash
npx shadcn@latest add https://ui.purrdict.xyz/r/hip4-provider.json
npx shadcn@latest add https://ui.purrdict.xyz/r/market-card.json
npx shadcn@latest add https://ui.purrdict.xyz/r/trade-form.json
npx shadcn@latest add https://ui.purrdict.xyz/r/orderbook.json
```

## Quick start

After installing the provider, market hook, and market card from the registry:

```tsx
"use client";

import { MarketCard } from "@/components/hip4/market-card";
import { HIP4Provider } from "@/hooks/hip4/hip4-provider";
import { useMarkets } from "@/hooks/hip4/use-markets";

function MarketList() {
  const { markets, mids, isLoading } = useMarkets();

  if (isLoading) return <p>Discovering HIP-4 markets…</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {markets.map((market) => (
        <MarketCard
          key={market.yesCoin}
          market={market}
          yesMid={Number(mids[market.yesCoin] ?? 0)}
        />
      ))}
    </div>
  );
}

export default function MarketsPage() {
  return (
    <HIP4Provider testnet={false}>
      <MarketList />
    </HIP4Provider>
  );
}
```

Use `testnet={true}` while developing against Hyperliquid Testnet. The current Purrdict HIP-4 guide distinguishes mainnet USDC metadata from legacy testnet records that may still expose USDH.

## Design and wallet model

- Components use standard shadcn CSS variables and remain fully editable after installation.
- Wallet integration is connector-agnostic through wagmi; the registry does not require a hosted wallet provider.
- Read-only hooks use Hyperliquid's public data interfaces. Trading requires an explicitly connected signer.
- Builder-fee configuration is optional and remains visible in the installed source.

## Developer resources

- [Build HIP-4 apps with Purrdict](https://www.purrdict.xyz/build/)
- [Purrdict HIP-4 protocol guide](https://www.purrdict.xyz/hip4/)
- [Public `@purrdict/hip4` package](https://www.npmjs.com/package/@purrdict/hip4)
- [HIP-4 UI registry](https://ui.purrdict.xyz/)
- [HIP-4 developer reference](https://hip4.fun/developers/)
- [Open HIP-4 market data](https://www.purrdict.xyz/hip4-market-data/)
- [Normalized prediction-market data from mute.sh](https://mute.sh/)
- [Trade HIP-4 markets on Purrdict](https://app.purrdict.xyz/)
- [Official Hyperliquid developer documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)

Purrdict is independent and is not affiliated with or endorsed by Hyperliquid Labs.

## License

MIT
