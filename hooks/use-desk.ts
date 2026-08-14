"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  closeTrade,
  createGroup,
  createTrade,
  deleteGroup,
  deleteTrade,
  getDeskSnapshot,
  getServerDeskSnapshot,
  importCsvBook,
  renameGroup,
  setTradeGroup,
  subscribeDesk,
} from "@/lib/desk-store";
import { scoreBoard } from "@/lib/scoring";
import { useHydrated } from "@/hooks/use-hydrated";

export function useDesk() {
  const hydrated = useHydrated();
  const desk = useSyncExternalStore(
    subscribeDesk,
    getDeskSnapshot,
    getServerDeskSnapshot,
  );

  const trades = useMemo(
    () =>
      desk.trades.map((trade) => ({
        ...trade,
        result: scoreBoard(trade.confluences),
      })),
    [desk.trades],
  );

  const closedTrades = useMemo(
    () =>
      desk.closedTrades.map((trade) => ({
        ...trade,
        result: scoreBoard(trade.confluences),
      })),
    [desk.closedTrades],
  );

  return {
    hydrated,
    trades,
    closedTrades,
    groups: desk.groups,
    recentTickers: desk.recentTickers,
    createTrade,
    deleteTrade,
    closeTrade,
    createGroup,
    deleteGroup,
    renameGroup,
    setTradeGroup,
    importCsvBook,
  };
}
