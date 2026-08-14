import { createTfBias, createTfZone, type BoardState, type Confluence, type DeskState, type Trade } from "./types";
import { createDefaultCalculator } from "./calculator";

export const DEFAULT_CONFLUENCES: Confluence[] = [
  {
    id: "news-conflict",
    name: "No major news conflict",
    category: "News / Events",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "news-window",
    name: "Event window is clear",
    category: "News / Events",
    weight: 6,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "bias-htf",
    name: "HTF trend agrees with bias",
    category: "Market Bias",
    weight: 10,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "bias-session",
    name: "Session bias agrees with HTF",
    category: "Market Bias",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "zone-sr",
    name: "Key S/R at the origin",
    category: "Key Levels / Zones",
    weight: 10,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "zone-fib",
    name: "Retrace holds 38.2–78.6",
    category: "Key Levels / Zones",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "zone-target",
    name: "Target 1.0–1.618 of impulse",
    category: "Key Levels / Zones",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "struct-impulse",
    name: "Impulse leg is clear",
    category: "Price Structure",
    weight: 10,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "struct-retrace",
    name: "Retrace holds the structure",
    category: "Price Structure",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "struct-room",
    name: "Continuation has room",
    category: "Price Structure",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "flow-volume",
    name: "Volume confirms the impulse",
    category: "Order Flow",
    weight: 10,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "flow-delta",
    name: "Delta / absorption agrees",
    category: "Order Flow",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "mom-div",
    name: "Divergence into the pullback",
    category: "Momentum",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "mom-expand",
    name: "Momentum expanding with impulse",
    category: "Momentum",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "entry-trigger",
    name: "Entry trigger printed",
    category: "Trend / Entry",
    weight: 10,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "entry-inv",
    name: "Invalidation level defined",
    category: "Trend / Entry",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
  {
    id: "entry-rr",
    name: "R:R ≥ 2:1",
    category: "Trend / Entry",
    weight: 8,
    biasByTf: { 5: "bullish", 15: "bullish", 30: "bullish" },
    zoneByTf: { 5: "reaction", 15: "reaction", 30: "reaction" },
    active: true,
    candleConfirmed: false,
  },
];

export function createBlankConfluences(): Confluence[] {
  return DEFAULT_CONFLUENCES.map((item) => ({
    ...item,
    active: false,
    candleConfirmed: false,
    biasByTf: createTfBias(),
    zoneByTf: createTfZone("reaction"),
  }));
}

export function createDefaultBoard(): BoardState {
  return {
    ticker: "",
    recentTickers: [],
    bias: "bullish",
    wave: "A",
    confluences: createBlankConfluences(),
  };
}

export function createEmptyDesk(): DeskState {
  return {
    trades: [],
    closedTrades: [],
    recentTickers: [],
    groups: [],
  };
}

export function createTradeRecord(id = crypto.randomUUID()): Trade {
  const now = Date.now();
  const board = createDefaultBoard();
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
