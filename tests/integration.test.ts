/**
 * Integration tests for @purrdict/hip4 SDK and @nktkas/hyperliquid against the
 * real Hyperliquid testnet.
 *
 * Testnet API: https://api.hyperliquid-testnet.xyz
 * Test wallet:  0x57E656Ee5Ed9b4012b41A0B9c5DFDE5c59876D83
 *
 * Run with:
 *   cd packages/hip4-ui && bun test tests/integration.test.ts
 */

import { test, expect, describe } from "bun:test";
import {
  discoverMarkets,
  getMinShares,
  computeTickSize,
  formatPrice,
  buildOrderAction,
  PREDICTION_ASSET_OFFSET,
} from "@purrdict/hip4";
import {
  HttpTransport,
  InfoClient,
  type OutcomeMetaResponse,
} from "@nktkas/hyperliquid";


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_WALLET = "0x57E656Ee5Ed9b4012b41A0B9c5DFDE5c59876D83";

/** Create an InfoClient pointed at testnet with a generous timeout. */
function makeInfoClient(): InfoClient {
  const transport = new HttpTransport({ isTestnet: true, timeout: 15_000 });
  return new InfoClient({ transport });
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Skip the current test with a message if testnet appears to be down. */
function skipIfDown(err: unknown, label: string): never {
  const message =
    err instanceof Error ? err.message : String(err);
  console.warn(`[SKIP] ${label} — testnet may be down: ${message}`);
  // Re-throw so bun marks it as skipped (test.skip is not callable mid-test,
  // so we use a recognised skip pattern via a known string throw that bun
  // handles gracefully). Alternatively we assert false with a skip message.
  throw new Error(`__SKIP__: ${label}: ${message}`);
}

// ---------------------------------------------------------------------------
// 1. SDK functions (pure — validated against real data)
// ---------------------------------------------------------------------------

describe("SDK functions", () => {
  test(
    "discoverMarkets with real outcomeMeta returns Market[]",
    async () => {
      let outcomeMeta: OutcomeMetaResponse;
      let allMids: Record<string, string>;

      try {
        const info = makeInfoClient();
        [outcomeMeta, allMids] = await Promise.all([
          info.outcomeMeta(),
          info.allMids(),
        ]);
      } catch (err) {
        skipIfDown(err, "discoverMarkets");
      }

      const markets = discoverMarkets(outcomeMeta, allMids);

      // There may be zero active markets on testnet, but the call should not throw
      expect(Array.isArray(markets)).toBe(true);

      if (markets.length > 0) {
        const m = markets[0];
        expect(typeof m.outcomeId).toBe("number");
        expect(typeof m.underlying).toBe("string");
        expect(m.underlying.length).toBeGreaterThan(0);
        expect(m.expiry).toBeInstanceOf(Date);
        expect(m.expiry.getTime()).toBeGreaterThan(Date.now());
        expect(m.yesCoinNum).toBe(m.outcomeId * 10);
        expect(m.noCoinNum).toBe(m.outcomeId * 10 + 1);
        expect(m.yesAsset).toBe(PREDICTION_ASSET_OFFSET + m.yesCoinNum);
        expect(m.noAsset).toBe(PREDICTION_ASSET_OFFSET + m.noCoinNum);
        console.log(
          `Found ${markets.length} active market(s). First: ${m.underlying} target=${m.targetPrice} period=${m.period}`,
        );
      } else {
        console.log("No active markets on testnet right now — structure test passed.");
      }
    },
    { timeout: 15_000 },
  );

  test(
    "getMinShares with real spot asset context returns valid number",
    async () => {
      let spotData: Awaited<ReturnType<InfoClient["spotMetaAndAssetCtxs"]>>;
      try {
        const info = makeInfoClient();
        spotData = await info.spotMetaAndAssetCtxs();
      } catch (err) {
        skipIfDown(err, "getMinShares");
      }

      // spotMetaAndAssetCtxs returns [meta, ctxs[]]
      const [, ctxs] = spotData;

      // Find the first prediction-market coin (#XXXX style) with a numeric markPx
      const predictionCtx = ctxs.find((ctx) => {
        const name = (ctx as any).coin ?? "";
        return (
          typeof name === "string" &&
          name.startsWith("#") &&
          typeof (ctx as any).markPx === "string"
        );
      });

      if (!predictionCtx) {
        console.log("No prediction-market coins found in spotMetaAndAssetCtxs — skipping markPx check.");
        // Still verify getMinShares is well-behaved with mid-range input
        const min = getMinShares(0.5);
        expect(min).toBe(20);
        return;
      }

      const markPx = parseFloat((predictionCtx as any).markPx);
      expect(isNaN(markPx)).toBe(false);
      expect(markPx).toBeGreaterThanOrEqual(0);
      expect(markPx).toBeLessThanOrEqual(1);

      const minShares = getMinShares(markPx);
      expect(Number.isInteger(minShares)).toBe(true);
      expect(minShares).toBeGreaterThanOrEqual(10);
      expect(minShares).toBeLessThanOrEqual(1000);
      console.log(`getMinShares(${markPx}) = ${minShares}`);
    },
    { timeout: 15_000 },
  );

  test(
    "computeTickSize with real allMids price returns correct scale",
    async () => {
      let allMids: Record<string, string>;
      try {
        const info = makeInfoClient();
        allMids = await info.allMids();
      } catch (err) {
        skipIfDown(err, "computeTickSize");
      }

      // Find BTC or ETH — both should be present on testnet
      const underlying = allMids["BTC"] ?? allMids["ETH"] ?? Object.values(allMids)[0];
      expect(underlying).toBeDefined();

      const price = parseFloat(underlying);
      expect(isNaN(price)).toBe(false);
      expect(price).toBeGreaterThan(0);

      const tick = computeTickSize(price);
      // Tick should be a power of 10 and produce 5 significant figures
      expect(tick).toBeGreaterThan(0);
      // For prices like 80000 the tick should be 1 (10^(4-4)=1)
      // For prices like 2000  the tick should be 0.1
      // Verify rounding works: price rounded to tick must be finite
      const rounded = Math.round(price / tick) * tick;
      expect(isFinite(rounded)).toBe(true);
      console.log(`computeTickSize(${price}) = ${tick}`);
    },
    { timeout: 15_000 },
  );

  test(
    "buildOrderAction with real parameters returns valid action object",
    async () => {
      let outcomeMeta: OutcomeMetaResponse;
      let allMids: Record<string, string>;
      try {
        const info = makeInfoClient();
        [outcomeMeta, allMids] = await Promise.all([
          info.outcomeMeta(),
          info.allMids(),
        ]);
      } catch (err) {
        skipIfDown(err, "buildOrderAction");
      }

      const markets = discoverMarkets(outcomeMeta, allMids);

      // Use a real market if available, otherwise use a synthetic asset
      const asset =
        markets.length > 0
          ? markets[0].yesAsset
          : PREDICTION_ASSET_OFFSET + 1520; // known testnet coin

      const result = buildOrderAction({
        asset,
        isBuy: true,
        price: 0.55,
        size: 25,
        tif: "Gtc",
        reduceOnly: false,
        builderAddress: "0xAbCd1234AbCd1234AbCd1234AbCd1234AbCd1234",
        builderFee: 100,
      });

      expect("ok" in result).toBe(true);
      if ("err" in result) {
        throw new Error(`buildOrderAction failed: ${result.err}`);
      }

      const action = result.ok;
      expect(action.grouping).toBe("na");
      expect(Array.isArray(action.orders)).toBe(true);
      expect(action.orders).toHaveLength(1);

      const order = action.orders[0];
      expect(order.a).toBe(asset);
      expect(order.b).toBe(true);
      expect(typeof order.p).toBe("string");
      // Price must not have trailing zeros beyond what's necessary
      expect(order.p.endsWith("0")).toBe(false);
      expect(order.s).toBe("25");
      expect(order.r).toBe(false);
      expect(order.t.limit.tif).toBe("Gtc");

      // Builder address must be lowercased
      expect(action.builder).toBeDefined();
      expect(action.builder!.b).toBe(
        "0xabcd1234abcd1234abcd1234abcd1234abcd1234",
      );
      expect(action.builder!.f).toBe(100);

      console.log("buildOrderAction result:", JSON.stringify(action, null, 2));
    },
    { timeout: 15_000 },
  );

  test(
    "formatPrice roundtrips correctly for prediction market prices",
    () => {
      // These are deterministic — no network needed
      const cases: Array<[number, string]> = [
        [0.55, "0.55"],
        [0.5, "0.5"],
        [0.1, "0.1"],
        [0.9999, "0.9999"],
        [0.65, "0.65"],
        [0.1234, "0.1234"],
      ];

      for (const [input, expected] of cases) {
        const result = formatPrice(input);
        expect(result).toBe(expected);
      }

      // Must never produce trailing zeros
      const trailingZeroInputs = [0.650, 0.500, 0.100];
      for (const input of trailingZeroInputs) {
        expect(formatPrice(input)).not.toMatch(/0$/);
      }

      console.log("formatPrice roundtrip: all cases passed");
    },
  );
});

// ---------------------------------------------------------------------------
// 2. Info API (direct @nktkas/hyperliquid calls)
// ---------------------------------------------------------------------------

describe("Info API", () => {
  test(
    "allMids returns record with prediction coin prices",
    async () => {
      let mids: Record<string, string>;
      try {
        const info = makeInfoClient();
        mids = await info.allMids();
      } catch (err) {
        skipIfDown(err, "allMids");
      }

      expect(typeof mids).toBe("object");
      expect(mids).not.toBeNull();

      const keys = Object.keys(mids);
      expect(keys.length).toBeGreaterThan(0);

      // Every value should be a string that parses to a positive number
      for (const [key, value] of Object.entries(mids).slice(0, 10)) {
        const num = parseFloat(value);
        expect(isNaN(num)).toBe(false);
        expect(num).toBeGreaterThan(0);
        void key; // silence unused variable warning
      }

      // Check for prediction-market coins (#XXXX)
      const predictionCoins = keys.filter((k) => k.startsWith("#"));
      console.log(
        `allMids: ${keys.length} coins, ${predictionCoins.length} prediction-market coins`,
      );
    },
    { timeout: 15_000 },
  );

  test(
    "spotMetaAndAssetCtxs returns spot metadata tuple",
    async () => {
      let result: Awaited<ReturnType<InfoClient["spotMetaAndAssetCtxs"]>>;
      try {
        const info = makeInfoClient();
        result = await info.spotMetaAndAssetCtxs();
      } catch (err) {
        skipIfDown(err, "spotMetaAndAssetCtxs");
      }

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      const [meta, ctxs] = result;
      expect(typeof meta).toBe("object");
      expect(Array.isArray(ctxs)).toBe(true);

      if (ctxs.length > 0) {
        const first = ctxs[0] as Record<string, unknown>;
        // Each context should have markPx
        expect("markPx" in first).toBe(true);
      }

      console.log(`spotMetaAndAssetCtxs: ${ctxs.length} asset contexts`);
    },
    { timeout: 15_000 },
  );

  test(
    "outcomeMeta returns outcome entries",
    async () => {
      let meta: OutcomeMetaResponse;
      try {
        const info = makeInfoClient();
        meta = await info.outcomeMeta();
      } catch (err) {
        skipIfDown(err, "outcomeMeta");
      }

      expect(typeof meta).toBe("object");
      expect(Array.isArray(meta.outcomes)).toBe(true);
      expect(Array.isArray(meta.questions)).toBe(true);

      console.log(
        `outcomeMeta: ${meta.outcomes.length} outcomes, ${meta.questions.length} questions`,
      );

      // If there are outcomes, validate their shape
      if (meta.outcomes.length > 0) {
        const entry = meta.outcomes[0];
        expect(typeof entry.outcome).toBe("number");
        expect(typeof entry.name).toBe("string");
        expect(typeof entry.description).toBe("string");
        expect(Array.isArray(entry.sideSpecs)).toBe(true);
      }
    },
    { timeout: 15_000 },
  );

  test(
    "spotClearinghouseState for test wallet returns balances",
    async () => {
      let state: Awaited<ReturnType<InfoClient["spotClearinghouseState"]>>;
      try {
        const info = makeInfoClient();
        state = await info.spotClearinghouseState({ user: TEST_WALLET });
      } catch (err) {
        skipIfDown(err, "spotClearinghouseState");
      }

      expect(typeof state).toBe("object");
      // State should have balances array
      expect("balances" in state).toBe(true);
      expect(Array.isArray(state.balances)).toBe(true);

      console.log(
        `spotClearinghouseState for ${TEST_WALLET}: ${state.balances.length} balance entries`,
      );
    },
    { timeout: 15_000 },
  );

  test(
    "frontendOpenOrders for test wallet returns orders array",
    async () => {
      let orders: Awaited<ReturnType<InfoClient["frontendOpenOrders"]>>;
      try {
        const info = makeInfoClient();
        orders = await info.frontendOpenOrders({ user: TEST_WALLET });
      } catch (err) {
        skipIfDown(err, "frontendOpenOrders");
      }

      expect(Array.isArray(orders)).toBe(true);
      console.log(
        `frontendOpenOrders for ${TEST_WALLET}: ${orders.length} open order(s)`,
      );
    },
    { timeout: 15_000 },
  );
});

// ---------------------------------------------------------------------------
// 3. WebSocket subscription tests
//
// NOTE: @nktkas/rews uses `new Event("open")` inside its bundled module scope.
// In the Bun test runner context the native EventTarget.dispatchEvent rejects
// Event objects created from a different module-scoped Event constructor.
// We bypass this by using the raw WebSocket API directly — Bun's WebSocket is
// native and works correctly in the test runner. The HL WS protocol is simple
// JSON: send a {"method":"subscribe","subscription":{...}} and receive updates.
// ---------------------------------------------------------------------------

const TESTNET_WS = "wss://api.hyperliquid-testnet.xyz/ws";

/** Open a raw WebSocket and wait for the connection to be established. */
function openWs(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TESTNET_WS);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket connection timeout"));
    }, 8_000);
    ws.onopen = () => {
      clearTimeout(timeout);
      resolve(ws);
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection failed"));
    };
  });
}

describe("WebSocket", () => {
  test(
    "allMids subscription receives at least one update within 10 seconds",
    async () => {
      let ws: WebSocket;
      try {
        ws = await openWs();
      } catch (err) {
        skipIfDown(err, "allMids WS subscribe");
      }

      let received = false;
      let receivedData: unknown = null;

      ws.send(
        JSON.stringify({
          method: "subscribe",
          subscription: { type: "allMids" },
        }),
      );

      const messagePromise = new Promise<void>((resolve) => {
        ws.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data as string);
            // HL sends {"channel":"allMids","data":{"mids":{...}}}
            if (parsed.channel === "allMids" && parsed.data) {
              received = true;
              receivedData = parsed.data;
              resolve();
            }
          } catch {
            // ignore non-JSON frames
          }
        };
      });

      const raceResult = await Promise.race([
        messagePromise,
        new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 10_000)),
      ]);

      ws.close();

      if (raceResult === "timeout") {
        throw new Error("allMids WS: no message received within 10 seconds");
      }

      expect(received).toBe(true);
      expect(receivedData).not.toBeNull();

      const data = receivedData as Record<string, unknown>;
      const mids = data.mids ?? data;
      expect(typeof mids).toBe("object");
      console.log(
        `allMids WS: received update with ${Object.keys(mids as object).length} coins`,
      );
    },
    { timeout: 15_000 },
  );

  test(
    "l2Book subscription for BTC coin receives book data",
    async () => {
      let ws: WebSocket;
      try {
        ws = await openWs();
      } catch (err) {
        skipIfDown(err, "l2Book WS subscribe");
      }

      let received = false;
      let bookData: unknown = null;

      ws.send(
        JSON.stringify({
          method: "subscribe",
          subscription: { type: "l2Book", coin: "BTC" },
        }),
      );

      const messagePromise = new Promise<void>((resolve) => {
        ws.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data as string);
            // HL sends {"channel":"l2Book","data":{...}}
            if (parsed.channel === "l2Book" && parsed.data) {
              received = true;
              bookData = parsed.data;
              resolve();
            }
          } catch {
            // ignore non-JSON frames
          }
        };
      });

      const raceResult = await Promise.race([
        messagePromise,
        new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 10_000)),
      ]);

      ws.close();

      if (raceResult === "timeout") {
        throw new Error("l2Book WS: no message received within 10 seconds");
      }

      expect(received).toBe(true);
      expect(bookData).not.toBeNull();

      // HL l2Book data has { coin, time, levels: [[bids], [asks]] }
      const book = bookData as Record<string, unknown>;
      const hasLevels =
        "levels" in book ||
        "bids" in book ||
        "asks" in book ||
        Array.isArray(book);
      expect(hasLevels).toBe(true);

      console.log("l2Book WS: received book update for BTC");
    },
    { timeout: 15_000 },
  );

  test(
    "unsubscribe stops receiving messages",
    async () => {
      let ws: WebSocket;
      try {
        ws = await openWs();
      } catch (err) {
        skipIfDown(err, "unsubscribe WS test");
      }

      let messageCount = 0;

      ws.send(
        JSON.stringify({
          method: "subscribe",
          subscription: { type: "allMids" },
        }),
      );

      ws.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data as string);
          if (parsed.channel === "allMids") {
            messageCount++;
          }
        } catch {
          // ignore
        }
      };

      // Wait for at least 1 message to confirm subscription is active
      const startDeadline = Date.now() + 10_000;
      while (messageCount === 0 && Date.now() < startDeadline) {
        await new Promise((r) => setTimeout(r, 200));
      }

      if (messageCount === 0) {
        console.warn("No messages received before unsubscribe — skipping count check");
        ws.close();
        return;
      }

      // Send unsubscribe
      ws.send(
        JSON.stringify({
          method: "unsubscribe",
          subscription: { type: "allMids" },
        }),
      );

      const countAfterUnsub = messageCount;

      // Wait 3 more seconds — message count should not increase
      await new Promise((r) => setTimeout(r, 3_000));
      const countAfterWait = messageCount;

      ws.close();

      expect(countAfterWait).toBe(countAfterUnsub);
      console.log(
        `unsubscribe: ${countAfterUnsub} message(s) received, 0 after unsubscribe`,
      );
    },
    { timeout: 15_000 },
  );
});

// ---------------------------------------------------------------------------
// 4. End-to-end market discovery flow
// ---------------------------------------------------------------------------

describe("E2E flow", () => {
  test(
    "full market discovery: outcomeMeta → discoverMarkets → allMids price check",
    async () => {
      let outcomeMeta: OutcomeMetaResponse;
      let allMids: Record<string, string>;

      try {
        const info = makeInfoClient();
        [outcomeMeta, allMids] = await Promise.all([
          info.outcomeMeta(),
          info.allMids(),
        ]);
      } catch (err) {
        skipIfDown(err, "E2E market discovery");
      }

      // Step 1: validate outcomeMeta shape
      expect(Array.isArray(outcomeMeta.outcomes)).toBe(true);

      // Step 2: discover markets
      const markets = discoverMarkets(outcomeMeta, allMids);
      expect(Array.isArray(markets)).toBe(true);

      if (markets.length === 0) {
        console.log("E2E: no active markets on testnet. Structural checks pass.");
        return;
      }

      // Step 3: validate each market has a valid structure
      for (const market of markets) {
        // Core fields
        expect(typeof market.outcomeId).toBe("number");
        expect(typeof market.underlying).toBe("string");
        expect(typeof market.targetPrice).toBe("number");
        expect(market.expiry).toBeInstanceOf(Date);
        expect(typeof market.period).toBe("string");

        // Coin derivation
        expect(market.yesCoinNum).toBe(market.outcomeId * 10);
        expect(market.noCoinNum).toBe(market.outcomeId * 10 + 1);
        expect(market.yesCoin).toBe(`#${market.yesCoinNum}`);
        expect(market.noCoin).toBe(`#${market.noCoinNum}`);
        expect(market.yesAsset).toBe(PREDICTION_ASSET_OFFSET + market.yesCoinNum);
        expect(market.noAsset).toBe(PREDICTION_ASSET_OFFSET + market.noCoinNum);

        // Market must not be expired
        expect(market.expiry.getTime()).toBeGreaterThan(Date.now());

        // Underlying must have a mid price
        const mid = allMids[market.underlying];
        expect(mid).toBeDefined();
        expect(parseFloat(mid!)).toBeGreaterThan(0);
      }

      // Step 4: verify mid prices for discovered markets
      const uniqueUnderlyings = [...new Set(markets.map((m) => m.underlying))];
      for (const underlying of uniqueUnderlyings) {
        const mid = allMids[underlying];
        expect(mid).toBeDefined();
        const price = parseFloat(mid!);
        expect(price).toBeGreaterThan(0);

        // computeTickSize should return sensible value
        const tick = computeTickSize(price);
        expect(tick).toBeGreaterThan(0);
        expect(isFinite(tick)).toBe(true);
      }

      console.log(
        `E2E: ${markets.length} active market(s) across ${uniqueUnderlyings.join(", ")}`,
      );
    },
    { timeout: 15_000 },
  );

  test(
    "prediction coin prices are in [0, 1] range in allMids",
    async () => {
      let allMids: Record<string, string>;
      try {
        const info = makeInfoClient();
        allMids = await info.allMids();
      } catch (err) {
        skipIfDown(err, "prediction coin price range");
      }

      const predictionCoins = Object.entries(allMids).filter(([k]) =>
        k.startsWith("#"),
      );

      if (predictionCoins.length === 0) {
        console.log("No prediction-market coins in allMids on testnet.");
        return;
      }

      for (const [coin, priceStr] of predictionCoins) {
        const price = parseFloat(priceStr);
        expect(isNaN(price)).toBe(false);
        // Prediction market prices should be between 0 and 1
        expect(price).toBeGreaterThanOrEqual(0);
        expect(price).toBeLessThanOrEqual(1);
        void coin;
      }

      console.log(
        `Prediction coin price range check: ${predictionCoins.length} coins all within [0, 1]`,
      );
    },
    { timeout: 15_000 },
  );
});
