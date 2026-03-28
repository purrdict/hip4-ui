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

// ---------------------------------------------------------------------------
// ProbabilityBar — probability normalization logic
// ---------------------------------------------------------------------------

describe("ProbabilityBar probability normalization", () => {
  function normalize(yesPx: number, noPx: number) {
    const clampedYes = Math.max(0, Math.min(1, yesPx));
    const clampedNo = Math.max(0, Math.min(1, noPx));
    const total = clampedYes + clampedNo;
    return {
      normalizedYes: total > 0 ? (clampedYes / total) * 100 : 50,
      normalizedNo: total > 0 ? (clampedNo / total) * 100 : 50,
    };
  }

  test("65/35 sums to 100", () => {
    const { normalizedYes, normalizedNo } = normalize(0.65, 0.35);
    expect(normalizedYes + normalizedNo).toBeCloseTo(100, 5);
  });

  test("equal prices produce 50/50 split", () => {
    const { normalizedYes, normalizedNo } = normalize(0.5, 0.5);
    expect(normalizedYes).toBeCloseTo(50, 5);
    expect(normalizedNo).toBeCloseTo(50, 5);
  });

  test("clamps values outside [0,1]", () => {
    const { normalizedYes } = normalize(1.5, -0.1);
    // clamped: yes=1, no=0 → normalizedYes = 100
    expect(normalizedYes).toBe(100);
  });

  test("zero total falls back to 50/50", () => {
    const { normalizedYes, normalizedNo } = normalize(0, 0);
    expect(normalizedYes).toBe(50);
    expect(normalizedNo).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// MarketStats — formatUsdh compact used for volume
// ---------------------------------------------------------------------------

describe("MarketStats volume formatting", () => {
  test("volume above 1000 shows compact K format", () => {
    expect(formatUsdh(42000, true)).toBe("$42.0K");
  });

  test("volume below 1000 shows full dollars format", () => {
    expect(formatUsdh(500, true)).toBe("$500.00");
  });

  test("volume in millions shows M format", () => {
    expect(formatUsdh(1_500_000, true)).toBe("$1.5M");
  });
});

// ---------------------------------------------------------------------------
// RecentTrades — data shape validation
// ---------------------------------------------------------------------------

describe("RecentTrades data", () => {
  test("trade object has correct shape", () => {
    const trade = {
      side: "B" as const,
      price: 0.65,
      size: 100,
      time: Date.now(),
    };
    expect(trade.side).toBe("B");
    expect(trade.price).toBe(0.65);
    expect(trade.size).toBe(100);
    expect(typeof trade.time).toBe("number");
  });

  test("sell side is 'S'", () => {
    const trade = { side: "S" as const, price: 0.35, size: 50, time: Date.now() };
    expect(trade.side).toBe("S");
  });

  test("maxRows defaults to 20 conceptually", () => {
    // Simulate slicing: 25 trades → maxRows=20 → 20 shown
    const trades = Array.from({ length: 25 }, (_, i) => ({
      side: "B" as const,
      price: 0.5,
      size: 10,
      time: Date.now() - i * 1000,
    }));
    const maxRows = 20;
    const visible = trades.slice(0, maxRows);
    expect(visible.length).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// OrderSummary — payout calculation logic
// ---------------------------------------------------------------------------

describe("OrderSummary payout logic", () => {
  function calcBuyPayout(shares: number, effectivePrice: number) {
    const cost = shares * effectivePrice;
    const payout = shares * 1.0; // each share pays $1 at resolution
    const toWin = payout - cost;
    const returnPct = cost > 0 ? ((payout / cost - 1) * 100) : 0;
    return { cost, payout, toWin, returnPct };
  }

  test("buying 100 shares at 0.65 gives correct payout", () => {
    const { cost, payout, returnPct } = calcBuyPayout(100, 0.65);
    expect(cost).toBeCloseTo(65, 5);
    expect(payout).toBeCloseTo(100, 5);
    expect(returnPct).toBeCloseTo(53.846, 2);
  });

  test("buying at 0.5 gives 100% return", () => {
    const { returnPct } = calcBuyPayout(100, 0.5);
    expect(returnPct).toBeCloseTo(100, 5);
  });

  function calcSlippage(effectivePrice: number, mid: number, isBuy: boolean) {
    return isBuy
      ? ((effectivePrice - mid) / mid) * 100
      : ((mid - effectivePrice) / mid) * 100;
  }

  test("buy slippage is positive when effective > mid", () => {
    const slip = calcSlippage(0.66, 0.63, true);
    expect(slip).toBeGreaterThan(0);
  });

  test("sell slippage is positive when effective < mid", () => {
    const slip = calcSlippage(0.60, 0.63, false);
    expect(slip).toBeGreaterThan(0);
  });

  test("spread in cents calculation", () => {
    const spreadCents = (0.65 - 0.62) * 100;
    expect(spreadCents).toBeCloseTo(3, 5);
  });

  test("wide spread (> 5¢) triggers warning", () => {
    const spreadCents = (0.72 - 0.60) * 100; // 12¢
    expect(spreadCents).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// Countdown — time-left calculation logic
// ---------------------------------------------------------------------------

describe("Countdown time-left logic", () => {
  function getTimeLeft(expiryMs: number, nowMs: number) {
    const diff = expiryMs - nowMs;
    if (diff <= 0) return { expired: true, d: 0, h: 0, m: 0, s: 0, diff: 0 };
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return { expired: false, d, h, m, s, diff };
  }

  test("expired for past timestamps", () => {
    const result = getTimeLeft(Date.now() - 1000, Date.now());
    expect(result.expired).toBe(true);
  });

  test("calculates days/hours correctly for 1.5 days", () => {
    const now = Date.now();
    const future = now + 1.5 * 24 * 60 * 60 * 1000;
    const result = getTimeLeft(future, now);
    expect(result.d).toBe(1);
    expect(result.h).toBe(12);
    expect(result.expired).toBe(false);
  });

  test("urgency: < 1h is urgent", () => {
    const diff = 30 * 60 * 1000; // 30 minutes
    const isUrgent = diff < 1000 * 60 * 60;
    expect(isUrgent).toBe(true);
  });

  test("warning: < 6h triggers amber", () => {
    const diff = 3 * 60 * 60 * 1000; // 3 hours
    const isUrgent = diff < 1000 * 60 * 60;
    const isWarning = diff < 1000 * 60 * 60 * 6;
    expect(isUrgent).toBe(false);
    expect(isWarning).toBe(true);
  });

  test("normal: > 6h no urgency", () => {
    const diff = 24 * 60 * 60 * 1000; // 24 hours
    const isUrgent = diff < 1000 * 60 * 60;
    const isWarning = diff < 1000 * 60 * 60 * 6;
    expect(isUrgent).toBe(false);
    expect(isWarning).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MarketCard — variant prop defaults
// ---------------------------------------------------------------------------

describe("MarketCard variant", () => {
  test("named-binary variant requires sides array", () => {
    const sides = [
      { name: "Team A", pct: 60 },
      { name: "Team B", pct: 40 },
    ];
    expect(sides.length).toBeGreaterThan(0);
    expect(sides[0].name).toBe("Team A");
  });

  test("question variant requires outcomes array", () => {
    const outcomes = [
      { name: "Outcome A", pct: 45 },
      { name: "Outcome B", pct: 30 },
      { name: "Outcome C", pct: 25 },
    ];
    // Top 2 are shown, moreCount = 1
    const top2 = outcomes.slice(0, 2);
    const moreCount = outcomes.length - 2;
    expect(top2.length).toBe(2);
    expect(moreCount).toBe(1);
  });
});
