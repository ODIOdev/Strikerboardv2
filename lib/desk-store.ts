import { createEmptyDesk, createTradeRecord } from "./default-checklist";
import { calculateTrade, inferAssetClass, normalizeTicker } from "./calculator";
import { csvToDesk } from "./csv";
import { loadDesk, saveDesk } from "./storage";
import type { ClosedTrade, DeskState, Trade, TradeOutcome } from "./types";

const listeners = new Set<() => void>();
const serverSnapshot = createEmptyDesk();
let snapshot: DeskState = serverSnapshot;
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeDesk(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeskSnapshot(): DeskState {
  if (!loaded) {
    snapshot = loadDesk();
    loaded = true;
  }
  return snapshot;
}

export function getServerDeskSnapshot(): DeskState {
  return serverSnapshot;
}

export function writeDesk(
  next: DeskState | ((prev: DeskState) => DeskState),
) {
  if (!loaded) {
    snapshot = loadDesk();
    loaded = true;
  }
  snapshot = typeof next === "function" ? next(snapshot) : next;
  saveDesk(snapshot);
  emit();
}

export function createTrade(ticker?: string): Trade {
  const trade = createTradeRecord();
  const symbol = ticker ? normalizeTicker(ticker) : "";
  if (symbol) {
    trade.ticker = symbol;
    trade.calculator = {
      ...trade.calculator,
      asset: inferAssetClass(symbol),
    };
  }
  writeDesk((prev) => ({
    ...prev,
    trades: [trade, ...prev.trades],
    recentTickers: symbol
      ? [symbol, ...prev.recentTickers.filter((item) => item !== symbol)].slice(
          0,
          6,
        )
      : prev.recentTickers,
  }));
  return trade;
}

export function deleteTrade(id: string) {
  writeDesk((prev) => ({
    ...prev,
    trades: prev.trades.filter((trade) => trade.id !== id),
  }));
}

export function closeTrade(
  id: string,
  outcome: TradeOutcome,
): ClosedTrade | null {
  const current = getDeskSnapshot().trades.find((item) => item.id === id);
  if (!current) return null;
  const calc = calculateTrade(current.calculator, current.ticker);
  const realizedPnl =
    outcome === "won" ? calc.takeProfit : -Math.abs(calc.stopLoss);
  const closed: ClosedTrade = {
    ...current,
    closedAt: Date.now(),
    updatedAt: Date.now(),
    outcome,
    realizedPnl,
  };
  writeDesk((prev) => ({
    ...prev,
    trades: prev.trades.filter((item) => item.id !== id),
    closedTrades: [closed, ...prev.closedTrades].slice(0, 24),
  }));
  return closed;
}

export function writeTrade(
  id: string,
  next: Trade | ((prev: Trade) => Trade),
) {
  writeDesk((prev) => {
    const current = prev.trades.find((trade) => trade.id === id);
    if (!current) return prev;
    const updated = typeof next === "function" ? next(current) : next;
    return {
      ...prev,
      trades: prev.trades.map((trade) =>
        trade.id === id ? { ...updated, updatedAt: Date.now() } : trade,
      ),
    };
  });
}

export function writeRecents(recentTickers: string[]) {
  writeDesk((prev) => ({ ...prev, recentTickers }));
}

export function createGroup(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const group = { id: crypto.randomUUID(), name: trimmed };
  writeDesk((prev) => ({
    ...prev,
    groups: [...prev.groups, group],
  }));
  return group;
}

export function renameGroup(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  writeDesk((prev) => ({
    ...prev,
    groups: prev.groups.map((group) =>
      group.id === id ? { ...group, name: trimmed } : group,
    ),
  }));
}

export function deleteGroup(id: string) {
  writeDesk((prev) => ({
    ...prev,
    groups: prev.groups.filter((group) => group.id !== id),
    trades: prev.trades.map((trade) =>
      trade.groupId === id ? { ...trade, groupId: null } : trade,
    ),
  }));
}

export function setTradeGroup(tradeId: string, groupId: string | null) {
  writeTrade(tradeId, (prev) => ({ ...prev, groupId }));
}

export function importCsvBook(text: string) {
  const parsed = csvToDesk(text);
  writeDesk((prev) => {
    const openIds = new Set(parsed.trades.map((trade) => trade.id));
    const closedIds = new Set(parsed.closedTrades.map((trade) => trade.id));
    const groups = [...prev.groups];
    for (const group of parsed.groups) {
      const exists = groups.some(
        (item) => item.name.toLowerCase() === group.name.toLowerCase(),
      );
      if (!exists) groups.push(group);
    }
    const groupIdFor = (name: string | undefined, fallback: string | null) => {
      if (!name) return fallback;
      return (
        groups.find((item) => item.name.toLowerCase() === name.toLowerCase())?.id ??
        fallback
      );
    };
    const importedOpen = parsed.trades.map((trade) => {
      const named = parsed.groups.find((group) => group.id === trade.groupId);
      return { ...trade, groupId: groupIdFor(named?.name, trade.groupId) };
    });
    const importedClosed = parsed.closedTrades.map((trade) => {
      const named = parsed.groups.find((group) => group.id === trade.groupId);
      return { ...trade, groupId: groupIdFor(named?.name, trade.groupId) };
    });
    return {
      ...prev,
      groups,
      trades: [
        ...importedOpen,
        ...prev.trades.filter((trade) => !openIds.has(trade.id) && !closedIds.has(trade.id)),
      ],
      closedTrades: [
        ...importedClosed,
        ...prev.closedTrades.filter(
          (trade) => !openIds.has(trade.id) && !closedIds.has(trade.id),
        ),
      ],
      recentTickers: [
        ...importedOpen.map((trade) => trade.ticker).filter(Boolean),
        ...prev.recentTickers,
      ]
        .filter((item, index, all) => all.indexOf(item) === index)
        .slice(0, 6),
    };
  });
  return parsed;
}

export function resetDesk() {
  snapshot = createEmptyDesk();
  loaded = true;
  saveDesk(snapshot);
  emit();
}

export function replaceDesk(next: DeskState) {
  snapshot = next;
  loaded = true;
  saveDesk(snapshot);
  emit();
}
