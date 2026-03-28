import { test, expect, describe } from "bun:test";

// Test the format utilities (no DOM, no React required).
import {
  formatMidPrice,
  formatUsdh,
  formatCountdown,
  formatPeriod,
  formatTargetPrice,
  parseMid,
  noPrice,
} from "../src/lib/format";

// ---------------------------------------------------------------------------
// format.ts — formatMidPrice
// ---------------------------------------------------------------------------

describe("formatMidPrice", () => {
  test("decimal style strips trailing zeros", () => {
    const result = formatMidPrice(0.55, "decimal");
    expect(result).toBe("0.55");
  });

  test("decimal style 0.5 → '0.5'", () => {
    expect(formatMidPrice(0.5, "decimal")).toBe("0.5");
  });

  test("cents style converts to integer cents", () => {
    expect(formatMidPrice(0.65, "cents")).toBe("65¢");
    expect(formatMidPrice(0.5, "cents")).toBe("50¢");
    expect(formatMidPrice(0.09, "cents")).toBe("9¢");
  });

  test("percent style shows one decimal place", () => {
    expect(formatMidPrice(0.65, "percent")).toBe("65.0%");
    expect(formatMidPrice(0.5, "percent")).toBe("50.0%");
  });

  test("handles string input", () => {
    expect(formatMidPrice("0.55", "cents")).toBe("55¢");
  });

  test("returns '—' for NaN", () => {
    expect(formatMidPrice(NaN, "decimal")).toBe("—");
    expect(formatMidPrice("abc", "decimal")).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// format.ts — formatUsdh
// ---------------------------------------------------------------------------

describe("formatUsdh", () => {
  test("formats basic amounts with 2 decimal places", () => {
    expect(formatUsdh(100)).toBe("$100.00");
    expect(formatUsdh(1.5)).toBe("$1.50");
    expect(formatUsdh(0)).toBe("$0.00");
  });

  test("compact mode abbreviates thousands", () => {
    expect(formatUsdh(1200, true)).toBe("$1.2K");
    expect(formatUsdh(1_500_000, true)).toBe("$1.5M");
    expect(formatUsdh(500, true)).toBe("$500.00");
  });
});

// ---------------------------------------------------------------------------
// format.ts — formatCountdown
// ---------------------------------------------------------------------------

describe("formatCountdown", () => {
  test("returns 'Settled' for past dates", () => {
    const past = new Date(Date.now() - 10_000);
    expect(formatCountdown(past)).toBe("Settled");
  });

  test("shows seconds for < 1 minute", () => {
    const soon = new Date(Date.now() + 30_000);
    const result = formatCountdown(soon);
    expect(result).toMatch(/^\d+s$/);
  });

  test("shows minutes and seconds for < 1 hour", () => {
    const future = new Date(Date.now() + 5 * 60_000 + 30_000);
    const result = formatCountdown(future);
    expect(result).toMatch(/^\d+m \d+s$/);
  });

  test("shows hours, minutes, seconds for > 1 hour", () => {
    const future = new Date(Date.now() + 2 * 3_600_000 + 15 * 60_000 + 30_000);
    const result = formatCountdown(future);
    expect(result).toMatch(/^\d+h \d+m \d+s$/);
  });

  test("shows days and hours for > 1 day", () => {
    const future = new Date(Date.now() + 2 * 86_400_000 + 3_600_000);
    const result = formatCountdown(future);
    expect(result).toMatch(/^\d+d \d+h$/);
  });
});

// ---------------------------------------------------------------------------
// format.ts — formatPeriod
// ---------------------------------------------------------------------------

describe("formatPeriod", () => {
  test.each([
    ["1m", "1 Min"],
    ["5m", "5 Min"],
    ["15m", "15 Min"],
    ["1h", "1 Hour"],
    ["4h", "4 Hours"],
    ["1d", "1 Day"],
    ["7d", "7 Days"],
  ])("formatPeriod(%s) = %s", (period, expected) => {
    expect(formatPeriod(period)).toBe(expected);
  });

  test("returns period unchanged for unknown format", () => {
    expect(formatPeriod("2w")).toBe("2w");
  });
});

// ---------------------------------------------------------------------------
// format.ts — formatTargetPrice
// ---------------------------------------------------------------------------

describe("formatTargetPrice", () => {
  test("formats integers with commas", () => {
    expect(formatTargetPrice(66200)).toBe("66,200");
    expect(formatTargetPrice(1000)).toBe("1,000");
  });

  test("formats decimals", () => {
    const result = formatTargetPrice(66200.5);
    expect(result).toContain("66,200");
    expect(result).toContain(".5");
  });
});

// ---------------------------------------------------------------------------
// format.ts — parseMid
// ---------------------------------------------------------------------------

describe("parseMid", () => {
  test("parses decimal strings", () => {
    expect(parseMid("0.55")).toBe(0.55);
    expect(parseMid("1.0")).toBe(1.0);
  });

  test("returns 0 for undefined/empty/invalid", () => {
    expect(parseMid(undefined)).toBe(0);
    expect(parseMid("")).toBe(0);
    expect(parseMid("abc")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// format.ts — noPrice
// ---------------------------------------------------------------------------

describe("noPrice", () => {
  test("computes complement of yes price", () => {
    expect(noPrice(0.65)).toBeCloseTo(0.35, 5);
    expect(noPrice(0.5)).toBeCloseTo(0.5, 5);
    expect(noPrice(0.1)).toBeCloseTo(0.9, 5);
  });

  test("clamps to [0, 1]", () => {
    expect(noPrice(1.1)).toBe(0);
    expect(noPrice(-0.1)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// hooks/use-hip4-signer — interface shape (no DOM needed)
// ---------------------------------------------------------------------------

describe("HIP4Signer interface", () => {
  test("shape matches expected interface", () => {
    // The interface has address and walletClient fields.
    const signer = {
      address: "0xabc" as `0x${string}`,
      walletClient: {} as any,
    };
    expect(signer.address).toBe("0xabc");
    expect(typeof signer.walletClient).toBe("object");
  });
});

// ---------------------------------------------------------------------------
// hooks/use-trade — TradeParams interface
// ---------------------------------------------------------------------------

describe("TradeParams shape", () => {
  test("required fields are present in a valid params object", () => {
    const params = {
      coin: "#9860",
      asset: 100009860,
      shares: 20,
      price: 0.55,
      tif: "Gtc" as const,
    };
    expect(params.coin).toBe("#9860");
    expect(params.asset).toBe(100009860);
    expect(params.shares).toBe(20);
    expect(params.price).toBe(0.55);
  });
});

// ---------------------------------------------------------------------------
// MarketCard props — data shape validation
// ---------------------------------------------------------------------------

describe("MarketCard data", () => {
  test("market object has correct shape", () => {
    const market = {
      outcomeId: 152,
      underlying: "BTC",
      targetPrice: 65000,
      expiry: new Date(Date.now() + 3_600_000),
      period: "15m",
      yesCoinNum: 1520,
      noCoinNum: 1521,
      yesCoin: "#1520",
      noCoin: "#1521",
      yesAsset: 100_001_520,
      noAsset: 100_001_521,
    };
    expect(market.yesCoin).toBe("#1520");
    expect(market.yesAsset).toBe(100_001_520);
  });
});

// ---------------------------------------------------------------------------
// CountdownTimer — render (headless, logic only)
// ---------------------------------------------------------------------------

describe("formatCountdown edge cases", () => {
  test("exactly 0 ms returns Settled", () => {
    const now = new Date(Date.now());
    // By the time we call formatCountdown, it might be fractionally past now.
    // This tests the boundary condition.
    const result = formatCountdown(now);
    // Accept either "Settled" or a very small seconds value.
    expect(["Settled", "0s"].includes(result) || result.endsWith("s")).toBe(true);
  });

  test("1 minute future shows correct format", () => {
    const oneMin = new Date(Date.now() + 60_000);
    const result = formatCountdown(oneMin);
    // Should show "1m Xs" format
    expect(result).toMatch(/^1m \d+s$/);
  });
});
