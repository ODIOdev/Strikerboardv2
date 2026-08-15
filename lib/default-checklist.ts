import { createTfBias, createTfZone, isNewsCategory, newsFields, type BoardState, type Confluence, type DeskState, type Trade } from "./types";
import { createDefaultCalculator } from "./calculator";

export const DEFAULT_CONFLUENCES: Confluence[] = [];

const REPLACED_NAMES = new Set([
  "No major news conflict",
  "Event window is clear",
  "HTF trend agrees with bias",
  "Session bias agrees with HTF",
  "Key S/R at the origin",
  "Retrace holds 38.2–78.6",
  "Target 1.0–1.618 of impulse",
  "Impulse leg is clear",
  "Retrace holds the structure",
  "Continuation has room",
  "Volume confirms the impulse",
  "Delta / absorption agrees",
  "Divergence into the pullback",
  "Momentum expanding with impulse",
  "Entry trigger printed",
  "Invalidation level defined",
  "R:R ≥ 2:1",
  "Major Zones",
  "Break of Structure (BOS)",
  "Change of Character (ChocH)",
  "Hidden Divergence",
]);

export function toChecklistTemplate(items: Confluence[]): Confluence[] {
  return items.map((item) => {
    if (isNewsCategory(item.category)) {
      return {
        ...item,
        active: false,
        candleConfirmed: false,
        zoneByTf: createTfZone("reaction"),
        ...newsFields(50),
      };
    }
    return {
      ...item,
      active: false,
      candleConfirmed: false,
      zoneByTf: createTfZone("reaction"),
      biasByTf: createTfBias(),
      newsTone: "good" as const,
      sentiment: 50,
    };
  });
}

export function cloneChecklist(items: Confluence[]): Confluence[] {
  return toChecklistTemplate(items).map((item) => ({
    ...item,
    id: crypto.randomUUID(),
  }));
}

export function createBlankConfluences(template?: Confluence[]): Confluence[] {
  return cloneChecklist(template ?? DEFAULT_CONFLUENCES);
}

export function lockedChecklist(): Confluence[] {
  return cloneChecklist(DEFAULT_CONFLUENCES);
}

function shouldRestoreLocked(items: Confluence[]): boolean {
  if (!Array.isArray(items)) return true;
  if (items.length === 0) return false;
  return items.some((item) => REPLACED_NAMES.has(item.name));
}

export function deskNeedsLockedRepair(desk: DeskState): boolean {
  if (shouldRestoreLocked(desk.checklist ?? [])) return true;
  return desk.trades.some((trade) => shouldRestoreLocked(trade.confluences));
}

export function ensureDeskChecklist(desk: DeskState): DeskState {
  const trades = desk.trades.map((trade) =>
    shouldRestoreLocked(trade.confluences)
      ? { ...trade, confluences: lockedChecklist() }
      : trade,
  );
  const tradesChanged = trades.some((trade, index) => trade !== desk.trades[index]);
  const checklist = desk.checklist ?? [];
  const checklistOff =
    checklist.length > 0 || shouldRestoreLocked(checklist);
  if (!checklistOff && !tradesChanged) return desk;
  return {
    ...desk,
    checklist: toChecklistTemplate(DEFAULT_CONFLUENCES),
    trades,
  };
}

export function createDefaultBoard(template?: Confluence[]): BoardState {
  return {
    ticker: "",
    recentTickers: [],
    bias: "bullish",
    wave: "A",
    confluences: createBlankConfluences(template ?? DEFAULT_CONFLUENCES),
  };
}

export function createEmptyDesk(): DeskState {
  return {
    trades: [],
    closedTrades: [],
    recentTickers: [],
    groups: [],
    checklist: toChecklistTemplate(DEFAULT_CONFLUENCES),
  };
}

export function createTradeRecord(
  id = crypto.randomUUID(),
  template?: Confluence[],
): Trade {
  const now = Date.now();
  const board = createDefaultBoard(template ?? DEFAULT_CONFLUENCES);
  return {
    id,
    createdAt: now,
    updatedAt: now,
    ticker: board.ticker,
    bias: board.bias,
    wave: board.wave,
    confluences: board.confluences,
    calculator: createDefaultCalculator(),
    groupId: null,
  };
}
