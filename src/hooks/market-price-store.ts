/**
 * Market price store — module-level singleton for efficient per-coin price subscriptions.
 *
 * Manages a single allMids WebSocket subscription shared across all useMarket instances.
 * Fan-out per-coin to individual listeners so components only rerender for their market.
 *
 * Design notes:
 * - Does NOT import from @purrdict/hip4 — pure @nktkas/hyperliquid + stdlib
 * - initPriceStore is idempotent: safe to call from multiple useEffect instances
 * - destroyPriceStore is called automatically when all subscribers unsubscribe (refCount=0)
 * - Per-coin fan-out: only fires listeners for coins whose price actually changed
 */

import type { InfoClient, SubscriptionClient, ISubscription } from "@nktkas/hyperliquid";

// ---------------------------------------------------------------------------
// Internal mutable state (NOT React state)
// ---------------------------------------------------------------------------

let midsMap: Record<string, string> = {};
const coinListeners = new Map<string, Set<() => void>>();
let refCount = 0;
let allMidsSub: ISubscription | null = null;
let initialized = false;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Notify all listeners for a given coin */
function notifyCoin(coin: string): void {
  const set = coinListeners.get(coin);
  if (set) {
    for (const listener of set) {
      listener();
    }
  }
}

/** Process an allMids update, firing only changed-coin listeners */
function handleMidsUpdate(mids: Record<string, string>): void {
  const changedCoins: string[] = [];

  for (const [coin, price] of Object.entries(mids)) {
    if (midsMap[coin] !== price) {
      midsMap[coin] = price;
      changedCoins.push(coin);
    }
  }

  for (const coin of changedCoins) {
    notifyCoin(coin);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the price store with a Hyperliquid SubscriptionClient.
 * Idempotent — safe to call multiple times; only initializes on first call.
 *
 * 1. Fetches initial allMids via info.allMids()
 * 2. Subscribes to allMids WS via sub.allMids()
 * 3. On each update: compares per-coin, only fires listeners for changed coins
 */
export function initPriceStore(sub: SubscriptionClient, info: InfoClient): void {
  if (initialized) return;
  initialized = true;

  // Fetch initial snapshot — fire listeners once populated
  info.allMids().then((initialMids) => {
    for (const [coin, price] of Object.entries(initialMids)) {
      midsMap[coin] = price;
    }
    // Notify all currently-subscribed coins with the initial data
    for (const coin of coinListeners.keys()) {
      notifyCoin(coin);
    }
  }).catch(() => {
    // Ignore initial fetch errors — WS stream will populate state
  });

  // Subscribe to live allMids stream
  sub.allMids((event) => {
    handleMidsUpdate(event.mids);
  }).then((subscription) => {
    allMidsSub = subscription;
  }).catch(() => {
    // If WS subscription fails, mark as uninitialized so next call can retry
    initialized = false;
  });
}

/**
 * Tear down the price store: unsubscribe from WS and reset all state.
 * Called automatically when the last subscriber unsubscribes (refCount === 0).
 */
export function destroyPriceStore(): void {
  if (allMidsSub) {
    allMidsSub.unsubscribe().catch(() => undefined);
    allMidsSub = null;
  }
  midsMap = {};
  initialized = false;
  // Note: coinListeners is NOT cleared here — subscribers manage their own cleanup.
  // refCount is managed externally by subscribeCoin.
}

/**
 * Get the current mid price string for a coin, or null if not yet received.
 *
 * @param coin - Coin name, e.g. "#1520"
 */
export function getMid(coin: string): string | null {
  return midsMap[coin] ?? null;
}

/**
 * Subscribe a listener to price updates for a specific coin.
 * Returns a cleanup function compatible with useSyncExternalStore.
 *
 * The cleanup function:
 * - Removes the listener from the coin's set
 * - Decrements refCount
 * - Calls destroyPriceStore() when refCount reaches 0
 *
 * @param coin     - Coin name, e.g. "#1520"
 * @param listener - Called whenever this coin's price changes
 */
export function subscribeCoin(coin: string, listener: () => void): () => void {
  if (!coinListeners.has(coin)) {
    coinListeners.set(coin, new Set());
  }
  coinListeners.get(coin)!.add(listener);
  refCount++;

  return () => {
    const set = coinListeners.get(coin);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        coinListeners.delete(coin);
      }
    }
    refCount--;
    if (refCount === 0) {
      destroyPriceStore();
    }
  };
}
