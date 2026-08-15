import { createTfBias, createTfZone, isNewsCategory, newsFields, type BoardState, type Category, type Confluence, type DeskState, type Trade } from "./types";
import { createDefaultCalculator } from "./calculator";

function seed(
  id: string,
  name: string,
  category: Category,
  weight: number,
): Confluence {
  return {
    id,
    name,
    category,
    weight,
    biasByTf: createTfBias("bullish"),
    zoneByTf: createTfZone("reaction"),
    active: false,
    candleConfirmed: false,
  };
}

export const DEFAULT_CONFLUENCES: Confluence[] = [
  seed("zone-major", "Major Zones", "Key Levels / Zones", 75),
  seed("struct-bos", "Break of Structure (BOS)", "Price Structure", 50),
  seed("struct-choch", "Change of Character (ChocH)", "Price Structure", 8),
  seed("mom-hidden", "Hidden Divergence", "Momentum", 75),
];

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
  const source = template?.length ? template : DEFAULT_CONFLUENCES;
  return cloneChecklist(source);
}

export function lockedChecklist(): Confluence[] {
  return cloneChecklist(DEFAULT_CONFLUENCES);
}

export function deskPrintCount(desk: DeskState): number {
  const checklist = Array.isArray(desk.checklist) ? desk.checklist.length : 0;
  const open = (desk.trades ?? []).reduce(
    (count, trade) => count + (trade.confluences?.length ?? 0),
    0,
  );
  const closed = (desk.closedTrades ?? []).reduce(
    (count, trade) => count + (trade.confluences?.length ?? 0),
    0,
  );
  return checklist + open + closed;
}

function templateSource(desk: DeskState): Confluence[] {
  if (Array.isArray(desk.checklist) && desk.checklist.length > 0) {
    return desk.checklist;
  }
  const fromTrade = (desk.trades ?? []).find((trade) => trade.confluences?.length);
  if (fromTrade) return fromTrade.confluences;
  const fromClosed = (desk.closedTrades ?? []).find(
    (trade) => trade.confluences?.length,
  );
  if (fromClosed) return fromClosed.confluences;
  return DEFAULT_CONFLUENCES;
}

export function ensureDeskChecklist(desk: DeskState): DeskState {
  const source = templateSource(desk);
  const needChecklist =
    !Array.isArray(desk.checklist) || desk.checklist.length === 0;
  const trades = (desk.trades ?? []).map((trade) =>
    trade.confluences?.length
      ? trade
      : { ...trade, confluences: cloneChecklist(source) },
  );
  const tradesChanged = trades.some(
    (trade, index) => trade !== desk.trades[index],
  );
  if (!needChecklist && !tradesChanged) return desk;
  return {
    ...desk,
    checklist: needChecklist ? toChecklistTemplate(source) : desk.checklist,
    trades,
  };
}

export function createDefaultBoard(template?: Confluence[]): BoardState {
  return {
    ticker: "",
    recentTickers: [],
    bias: "bullish",
    wave: "A",
    confluences: createBlankConfluences(template),
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
  const board = createDefaultBoard(template);
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
