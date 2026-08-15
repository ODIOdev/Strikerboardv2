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

export const LAUNCH_PRESET_ID = "35c21a3a-26f5-48d1-aa40-e0e91bd54262";
export const LAUNCH_PRESET_NAME = "MNT EDG";

export const DEFAULT_CONFLUENCES: Confluence[] = [
  seed("zone-major", "Major Zones", "Key Levels / Zones", 75),
  seed("struct-bos", "Break of Structure (BOS)", "Price Structure", 40),
  seed("struct-choch", "Change of Character (ChocH)", "Price Structure", 30),
  seed("mom-hidden", "Hidden Divergence", "Momentum", 60),
  seed("news-events", "Events", "News / Events", 50),
  seed("bias-htf", "HTF BIAS", "Market Bias", 60),
  seed("flow-ob", "Order Block", "Order Flow", 50),
  seed("entry-ema", "EMA", "Trend / Entry", 20),
  seed("mom-reg", "Reg Divergence", "Momentum", 40),
];

export function sameChecklistTemplate(
  left: Confluence[] | undefined,
  right: Confluence[],
) {
  if (!Array.isArray(left) || left.length !== right.length) return false;
  return left.every(
    (item, index) =>
      item.name === right[index].name &&
      item.category === right[index].category &&
      item.weight === right[index].weight,
  );
}

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

export function ensureDeskChecklist(desk: DeskState): DeskState {
  const source =
    Array.isArray(desk.checklist) && desk.checklist.length > 0
      ? desk.checklist
      : (desk.trades ?? []).find((trade) => trade.confluences?.length)
          ?.confluences ?? DEFAULT_CONFLUENCES;
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
