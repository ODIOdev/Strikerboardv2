export type Bias = "bullish" | "bearish";
export type TfSide = Bias | "range";
export type Wave = "A" | "B" | "C";
export type Timeframe = 1 | 5 | 15 | 30;
export type Category =
  | "News / Events"
  | "Market Bias"
  | "Key Levels / Zones"
  | "Price Structure"
  | "Order Flow"
  | "Momentum"
  | "Trend / Entry";
export type Band = "Prime" | "Valid" | "Watch";

export const TF_SIDES: TfSide[] = ["bullish", "bearish", "range"];
export const TIMEFRAMES: Timeframe[] = [1, 5, 15, 30];
export const WAVES: Wave[] = ["A", "B", "C"];
export const GRADE_COLOR: Record<Wave, string> = {
  A: "#b6ff3b",
  B: "#ff8a3b",
  C: "#ff3b5c",
};
export const GRADE_INK: Record<Wave, string> = {
  A: "#0b1204",
  B: "#1a0c04",
  C: "#1a0508",
};
export const CATEGORIES: Category[] = [
  "News / Events",
  "Market Bias",
  "Key Levels / Zones",
  "Price Structure",
  "Order Flow",
  "Momentum",
  "Trend / Entry",
];

export const RAIL_CATEGORIES: Category[] = [
  "Market Bias",
  "Price Structure",
  "Order Flow",
  "Momentum",
];

export const CATEGORY_SHORT: Record<Category, string> = {
  "News / Events": "NEWS",
  "Market Bias": "BIAS",
  "Key Levels / Zones": "ZONE",
  "Price Structure": "STR",
  "Order Flow": "FLOW",
  Momentum: "MOM",
  "Trend / Entry": "ENTRY",
};

export const CATEGORY_ALIASES: Record<string, Category> = {
  Structure: "Price Structure",
  Fib: "Key Levels / Zones",
  Context: "Market Bias",
  Execution: "Trend / Entry",
};

export function resolveCategory(value: unknown): Category | null {
  if (typeof value !== "string") return null;
  if (CATEGORIES.includes(value as Category)) return value as Category;
  return CATEGORY_ALIASES[value] ?? null;
}

export function isZoneCategory(category: unknown): boolean {
  return resolveCategory(category) === "Key Levels / Zones";
}

export function isStructureCategory(category: unknown): boolean {
  return resolveCategory(category) === "Price Structure";
}

export function isNewsCategory(category: unknown): boolean {
  return resolveCategory(category) === "News / Events";
}

export type NewsTone = "good" | "bad";

export function clampSentiment(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function newsToneFromSentiment(sentiment: number): NewsTone {
  return sentiment < 50 ? "bad" : "good";
}

export function biasFromNewsSentiment(sentiment: number): TfSide {
  if (sentiment < 50) return "bearish";
  if (sentiment > 50) return "bullish";
  return "range";
}

export function newsFields(sentiment: number): {
  sentiment: number;
  newsTone: NewsTone;
  biasByTf: TfBias;
  weight: number;
} {
  const next = clampSentiment(sentiment);
  return {
    sentiment: next,
    newsTone: newsToneFromSentiment(next),
    biasByTf: createTfBias(biasFromNewsSentiment(next)),
    weight: Math.round(next),
  };
}

export type TfBias = Record<Timeframe, TfSide>;
export type ZonePlay = "reaction" | "breakout";
export type TfZone = Record<Timeframe, ZonePlay>;
export const ZONE_PLAYS: ZonePlay[] = ["reaction", "breakout"];

export function createTfBias(bias: TfSide = "bullish"): TfBias {
  return { 1: bias, 5: bias, 15: bias, 30: bias };
}

export function createTfZone(play: ZonePlay = "reaction"): TfZone {
  return { 1: play, 5: play, 15: play, 30: play };
}

export type Confluence = {
  id: string;
  name: string;
  category: Category;
  weight: number;
  active: boolean;
  candleConfirmed: boolean;
  biasByTf: TfBias;
  zoneByTf: TfZone;
  newsTone?: NewsTone;
  sentiment?: number;
};

export type BoardState = {
  ticker: string;
  recentTickers: string[];
  bias: Bias;
  wave: Wave;
  confluences: Confluence[];
};

export type AssetClass = "forex" | "stock" | "etf" | "crypto";
export type CalcSide = "long" | "short";
export type AccountCurrency = "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "JPY";
export type EquityMode = "shares" | "options";
export type OptionRight = "call" | "put";

export type CalculatorInput = {
  asset: AssetClass;
  side: CalcSide;
  accountCurrency: AccountCurrency;
  accountBalance: number;
  leverage: number;
  riskPercent: number;
  rewardPercent: number;
  entry: number;
  stop: number;
  target: number;
  size: number;
  equityMode: EquityMode;
  optionRight: OptionRight;
  strike: number;
  expiry: string;
};

export type CalculatorResult = {
  tickSize: number;
  contractSize: number;
  units: number;
  size: number;
  sizeLabel: string;
  tickValue: number;
  ticksToStop: number;
  ticksToTarget: number;
  notional: number;
  margin: number;
  riskAmount: number;
  rewardAmount: number;
  suggestedSize: number;
  stopLoss: number;
  takeProfit: number;
  rewardRisk: number;
  derivedTarget: number;
  usedRiskSize: boolean;
  priceFactor: number;
};

export type TradeGroup = {
  id: string;
  name: string;
};

export type Trade = {
  id: string;
  createdAt: number;
  updatedAt: number;
  ticker: string;
  bias: Bias;
  wave: Wave;
  confluences: Confluence[];
  calculator: CalculatorInput;
  groupId: string | null;
};

export type TradeOutcome = "won" | "lost";

export type ClosedTrade = Trade & {
  closedAt: number;
  outcome: TradeOutcome | null;
  realizedPnl: number | null;
};

export type DeskState = {
  trades: Trade[];
  closedTrades: ClosedTrade[];
  recentTickers: string[];
  groups: TradeGroup[];
  checklist: Confluence[];
};

export type Contribution = {
  id: string;
  name: string;
  category: Category;
  earned: number;
  max: number;
  winning: TfSide | "even";
};

export type CategoryScore = {
  score: number;
  earned: number;
  max: number;
  longEarned: number;
  shortEarned: number;
  rangeEarned: number;
  winning: TfSide | "even";
};

export type OverallBias = {
  winning: TfSide | "even";
  longEarned: number;
  shortEarned: number;
  rangeEarned: number;
  conviction: number;
};

export type ScoreResult = {
  score: number;
  earned: number;
  max: number;
  band: Band;
  grade: Wave;
  overall: OverallBias;
  byCategory: Record<Category, CategoryScore>;
  contributions: Contribution[];
  hint: string;
};
