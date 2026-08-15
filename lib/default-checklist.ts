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
  seed("news-conflict", "No major news conflict", "News / Events", 8),
  seed("news-window", "Event window is clear", "News / Events", 6),
  seed("bias-htf", "HTF trend agrees with bias", "Market Bias", 10),
  seed("bias-session", "Session bias agrees with HTF", "Market Bias", 8),
  seed("zone-major", "Major Zones", "Key Levels / Zones", 75),
  seed("struct-bos", "Break of Structure (BOS)", "Price Structure", 50),
  seed("struct-choch", "Change of Character (ChocH)", "Price Structure", 8),
  seed("flow-volume", "Volume confirms the impulse", "Order Flow", 10),
  seed("flow-delta", "Delta / absorption agrees", "Order Flow", 8),
  seed("mom-hidden", "Hidden Divergence", "Momentum", 75),
  seed("entry-trigger", "Entry trigger printed", "Trend / Entry", 10),
  seed("entry-inv", "Invalidation level defined", "Trend / Entry", 8),
  seed("entry-rr", "R:R ≥ 2:1", "Trend / Entry", 8),
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

export function deskCoverage(desk: DeskState): number {
  const names = new Set<string>();
  for (const item of desk.checklist ?? []) names.add(item.name);
  for (const trade of desk.trades ?? []) {
    for (const item of trade.confluences ?? []) names.add(item.name);
  }
  return DEFAULT_CONFLUENCES.filter((item) => names.has(item.name)).length;
}

function mergeMissingDefaults(items: Confluence[] | undefined): Confluence[] {
  const current = items ?? [];
  const have = new Set(current.map((item) => item.name));
  const missing = DEFAULT_CONFLUENCES.filter((item) => !have.has(item.name));
  if (missing.length === 0) return current;
  return [...current, ...cloneChecklist(missing)];
}

export function ensureDeskChecklist(desk: DeskState): DeskState {
  const checklist = mergeMissingDefaults(desk.checklist);
  const trades = (desk.trades ?? []).map((trade) => {
    const confluences = mergeMissingDefaults(trade.confluences);
    return confluences === trade.confluences
      ? trade
      : { ...trade, confluences };
  });
  const tradesChanged = trades.some(
    (trade, index) => trade !== desk.trades[index],
  );
  if (checklist === desk.checklist && !tradesChanged) return desk;
  return {
    ...desk,
    checklist,
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
