# Contributing to @purrdict/hip4-ui

Thanks for your interest in contributing to the HIP-4 prediction market component library.

## Getting Started

```bash
git clone https://github.com/purrdict/hip4-ui.git
cd hip4-ui
bun install
bun test
```

## Development

This is a shadcn-compatible React component library for HIP-4 prediction markets. Components use Tailwind CSS with shadcn CSS variables for theming.

### Project Structure

```
src/
  components/      React components (market-card, orderbook, trade-form, etc.)
  hooks/           React hooks (useMarket, useMarkets, useOrderbook, etc.)
  lib/             Utility functions (format.ts)
  index.ts         Barrel exports
site/              Astro docs site (ui.purrdict.xyz)
registry/          Generated shadcn registry JSONs
tests/
  unit.test.ts         Pure logic tests
  components.test.tsx  React rendering tests
  integration.test.ts  Real testnet API tests
  use-market.test.ts   Hook tests
```

### Running Tests

```bash
bun test                              # all tests
bun test tests/unit.test.ts           # unit only
bun test tests/components.test.tsx    # component rendering
bun test tests/integration.test.ts    # real testnet (needs network)
```

### Type Checking

```bash
bunx tsc --noEmit
```

### Docs Site (ui.purrdict.xyz)

```bash
cd site
bun install
bun run dev    # http://localhost:3004
```

## Pull Request Guidelines

1. **Fork and branch** — create a feature branch from `main`
2. **Keep it focused** — one component or feature per PR
3. **Add tests** — components need rendering tests, hooks need unit tests
4. **shadcn conventions** — use CSS variables (`text-foreground`, `bg-card`), not hardcoded colors
5. **All tests pass** — CI runs unit, component, AND testnet integration tests

### Component Guidelines

- `"use client"` directive on every component
- Accept `className` prop for style overrides
- Use Tailwind classes with shadcn CSS variables
- No hardcoded colors — use `text-success`, `text-destructive`, etc.
- JSDoc with usage example on every export
- Export a `Props` interface
- Pure presentation where possible — accept data via props, don't fetch

### Hook Guidelines

- Support dual approach: explicit `client` param OR `HIP4Provider` context
- Use `@nktkas/hyperliquid` for network I/O (NOT `@purrdict/hip4`)
- Use `@purrdict/hip4` only for types and pure helpers
- Proper cleanup on unmount (unsubscribe, cancel async)
- Stable return references (`useMemo`, `useCallback`) to prevent rerenders

### What We Accept

- New prediction market components (charts, tables, forms)
- Component variants and customization options
- Hook improvements (performance, new data sources)
- Bug fixes with test cases
- Documentation and preview improvements
- Accessibility improvements

### What We Don't Accept

- App-specific code (auth, routing, state management)
- Hardcoded colors or dimensions that should be customizable
- Components that fetch data internally (use hooks + props instead)
- Dependencies on specific wallet providers (stay wallet-agnostic via wagmi)

## AI-Generated Code

We welcome AI-generated contributions. Whether you used Claude, Copilot, or any other tool — if the tests pass and the code is clean, we'll review it. Just note it in your PR description.

## Questions?

Open an issue or reach out on [Discord](https://discord.gg/DV8CmHkbzk) or [@hypurrdict](https://x.com/hypurrdict) on X.
