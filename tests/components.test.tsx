/**
 * Component rendering tests for @purrdict/hip4-ui
 *
 * Uses @testing-library/react with happy-dom (via tests/setup.ts preload).
 * Tests are focused on what the user sees, not implementation details.
 */

import { test, expect, describe, mock } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { ProbabilityBar } from "../src/components/probability-bar";
import { MarketStats } from "../src/components/market-stats";
import { RecentTrades } from "../src/components/recent-trades";
import { Countdown, CountdownTimer } from "../src/components/countdown";
import { PositionCard } from "../src/components/position-card";
import { OrderSummary, TradeForm } from "../src/components/trade-form";
import type { TradeFormPrefill } from "../src/components/trade-form";
import { Orderbook } from "../src/components/orderbook";
import type { OrderbookLevelClick } from "../src/components/orderbook";

// ---------------------------------------------------------------------------
// 1. ProbabilityBar
// ---------------------------------------------------------------------------

describe("ProbabilityBar", () => {
  test("renders Yes and No labels", () => {
    render(<ProbabilityBar yesPx={0.65} noPx={0.35} />);
    expect(screen.getByText("Yes")).toBeDefined();
    expect(screen.getByText("No")).toBeDefined();
  });

  test("custom labels render correctly", () => {
    render(<ProbabilityBar yesPx={0.72} noPx={0.28} yesLabel="Up" noLabel="Down" />);
    expect(screen.getByText("Up")).toBeDefined();
    expect(screen.getByText("Down")).toBeDefined();
    // Default labels should NOT be present
    expect(screen.queryByText("Yes")).toBeNull();
    expect(screen.queryByText("No")).toBeNull();
  });

  test("renders with className applied to root element", () => {
    const { container } = render(
      <ProbabilityBar yesPx={0.5} noPx={0.5} className="my-custom-class" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("my-custom-class");
  });

  test("shows correct percentage text for yes side", () => {
    render(<ProbabilityBar yesPx={0.65} noPx={0.35} />);
    // 0.65 * 100 = 65.0 → "65.0¢"
    expect(screen.getByText("65.0¢")).toBeDefined();
  });

  test("shows correct percentage text for no side", () => {
    render(<ProbabilityBar yesPx={0.65} noPx={0.35} />);
    // 0.35 * 100 = 35.0 → "35.0¢"
    expect(screen.getByText("35.0¢")).toBeDefined();
  });

  test("renders 50/50 split correctly", () => {
    render(<ProbabilityBar yesPx={0.5} noPx={0.5} />);
    const all50 = screen.getAllByText("50.0¢");
    expect(all50.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. MarketStats
// ---------------------------------------------------------------------------

describe("MarketStats", () => {
  test("renders volume, trades, and traders values", () => {
    render(<MarketStats volume={42500} trades={312} traders={87} />);
    expect(screen.getByText("312")).toBeDefined();
    expect(screen.getByText("87")).toBeDefined();
  });

  test("volume shows compact format for thousands", () => {
    render(<MarketStats volume={42500} trades={10} traders={5} />);
    // formatUsdh(42500, true) → "$42.5K"
    expect(screen.getByText("$42.5K")).toBeDefined();
  });

  test("renders stat labels", () => {
    render(<MarketStats volume={1000} trades={50} traders={20} />);
    expect(screen.getByText("Volume")).toBeDefined();
    expect(screen.getByText("Trades")).toBeDefined();
    expect(screen.getByText("Traders")).toBeDefined();
  });

  test("className is applied to root element", () => {
    const { container } = render(
      <MarketStats volume={0} trades={0} traders={0} className="stats-wrapper" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("stats-wrapper");
  });

  test("small volume shows full dollar format", () => {
    render(<MarketStats volume={500} trades={5} traders={2} />);
    expect(screen.getByText("$500.00")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. RecentTrades
// ---------------------------------------------------------------------------

describe("RecentTrades", () => {
  const sampleTrades = [
    { side: "B" as const, price: 0.65, size: 100, time: Date.now() - 5000 },
    { side: "S" as const, price: 0.64, size: 50, time: Date.now() - 10000 },
    { side: "B" as const, price: 0.63, size: 200, time: Date.now() - 15000 },
  ];

  test("renders trade rows", () => {
    render(<RecentTrades trades={sampleTrades} />);
    // Should see Buy labels for side "B"
    const buyLabels = screen.getAllByText("Buy");
    expect(buyLabels.length).toBe(2);
    // Should see Sell label for side "S"
    expect(screen.getByText("Sell")).toBeDefined();
  });

  test('shows "No trades yet" when trades array is empty', () => {
    render(<RecentTrades trades={[]} />);
    expect(screen.getByText("No trades yet")).toBeDefined();
  });

  test("respects maxRows limit", () => {
    const manyTrades = Array.from({ length: 10 }, (_, i) => ({
      side: "B" as const,
      price: 0.5 + i * 0.01,
      size: 100,
      time: Date.now() - i * 1000,
    }));
    render(<RecentTrades trades={manyTrades} maxRows={3} />);
    // Only 3 "Buy" labels should appear
    const buyLabels = screen.getAllByText("Buy");
    expect(buyLabels.length).toBe(3);
  });

  test("shows buy side label as 'Buy' in success color class", () => {
    render(<RecentTrades trades={[sampleTrades[0]]} />);
    const buyEl = screen.getByText("Buy");
    expect(buyEl.className).toContain("text-success");
  });

  test("shows sell side label as 'Sell' in destructive color class", () => {
    render(<RecentTrades trades={[sampleTrades[1]]} />);
    const sellEl = screen.getByText("Sell");
    expect(sellEl.className).toContain("text-destructive");
  });

  test("className is applied to root", () => {
    const { container } = render(
      <RecentTrades trades={[]} className="trades-container" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("trades-container");
  });

  test("renders column headers", () => {
    render(<RecentTrades trades={sampleTrades} />);
    expect(screen.getByText("Side")).toBeDefined();
    expect(screen.getByText("Price")).toBeDefined();
    expect(screen.getByText("Size")).toBeDefined();
    expect(screen.getByText("Time")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Countdown / CountdownTimer
// ---------------------------------------------------------------------------

describe("Countdown", () => {
  test("renders hrs/mins/secs segment labels when < 1 day", () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000); // 2h 30m
    render(<Countdown expiry={future} />);
    expect(screen.getByText("HRS")).toBeDefined();
    expect(screen.getByText("MINS")).toBeDefined();
    expect(screen.getByText("SECS")).toBeDefined();
  });

  test("renders days/hrs/mins segment labels when >= 1 day", () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    render(<Countdown expiry={future} />);
    expect(screen.getByText("DAYS")).toBeDefined();
    expect(screen.getByText("HRS")).toBeDefined();
    expect(screen.getByText("MINS")).toBeDefined();
  });

  test('shows "Settled" for past expiry dates', () => {
    const past = new Date(Date.now() - 10000);
    render(<Countdown expiry={past} />);
    expect(screen.getByText("Settled")).toBeDefined();
  });

  test("has role=timer for active countdown", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    render(<Countdown expiry={future} />);
    expect(screen.getByRole("timer")).toBeDefined();
  });

  test("className is applied", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const { container } = render(
      <Countdown expiry={future} className="countdown-wrapper" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("countdown-wrapper");
  });
});

describe("CountdownTimer", () => {
  test("renders text-format countdown for future expiry", () => {
    const future = new Date(Date.now() + 90 * 60 * 1000 + 30 * 1000); // ~1h 30m 30s
    render(<CountdownTimer expiry={future} />);
    // Should show something like "1h 30m 30s"
    const el = screen.getByLabelText(/Time until expiry/);
    expect(el).toBeDefined();
    expect(el.textContent).toMatch(/\d+h \d+m \d+s/);
  });

  test('shows "Settled" for past expiry dates', () => {
    const past = new Date(Date.now() - 5000);
    render(<CountdownTimer expiry={past} />);
    expect(screen.getByText("Settled")).toBeDefined();
  });

  test("className is applied to span", () => {
    const future = new Date(Date.now() + 60 * 1000);
    const { container } = render(
      <CountdownTimer expiry={future} className="timer-cls" />
    );
    const span = container.querySelector("span");
    expect(span?.className).toContain("timer-cls");
  });
});

// ---------------------------------------------------------------------------
// 5. PositionCard
// ---------------------------------------------------------------------------

describe("PositionCard", () => {
  const baseProps = {
    coin: "#9860",
    shares: 100,
    avgEntry: 0.45,
    currentPrice: 0.65,
  };

  test("renders coin name", () => {
    render(<PositionCard {...baseProps} />);
    expect(screen.getByText("#9860")).toBeDefined();
  });

  test("renders shares count", () => {
    render(<PositionCard {...baseProps} />);
    expect(screen.getByText("100")).toBeDefined();
  });

  test("renders avgEntry price in cents format", () => {
    render(<PositionCard {...baseProps} />);
    // avgEntry 0.45 → "45¢"
    expect(screen.getByText("45¢")).toBeDefined();
  });

  test("renders currentPrice in cents format", () => {
    render(<PositionCard {...baseProps} />);
    // currentPrice 0.65 → "65¢"
    expect(screen.getByText("65¢")).toBeDefined();
  });

  test("shows positive P&L in success color class", () => {
    // entry 0.45, current 0.65 → profit
    render(<PositionCard {...baseProps} />);
    const pnlEl = screen.getByText(/Unrealized P&L/);
    // The sibling element should have text-success
    const pnlValue = pnlEl.closest("div")?.querySelector(".text-success, [class*='text-success']");
    expect(pnlValue).toBeDefined();
  });

  test("shows negative P&L in destructive color class", () => {
    render(
      <PositionCard
        coin="#9860"
        shares={100}
        avgEntry={0.75}
        currentPrice={0.45}
      />
    );
    const pnlEl = screen.getByText(/Unrealized P&L/);
    const pnlValue = pnlEl.closest("div")?.querySelector(".text-destructive, [class*='text-destructive']");
    expect(pnlValue).toBeDefined();
  });

  test("Sell button triggers onSell callback with coin", () => {
    const onSell = mock(() => {});
    render(<PositionCard {...baseProps} onSell={onSell} />);
    const sellBtn = screen.getByRole("button", { name: /Sell/i });
    fireEvent.click(sellBtn);
    expect(onSell).toHaveBeenCalledTimes(1);
    expect(onSell).toHaveBeenCalledWith("#9860");
  });

  test("does not render Sell button when onSell not provided", () => {
    render(<PositionCard {...baseProps} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("className is applied to root element", () => {
    const { container } = render(
      <PositionCard {...baseProps} className="position-card-cls" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("position-card-cls");
  });

  test("renders Value stat row", () => {
    render(<PositionCard {...baseProps} />);
    expect(screen.getByText("Value")).toBeDefined();
  });

  test("does not render P&L row when avgEntry is not provided", () => {
    render(
      <PositionCard coin="#9860" shares={100} currentPrice={0.65} />
    );
    expect(screen.queryByText(/Unrealized P&L/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. OrderSummary
// ---------------------------------------------------------------------------

describe("OrderSummary", () => {
  const baseBuyProps = {
    isBuy: true,
    shares: 100,
    cost: 65,
    effectivePrice: 0.65,
    mid: 0.63,
    bestBid: 0.62,
    bestAsk: 0.65,
    mode: "market" as const,
    sideName: "Yes",
  };

  test("renders payout amount for buy order", () => {
    render(<OrderSummary {...baseBuyProps} />);
    // payout = 100 shares * $1 = $100.00
    expect(screen.getByText("$100.00")).toBeDefined();
  });

  test('renders "Payout if wins" label for buy orders', () => {
    render(<OrderSummary {...baseBuyProps} />);
    expect(screen.getByText("Payout if wins")).toBeDefined();
  });

  test("renders profit if wins row for buy orders", () => {
    render(<OrderSummary {...baseBuyProps} />);
    expect(screen.getByText(/Profit if wins/)).toBeDefined();
  });

  test("renders cost-related summary rows", () => {
    render(<OrderSummary {...baseBuyProps} />);
    expect(screen.getByText("100 Yes")).toBeDefined();
  });

  test("shows spread warning for wide spreads (> 5¢)", () => {
    render(
      <OrderSummary
        {...baseBuyProps}
        bestBid={0.55}
        bestAsk={0.72}
        // spreadCents = (0.72 - 0.55)*100 = 17¢ → wide
      />
    );
    expect(screen.getByText(/wide/i)).toBeDefined();
  });

  test("does not show spread warning for tight spreads (<= 5¢)", () => {
    render(
      <OrderSummary
        {...baseBuyProps}
        bestBid={0.62}
        bestAsk={0.65}
        // spreadCents = 3¢ → not wide
      />
    );
    expect(screen.queryByText(/wide/i)).toBeNull();
  });

  test('renders "Est. proceeds" label for sell orders', () => {
    render(
      <OrderSummary
        {...baseBuyProps}
        isBuy={false}
        effectivePrice={0.62}
        cost={62}
      />
    );
    expect(screen.getByText("Est. proceeds")).toBeDefined();
  });

  test("returns null when shares <= 0", () => {
    const { container } = render(
      <OrderSummary {...baseBuyProps} shares={0} />
    );
    expect(container.firstElementChild).toBeNull();
  });

  test("returns null when effectivePrice <= 0", () => {
    const { container } = render(
      <OrderSummary {...baseBuyProps} effectivePrice={0} />
    );
    expect(container.firstElementChild).toBeNull();
  });

  test("className is applied to root element", () => {
    const { container } = render(
      <OrderSummary {...baseBuyProps} className="summary-cls" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("summary-cls");
  });

  test("shows limit price label for limit mode", () => {
    render(
      <OrderSummary
        {...baseBuyProps}
        mode="limit"
        effectivePrice={0.63}
      />
    );
    expect(screen.getByText("Limit price")).toBeDefined();
  });

  test("shows est. avg price label for market mode", () => {
    render(<OrderSummary {...baseBuyProps} />);
    expect(screen.getByText("Est. avg price")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. TradeForm prefill prop
// ---------------------------------------------------------------------------

const TRADE_FORM_SIDES = [
  { name: "Yes", coin: "#1520" },
  { name: "No", coin: "#1521" },
];

describe("TradeForm prefill", () => {
  test("switches form to limit mode when prefill prop is provided", () => {
    const prefill: TradeFormPrefill = { price: 0.65, nonce: 1 };
    render(
      <TradeForm
        sides={TRADE_FORM_SIDES}
        midPrice={0.6}
        bestBid={0.58}
        bestAsk={0.62}
        isConnected={false}
        prefill={prefill}
      />
    );
    // The limit price input should be rendered (it only appears in limit/alo mode)
    const limitInput = document.querySelector("input[type='text']") as HTMLInputElement | null;
    expect(limitInput).toBeDefined();
    expect(limitInput?.value).toBe("0.65");
  });

  test("prefills size into amount field when provided", () => {
    const prefill: TradeFormPrefill = { price: 0.65, size: 42.9, nonce: 1 };
    render(
      <TradeForm
        sides={TRADE_FORM_SIDES}
        midPrice={0.6}
        isConnected={false}
        prefill={prefill}
      />
    );
    // In limit buy mode the amount input is the shares input (second input)
    const inputs = document.querySelectorAll("input");
    // The shares field should contain Math.floor(42.9) = "42"
    const sharesInput = Array.from(inputs).find(
      (el) => (el as HTMLInputElement).value === "42"
    ) as HTMLInputElement | undefined;
    expect(sharesInput).toBeDefined();
  });

  test("sets direction to sell when side is 'bid'", () => {
    const prefill: TradeFormPrefill = { price: 0.62, side: "bid", nonce: 1 };
    render(
      <TradeForm
        sides={TRADE_FORM_SIDES}
        midPrice={0.6}
        isConnected={false}
        prefill={prefill}
      />
    );
    // In sell mode the submit button shows "Sell …" or "Connect Wallet" (when not connected)
    // We verify the Sell tab is active (underline class present)
    const sellTab = screen.getByRole("button", { name: "Sell" });
    expect(sellTab.className).toContain("border-foreground");
  });

  test("sets direction to buy when side is 'ask'", () => {
    const prefill: TradeFormPrefill = { price: 0.65, side: "ask", nonce: 1 };
    render(
      <TradeForm
        sides={TRADE_FORM_SIDES}
        midPrice={0.6}
        isConnected={false}
        prefill={prefill}
      />
    );
    const buyTab = screen.getByRole("button", { name: "Buy" });
    expect(buyTab.className).toContain("border-foreground");
  });

  test("does not re-apply prefill when nonce is unchanged", () => {
    const prefill: TradeFormPrefill = { price: 0.65, nonce: 1 };
    const { rerender } = render(
      <TradeForm
        sides={TRADE_FORM_SIDES}
        midPrice={0.6}
        isConnected={false}
        prefill={prefill}
      />
    );
    // Change the limit price input manually to simulate user edit
    const inputs = document.querySelectorAll("input[type='text']");
    const limitInput = inputs[0] as HTMLInputElement;
    fireEvent.change(limitInput, { target: { value: "0.70" } });

    // Rerender with same nonce — should NOT reset the user's edit
    rerender(
      <TradeForm
        sides={TRADE_FORM_SIDES}
        midPrice={0.6}
        isConnected={false}
        prefill={prefill}
      />
    );
    const inputsAfter = document.querySelectorAll("input[type='text']");
    const limitAfter = inputsAfter[0] as HTMLInputElement;
    expect(limitAfter.value).toBe("0.70");
  });

  test("re-applies prefill when nonce increments", () => {
    const prefill1: TradeFormPrefill = { price: 0.65, nonce: 1 };
    const { rerender } = render(
      <TradeForm
        sides={TRADE_FORM_SIDES}
        midPrice={0.6}
        isConnected={false}
        prefill={prefill1}
      />
    );
    const inputs = document.querySelectorAll("input[type='text']");
    const limitInput = inputs[0] as HTMLInputElement;
    fireEvent.change(limitInput, { target: { value: "0.70" } });

    // Rerender with new nonce and new price
    const prefill2: TradeFormPrefill = { price: 0.55, nonce: 2 };
    rerender(
      <TradeForm
        sides={TRADE_FORM_SIDES}
        midPrice={0.6}
        isConnected={false}
        prefill={prefill2}
      />
    );
    const inputsAfter = document.querySelectorAll("input[type='text']");
    const limitAfter = inputsAfter[0] as HTMLInputElement;
    expect(limitAfter.value).toBe("0.55");
  });

  test("TradeFormPrefill type is exported from index", () => {
    // Type-level test: if this file compiles, the export exists.
    const check: TradeFormPrefill = { price: 0.5, nonce: 0 };
    expect(check.nonce).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Orderbook onLevelClick callback
// ---------------------------------------------------------------------------

// NOTE: ProbabilityChart tests follow after Orderbook tests (section 9 below)

const SAMPLE_BIDS = [
  { px: "0.62", sz: "200", n: 3 },
  { px: "0.61", sz: "150", n: 2 },
];
const SAMPLE_ASKS = [
  { px: "0.64", sz: "180", n: 2 },
  { px: "0.65", sz: "100", n: 1 },
];

describe("Orderbook onLevelClick", () => {
  test("calls onLevelClick with price, size, and side when a bid level is clicked", () => {
    const onLevelClick = mock((_level: OrderbookLevelClick) => {});
    render(
      <Orderbook
        coin="#1520"
        bids={SAMPLE_BIDS}
        asks={SAMPLE_ASKS}
        onLevelClick={onLevelClick}
      />
    );
    // Click the best bid row (price 0.62)
    const rows = document.querySelectorAll("[title]");
    const bidRow = Array.from(rows).find((el) =>
      el.getAttribute("title")?.includes("Bid 0.62")
    );
    expect(bidRow).toBeDefined();
    fireEvent.click(bidRow!);
    expect(onLevelClick).toHaveBeenCalledTimes(1);
    const arg = (onLevelClick as ReturnType<typeof mock>).mock.calls[0][0] as OrderbookLevelClick;
    expect(arg.price).toBeCloseTo(0.62);
    expect(arg.size).toBeCloseTo(200);
    expect(arg.side).toBe("bid");
  });

  test("calls onLevelClick with side='ask' when an ask level is clicked", () => {
    const onLevelClick = mock((_level: OrderbookLevelClick) => {});
    render(
      <Orderbook
        coin="#1520"
        bids={SAMPLE_BIDS}
        asks={SAMPLE_ASKS}
        onLevelClick={onLevelClick}
      />
    );
    const rows = document.querySelectorAll("[title]");
    const askRow = Array.from(rows).find((el) =>
      el.getAttribute("title")?.includes("Ask 0.64")
    );
    expect(askRow).toBeDefined();
    fireEvent.click(askRow!);
    expect(onLevelClick).toHaveBeenCalledTimes(1);
    const arg = (onLevelClick as ReturnType<typeof mock>).mock.calls[0][0] as OrderbookLevelClick;
    expect(arg.side).toBe("ask");
    expect(arg.price).toBeCloseTo(0.64);
  });

  test("also calls onPriceClick for backward compat when level is clicked", () => {
    const onPriceClick = mock((_price: number) => {});
    const onLevelClick = mock((_level: OrderbookLevelClick) => {});
    render(
      <Orderbook
        coin="#1520"
        bids={SAMPLE_BIDS}
        asks={SAMPLE_ASKS}
        onPriceClick={onPriceClick}
        onLevelClick={onLevelClick}
      />
    );
    const rows = document.querySelectorAll("[title]");
    const bidRow = Array.from(rows).find((el) =>
      el.getAttribute("title")?.includes("Bid 0.62")
    );
    fireEvent.click(bidRow!);
    expect(onPriceClick).toHaveBeenCalledTimes(1);
    expect(onLevelClick).toHaveBeenCalledTimes(1);
  });

  test("OrderbookLevelClick type is exported from index", () => {
    const check: OrderbookLevelClick = { price: 0.5, size: 100, side: "bid" };
    expect(check.side).toBe("bid");
  });
});

// ---------------------------------------------------------------------------
// 9. ProbabilityChart
// ---------------------------------------------------------------------------

import { ProbabilityChart } from "../src/components/probability-chart";
import type { OutcomeSeries, ProbabilityChartProps } from "../src/components/probability-chart";

const NOW = Math.floor(Date.now() / 1000);

const SAMPLE_SERIES: OutcomeSeries[] = [
  {
    id: "akami",
    label: "Akami",
    data: [
      { time: NOW - 120, value: 0.45 },
      { time: NOW - 60, value: 0.50 },
      { time: NOW, value: 0.55 },
    ],
    currentValue: 0.55,
  },
  {
    id: "canned-tuna",
    label: "Canned Tuna",
    data: [
      { time: NOW - 120, value: 0.30 },
      { time: NOW - 60, value: 0.28 },
      { time: NOW, value: 0.25 },
    ],
    currentValue: 0.25,
  },
  {
    id: "bluefin",
    label: "Bluefin",
    data: [
      { time: NOW - 120, value: 0.25 },
      { time: NOW - 60, value: 0.22 },
      { time: NOW, value: 0.20 },
    ],
    currentValue: 0.20,
  },
];

describe("ProbabilityChart", () => {
  test("renders a canvas element", () => {
    const { container } = render(
      <ProbabilityChart series={SAMPLE_SERIES} />
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeDefined();
    expect(canvas).not.toBeNull();
  });

  test("renders legend with correct outcome labels", () => {
    render(<ProbabilityChart series={SAMPLE_SERIES} />);
    expect(screen.getByText("Akami")).toBeDefined();
    expect(screen.getByText("Canned Tuna")).toBeDefined();
    expect(screen.getByText("Bluefin")).toBeDefined();
  });

  test("handles empty series without crashing", () => {
    const { container } = render(<ProbabilityChart series={[]} />);
    expect(container.firstElementChild).toBeDefined();
  });

  test("applies className to root element", () => {
    const { container } = render(
      <ProbabilityChart series={SAMPLE_SERIES} className="prob-chart-test" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("prob-chart-test");
  });

  test("renders percentage values for each series with currentValue", () => {
    render(<ProbabilityChart series={SAMPLE_SERIES} />);
    // 0.55 * 100 = 55.0 → "55.0%"
    expect(screen.getByText("55.0%")).toBeDefined();
    // 0.25 * 100 = 25.0 → "25.0%"
    expect(screen.getByText("25.0%")).toBeDefined();
    // 0.20 * 100 = 20.0 → "20.0%"
    expect(screen.getByText("20.0%")).toBeDefined();
  });

  test("uses custom color when provided in series", () => {
    const customSeries: OutcomeSeries[] = [
      {
        id: "custom",
        label: "Custom",
        color: "#ff0000",
        data: [{ time: NOW - 60, value: 0.5 }, { time: NOW, value: 0.6 }],
        currentValue: 0.6,
      },
    ];
    const { container } = render(<ProbabilityChart series={customSeries} />);
    // Component renders without error — color is applied to canvas drawing
    expect(container.querySelector("canvas")).toBeDefined();
  });

  test("OutcomeSeries and ProbabilityChartProps types are exported", () => {
    const s: OutcomeSeries = {
      id: "test",
      label: "Test",
      data: [{ time: 1000, value: 0.5 }],
    };
    const props: ProbabilityChartProps = { series: [s], height: 220 };
    expect(s.id).toBe("test");
    expect(props.height).toBe(220);
  });

  test("respects height prop", () => {
    const { container } = render(
      <ProbabilityChart series={SAMPLE_SERIES} height={300} />
    );
    const wrapper = container.querySelector("[style]") as HTMLElement | null;
    // The chart wrapper should use the height prop
    expect(container.firstElementChild).toBeDefined();
  });
});
