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
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
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

const REPLACED_FACTORY_NAMES = new Set([
  "Key S/R at the origin",
  "Retrace holds 38.2–78.6",
  "Target 1.0–1.618 of impulse",
  "Impulse leg is clear",
  "Retrace holds the structure",
  "Continuation has room",
  "Divergence into the pullback",
  "Momentum expanding with impulse",
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
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some((item) => REPLACED_FACTORY_NAMES.has(item.name));
}

export function deskNeedsLockedRepair(desk: DeskState): boolean {
  if (desk.trades.some((trade) => shouldRestoreLocked(trade.confluences))) {
    return true;
  }
  const names = (desk.checklist ?? []).map((item) => item.name);
  if (names.length !== DEFAULT_CONFLUENCES.length) return true;
  return DEFAULT_CONFLUENCES.some((item, index) => item.name !== names[index]);
}

export function ensureDeskChecklist(desk: DeskState): DeskState {
  return {
    ...desk,
    checklist: toChecklistTemplate(DEFAULT_CONFLUENCES),
    trades: desk.trades.map((trade) =>
      shouldRestoreLocked(trade.confluences)
        ? { ...trade, confluences: lockedChecklist() }
        : trade,
    ),
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
