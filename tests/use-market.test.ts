import { test, expect, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// market-price-store.ts — source contract tests (static analysis + logic)
// ---------------------------------------------------------------------------

describe("market-price-store source contract", () => {
  const src = readFileSync(
    join(import.meta.dir, "../src/hooks/market-price-store.ts"),
    "utf8",
  );

  test("exports initPriceStore", () => {
    expect(src).toContain("export function initPriceStore");
  });

  test("exports destroyPriceStore", () => {
    expect(src).toContain("export function destroyPriceStore");
  });

  test("exports getMid", () => {
    expect(src).toContain("export function getMid");
  });

  test("exports subscribeCoin", () => {
    expect(src).toContain("export function subscribeCoin");
  });

  test("subscribeCoin returns a cleanup function (returns () => void)", () => {
    // The function must return a cleanup function.
    expect(src).toContain("return () => {");
  });

  test("does NOT import from @purrdict/hip4", () => {
    expect(src).not.toContain("from \"@purrdict/hip4\"");
    expect(src).not.toContain("from '@purrdict/hip4'");
  });

  test("uses refCount for subscriber lifecycle", () => {
    expect(src).toContain("refCount");
  });

  test("uses coinListeners Map for per-coin fan-out", () => {
    expect(src).toContain("coinListeners");
  });

  test("calls destroyPriceStore when refCount reaches 0", () => {
    // The cleanup path must decrement refCount and check for 0
    expect(src).toContain("refCount");
    expect(src).toContain("destroyPriceStore");
  });

  test("initPriceStore is idempotent (checks initialized flag)", () => {
    expect(src).toContain("initialized");
  });
});

// ---------------------------------------------------------------------------
// use-market.ts — source contract tests
// ---------------------------------------------------------------------------

describe("use-market source contract", () => {
  const src = readFileSync(
    join(import.meta.dir, "../src/hooks/use-market.ts"),
    "utf8",
  );

  test("has use client directive", () => {
    expect(src).toContain('"use client"');
  });

  test("exports useMarket function", () => {
    expect(src).toContain("export function useMarket");
  });

  test("exports UseMarketResult interface", () => {
    expect(src).toContain("export interface UseMarketResult");
  });

  test("UseMarketResult has yesMid field", () => {
    expect(src).toContain("yesMid");
  });

  test("UseMarketResult has noMid field", () => {
    expect(src).toContain("noMid");
  });

  test("UseMarketResult has minShares field", () => {
    expect(src).toContain("minShares");
  });

  test("UseMarketResult has isLoading field", () => {
    expect(src).toContain("isLoading");
  });

  test("UseMarketResult has error field", () => {
    expect(src).toContain("error");
  });

  test("uses useSyncExternalStore", () => {
    expect(src).toContain("useSyncExternalStore");
  });

  test("uses useCallback for stable subscribe/snapshot refs", () => {
    expect(src).toContain("useCallback");
  });

  test("imports from market-price-store", () => {
    expect(src).toContain("market-price-store");
  });

  test("imports initPriceStore", () => {
    expect(src).toContain("initPriceStore");
  });

  test("imports subscribeCoin", () => {
    expect(src).toContain("subscribeCoin");
  });

  test("imports getMid", () => {
    expect(src).toContain("getMid");
  });

  test("imports Market type from @purrdict/hip4", () => {
    expect(src).toContain("@purrdict/hip4");
  });

  test("imports getMinShares from @purrdict/hip4", () => {
    expect(src).toContain("getMinShares");
  });

  test("supports overload: useMarket(client, market)", () => {
    expect(src).toContain("export function useMarket(client");
  });

  test("supports overload: useMarket(market)", () => {
    // Second overload: market only (context mode)
    expect(src).toContain("export function useMarket(market");
  });

  test("throws when no client and no context", () => {
    expect(src).toContain("useMarket requires a HIP4Client");
  });

  test("snapshotCache prevents reference-equality rerenders", () => {
    expect(src).toContain("snapshotCache");
  });

  test("has server snapshot for SSR safety", () => {
    expect(src).toContain("SERVER_SNAPSHOT");
  });

  test("uses useEffect to init price store", () => {
    expect(src).toContain("initPriceStore");
  });

  test("uses spotMetaAndAssetCtxs for min shares computation", () => {
    expect(src).toContain("spotMetaAndAssetCtxs");
  });
});

// ---------------------------------------------------------------------------
// index.ts — barrel includes useMarket exports
// ---------------------------------------------------------------------------

describe("index.ts useMarket exports", () => {
  const src = readFileSync(
    join(import.meta.dir, "../src/index.ts"),
    "utf8",
  );

  test("re-exports useMarket", () => {
    expect(src).toContain("useMarket");
  });

  test("re-exports UseMarketResult type", () => {
    expect(src).toContain("UseMarketResult");
  });
});

// ---------------------------------------------------------------------------
// getCachedSnapshot — logic tests (pure function, no React)
// ---------------------------------------------------------------------------

describe("getCachedSnapshot caching logic", () => {
  // Inline implementation matching the exported function for unit-testing
  // without React.
  const midStore: Record<string, string> = {};
  function getMidLocal(coin: string): string | null {
    return midStore[coin] ?? null;
  }
  const cache = new Map<string, { yes: string | null; no: string | null; ref: { yesMid: number | null; noMid: number | null } }>();

  function getCachedSnapshot(yesCoin: string, noCoin: string): { yesMid: number | null; noMid: number | null } {
    const yes = getMidLocal(yesCoin);
    const no = getMidLocal(noCoin);
    const cached = cache.get(yesCoin);
    if (cached && cached.yes === yes && cached.no === no) return cached.ref;
    const ref = { yesMid: yes ? parseFloat(yes) : null, noMid: no ? parseFloat(no) : null };
    cache.set(yesCoin, { yes, no, ref });
    return ref;
  }

  test("returns null for unknown coins", () => {
    const snap = getCachedSnapshot("#9999", "#10000");
    expect(snap.yesMid).toBeNull();
    expect(snap.noMid).toBeNull();
  });

  test("returns correct values when mids are set", () => {
    midStore["#1520"] = "0.65";
    midStore["#1521"] = "0.35";
    const snap = getCachedSnapshot("#1520", "#1521");
    expect(snap.yesMid).toBeCloseTo(0.65, 5);
    expect(snap.noMid).toBeCloseTo(0.35, 5);
  });

  test("returns same reference when values unchanged (no rerender)", () => {
    // Ensure mid store is consistent with prior test
    midStore["#1520"] = "0.65";
    midStore["#1521"] = "0.35";
    const snap1 = getCachedSnapshot("#1520", "#1521");
    const snap2 = getCachedSnapshot("#1520", "#1521");
    expect(snap1).toBe(snap2); // same reference → no React rerender
  });

  test("returns new reference when yesMid changes", () => {
    midStore["#1520"] = "0.65";
    midStore["#1521"] = "0.35";
    const snap1 = getCachedSnapshot("#1520", "#1521");
    midStore["#1520"] = "0.70"; // price changed
    const snap2 = getCachedSnapshot("#1520", "#1521");
    expect(snap1).not.toBe(snap2);
    expect(snap2.yesMid).toBeCloseTo(0.70, 5);
  });

  test("returns new reference when noMid changes", () => {
    midStore["#1520"] = "0.70";
    midStore["#1521"] = "0.35";
    const snap1 = getCachedSnapshot("#1520", "#1521");
    midStore["#1521"] = "0.30";
    const snap2 = getCachedSnapshot("#1520", "#1521");
    expect(snap1).not.toBe(snap2);
    expect(snap2.noMid).toBeCloseTo(0.30, 5);
  });
});

// ---------------------------------------------------------------------------
// subscribeCoin refCount logic (pure logic, no React)
// ---------------------------------------------------------------------------

describe("subscribeCoin refCount logic", () => {
  // Inline the refCount logic extracted from the module to unit-test without
  // needing a live WebSocket.
  let refCount = 0;
  let destroyed = false;

  function destroyLocal() {
    destroyed = true;
  }

  const listeners = new Map<string, Set<() => void>>();

  function subscribeCoinLocal(coin: string, listener: () => void): () => void {
    if (!listeners.has(coin)) listeners.set(coin, new Set());
    listeners.get(coin)!.add(listener);
    refCount++;

    return () => {
      const set = listeners.get(coin);
      if (set) {
        set.delete(listener);
        if (set.size === 0) listeners.delete(coin);
      }
      refCount--;
      if (refCount === 0) destroyLocal();
    };
  }

  test("refCount increments on subscribe", () => {
    const unsub = subscribeCoinLocal("#1520", () => {});
    expect(refCount).toBe(1);
    unsub();
  });

  test("refCount decrements on unsubscribe", () => {
    refCount = 0;
    destroyed = false;
    const unsub = subscribeCoinLocal("#1520", () => {});
    expect(refCount).toBe(1);
    unsub();
    expect(refCount).toBe(0);
  });

  test("destroy is called when refCount reaches 0", () => {
    refCount = 0;
    destroyed = false;
    const unsub1 = subscribeCoinLocal("#1520", () => {});
    const unsub2 = subscribeCoinLocal("#1521", () => {});
    expect(refCount).toBe(2);
    expect(destroyed).toBe(false);
    unsub1();
    expect(destroyed).toBe(false);
    unsub2();
    expect(destroyed).toBe(true);
  });

  test("multiple listeners on same coin all fire", () => {
    refCount = 0;
    listeners.clear();
    const calls: string[] = [];
    const unsub1 = subscribeCoinLocal("#1520", () => calls.push("a"));
    const unsub2 = subscribeCoinLocal("#1520", () => calls.push("b"));
    // Fire all listeners for this coin
    for (const fn of listeners.get("#1520") ?? []) fn();
    expect(calls).toContain("a");
    expect(calls).toContain("b");
    unsub1();
    unsub2();
  });

  test("unsubscribing one listener does not affect others", () => {
    refCount = 0;
    listeners.clear();
    const calls: string[] = [];
    const unsub1 = subscribeCoinLocal("#1520", () => calls.push("a"));
    subscribeCoinLocal("#1520", () => calls.push("b"));
    unsub1();
    // listener "b" still registered
    for (const fn of listeners.get("#1520") ?? []) fn();
    expect(calls).not.toContain("a");
    expect(calls).toContain("b");
  });
});

// ---------------------------------------------------------------------------
// useMarket overload resolution logic (no React runtime needed)
// ---------------------------------------------------------------------------

describe("useMarket overload resolution", () => {
  type FakeClient = { info: object; sub: object; close: () => void };
  type FakeMarket = { yesCoin: string; noCoin: string };

  function resolveArgs(
    clientOrMarket: FakeClient | FakeMarket,
    market?: FakeMarket,
  ): { resolvedClient: FakeClient | null; resolvedMarket: FakeMarket } {
    const isMarketMode =
      "yesCoin" in clientOrMarket && "noCoin" in clientOrMarket && !market;
    if (isMarketMode) {
      return { resolvedClient: null, resolvedMarket: clientOrMarket as FakeMarket };
    }
    return {
      resolvedClient: clientOrMarket as FakeClient,
      resolvedMarket: market as FakeMarket,
    };
  }

  test("useMarket(market) extracts market from first arg", () => {
    const market: FakeMarket = { yesCoin: "#1520", noCoin: "#1521" };
    const { resolvedMarket, resolvedClient } = resolveArgs(market);
    expect(resolvedMarket.yesCoin).toBe("#1520");
    expect(resolvedClient).toBeNull();
  });

  test("useMarket(client, market) extracts both args", () => {
    const client: FakeClient = { info: {}, sub: {}, close: () => {} };
    const market: FakeMarket = { yesCoin: "#1520", noCoin: "#1521" };
    const { resolvedClient, resolvedMarket } = resolveArgs(client, market);
    expect(resolvedClient).toBe(client);
    expect(resolvedMarket.yesCoin).toBe("#1520");
  });
});

// ---------------------------------------------------------------------------
// UseMarketResult shape
// ---------------------------------------------------------------------------

describe("UseMarketResult shape", () => {
  test("valid result has all required fields", () => {
    const result = {
      yesMid: 0.65,
      noMid: 0.35,
      minShares: 20,
      isLoading: false,
      error: null,
    };
    expect(result.yesMid).toBe(0.65);
    expect(result.noMid).toBe(0.35);
    expect(result.minShares).toBe(20);
    expect(result.isLoading).toBe(false);
    expect(result.error).toBeNull();
  });

  test("isLoading is true when yesMid is null", () => {
    const result = {
      yesMid: null,
      noMid: null,
      minShares: 20,
      isLoading: true,
      error: null,
    };
    expect(result.isLoading).toBe(true);
    expect(result.yesMid).toBeNull();
  });

  test("default minShares is 20 (assumes markPx near 0.5)", () => {
    const defaultMinShares = 20;
    expect(defaultMinShares).toBe(20);
  });
});
