/**
 * useSettlement — detect when a prediction market outcome has settled.
 *
 * Subscribes to userFills for the connected wallet. Settlement fills have
 * dir: "Settlement" and px: "1.0" (winner) or "0.0" (loser).
 *
 * Usage:
 *   const { isSettled, winner, settlePx } = useSettlement(client, address, outcomeId);
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { subscribeUserFills } from "@purrdict/hip4";
import type { HIP4Client, Subscription } from "@purrdict/hip4";

export type SettlementResult = "Yes" | "No" | null;

export interface UseSettlementResult {
  /** True if either side of the outcome has settled */
  isSettled: boolean;
  /**
   * The winning side, or null if not yet settled.
   * Derived from the fill's coin: yesCoin settled at 1.0 = "Yes" won.
   */
  winner: SettlementResult;
  /** Settlement price: "1.0" = winner, "0.0" = loser */
  settlePx: string | null;
  /** Closed PnL in USDH from the settlement fill */
  closedPnl: string | null;
}

/**
 * Subscribe to settlement events for a specific outcome.
 *
 * @param client     HIP4Client from useHIP4Client()
 * @param address    User wallet address. Pass null if not connected.
 * @param outcomeId  Outcome ID from outcomeMeta (integer)
 */
export function useSettlement(
  client: HIP4Client,
  address: string | null,
  outcomeId: number,
): UseSettlementResult {
  const [isSettled, setIsSettled] = useState(false);
  const [winner, setWinner] = useState<SettlementResult>(null);
  const [settlePx, setSettlePx] = useState<string | null>(null);
  const [closedPnl, setClosedPnl] = useState<string | null>(null);
  const subRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!address || !outcomeId) return;

    const yesCoinNum = outcomeId * 10;
    const noCoinNum = outcomeId * 10 + 1;
    const yesLabel = `#${yesCoinNum}`;
    const noLabel = `#${noCoinNum}`;

    let cancelled = false;

    async function subscribe() {
      try {
        subRef.current = await subscribeUserFills(
          client.sub,
          address!,
          (fills) => {
            if (cancelled) return;

            for (const fill of fills) {
              if (fill.dir !== "Settlement") continue;
              if (fill.coin !== yesLabel && fill.coin !== noLabel) continue;

              setIsSettled(true);
              setSettlePx(fill.px);
              setClosedPnl(fill.closedPnl);

              // px "1.0" = winner, "0.0" = loser.
              // The coin that settles at 1.0 is the winning side.
              if (fill.px === "1.0") {
                setWinner(fill.coin === yesLabel ? "Yes" : "No");
              } else {
                // The loser fill gives us the losing side — winner is the other.
                setWinner(fill.coin === yesLabel ? "No" : "Yes");
              }
            }
          },
        );
      } catch {
        // Settlement detection is best-effort — don't surface errors.
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      if (subRef.current) {
        subRef.current.unsubscribe().catch(() => undefined);
        subRef.current = null;
      }
    };
  }, [client, address, outcomeId]);

  return { isSettled, winner, settlePx, closedPnl };
}
