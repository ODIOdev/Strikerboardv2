import { createDefaultCalculator } from "./calculator";
import {
  createBlankConfluences,
  createEmptyDesk,
  toChecklistTemplate,
} from "./default-checklist";
import type {
  AccountCurrency,
  AssetClass,
  Bias,
  BoardState,
  CalcSide,
  CalculatorInput,
  Confluence,
  DeskState,
  EquityMode,
  OptionRight,
  TfBias,
  TfSide,
  TfZone,
  Trade,
  ClosedTrade,
  TradeOutcome,
  Wave,
  ZonePlay,
} from "./types";
import { createTfBias, createTfZone, resolveCategory, clampSentiment, isNewsCategory, newsToneFromSentiment } from "./types";

const DESK_KEY = "striker-desk-v5";
const PREV_DESK_KEYS = ["striker-desk-v4", "striker-desk-v3", "striker-desk-v2"];
const LEGACY_KEY = "striker-board-v1";

function isAssetClass(value: unknown): value is AssetClass {
  return (
    value === "forex" ||
    value === "stock" ||
    value === "etf" ||
    value === "crypto"
  );
}

function isEquityMode(value: unknown): value is EquityMode {
  return value === "shares" || value === "options";
}

function isOptionRight(value: unknown): value is OptionRight {
  return value === "call" || value === "put";
}

function isCalcSide(value: unknown): value is CalcSide {
  return value === "long" || value === "short";
}

function isAccountCurrency(value: unknown): value is AccountCurrency {
  return (
    value === "USD" ||
    value === "EUR" ||
    value === "GBP" ||
    value === "AUD" ||
    value === "CAD" ||
    value === "JPY"
  );
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coerceCalculator(value: unknown): CalculatorInput {
  const defaults = createDefaultCalculator();
  if (!value || typeof value !== "object") return defaults;
  const raw = value as Record<string, unknown>;
  return {
    asset: isAssetClass(raw.asset) ? raw.asset : defaults.asset,
    side: isCalcSide(raw.side) ? raw.side : defaults.side,
    accountCurrency: isAccountCurrency(raw.accountCurrency)
      ? raw.accountCurrency
      : defaults.accountCurrency,
    accountBalance: num(raw.accountBalance, defaults.accountBalance),
    leverage: num(raw.leverage, defaults.leverage),
    riskPercent: num(raw.riskPercent, defaults.riskPercent),
    rewardPercent: num(raw.rewardPercent, defaults.rewardPercent),
    entry: num(raw.entry, defaults.entry),
    stop: num(raw.stop, defaults.stop),
    target: num(raw.target, defaults.target),
    size: num(raw.size, defaults.size),
    equityMode: isEquityMode(raw.equityMode) ? raw.equityMode : defaults.equityMode,
    optionRight: isOptionRight(raw.optionRight)
      ? raw.optionRight
      : defaults.optionRight,
    strike: num(raw.strike, defaults.strike),
    expiry: typeof raw.expiry === "string" ? raw.expiry : defaults.expiry,
  };
}

function isBias(value: unknown): value is Bias {
  return value === "bullish" || value === "bearish";
}

function isTfSide(value: unknown): value is TfSide {
  return value === "bullish" || value === "bearish" || value === "range";
}

function isWave(value: unknown): value is Wave {
  return value === "A" || value === "B" || value === "C";
}

function isZonePlay(value: unknown): value is ZonePlay {
  return value === "reaction" || value === "breakout";
}

function readTfZone(value: unknown): TfZone {
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    if (
      isZonePlay(raw[5] ?? raw["5"]) &&
      isZonePlay(raw[15] ?? raw["15"]) &&
      isZonePlay(raw[30] ?? raw["30"])
    ) {
      return {
        5: (raw[5] ?? raw["5"]) as ZonePlay,
        15: (raw[15] ?? raw["15"]) as ZonePlay,
        30: (raw[30] ?? raw["30"]) as ZonePlay,
      };
    }
  }
  return createTfZone("reaction");
}

function readTfBias(value: unknown, fallbackBias: Bias): TfBias {
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    if (
      isTfSide(raw[5] ?? raw["5"]) &&
      isTfSide(raw[15] ?? raw["15"]) &&
      isTfSide(raw[30] ?? raw["30"])
    ) {
      return {
        5: (raw[5] ?? raw["5"]) as TfSide,
        15: (raw[15] ?? raw["15"]) as TfSide,
        30: (raw[30] ?? raw["30"]) as TfSide,
      };
    }
  }
  const bias = isBias(value) ? value : fallbackBias;
  return createTfBias(bias);
}

function readNews(
  raw: Record<string, unknown>,
  biasByTf: TfBias,
): { newsTone: "good" | "bad"; sentiment: number } {
  if (typeof raw.sentiment === "number" && Number.isFinite(raw.sentiment)) {
    const sentiment = clampSentiment(raw.sentiment);
    const newsTone =
      raw.newsTone === "bad" || raw.newsTone === "good"
        ? raw.newsTone
        : newsToneFromSentiment(sentiment);
    return { sentiment, newsTone };
  }
  const sides = [biasByTf[5], biasByTf[15], biasByTf[30]];
  const bear = sides.filter((side) => side === "bearish").length;
  const bull = sides.filter((side) => side === "bullish").length;
  if (bear > bull) return { newsTone: "bad", sentiment: 0 };
  if (bull > bear) return { newsTone: "good", sentiment: 100 };
  return { newsTone: "good", sentiment: 50 };
}

function normalizeConfluence(
  value: unknown,
  fallbackBias: Bias,
): Confluence | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const category = resolveCategory(raw.category);
  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.weight !== "number" ||
    !category
  ) {
    return null;
  }

  const biasByTf = raw.biasByTf
    ? readTfBias(raw.biasByTf, fallbackBias)
    : createTfBias(isBias(raw.bias) ? raw.bias : fallbackBias);
  const news = readNews(raw, biasByTf);

  return {
    id: raw.id,
    name: raw.name,
    category,
    weight: isNewsCategory(category) ? Math.round(news.sentiment) : raw.weight,
    biasByTf,
    zoneByTf: readTfZone(raw.zoneByTf),
    active: raw.active !== false,
    candleConfirmed: raw.candleConfirmed === true,
    newsTone: news.newsTone,
    sentiment: news.sentiment,
  };
}

function coerceTrade(value: unknown): Trade | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.createdAt !== "number" ||
    typeof raw.updatedAt !== "number" ||
    typeof raw.ticker !== "string" ||
    !isBias(raw.bias) ||
    !isWave(raw.wave) ||
    !Array.isArray(raw.confluences)
  ) {
    return null;
  }

  const bias = raw.bias;

  return {
    id: raw.id,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    ticker: raw.ticker,
    bias,
    wave: raw.wave,
    confluences: raw.confluences.flatMap((item) => {
      const next = normalizeConfluence(item, bias);
      return next ? [next] : [];
    }),
    calculator: coerceCalculator(raw.calculator),
    groupId: typeof raw.groupId === "string" ? raw.groupId : null,
  };
}

function coerceOutcome(value: unknown): TradeOutcome | null {
  return value === "won" || value === "lost" ? value : null;
}

function coerceClosedTrade(item: unknown): ClosedTrade | null {
  const trade = coerceTrade(item);
  if (!trade) return null;
  const raw = item as Record<string, unknown>;
  const closedAt =
    typeof raw.closedAt === "number" && Number.isFinite(raw.closedAt)
      ? raw.closedAt
      : trade.updatedAt;
  const outcome = coerceOutcome(raw.outcome);
  const realizedPnl =
    typeof raw.realizedPnl === "number" && Number.isFinite(raw.realizedPnl)
      ? raw.realizedPnl
      : null;
  return { ...trade, closedAt, outcome, realizedPnl };
}

function coerceDesk(value: unknown): DeskState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.trades) || !Array.isArray(raw.recentTickers)) {
    return null;
  }
  const trades = raw.trades.flatMap((item) => {
    const trade = coerceTrade(item);
    return trade ? [trade] : [];
  });
  if (
    !raw.recentTickers.every((item) => typeof item === "string")
  ) {
    return null;
  }
  const groups = Array.isArray(raw.groups)
    ? raw.groups.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const group = item as Record<string, unknown>;
        if (typeof group.id !== "string" || typeof group.name !== "string") {
          return [];
        }
        return [{ id: group.id, name: group.name }];
      })
    : [];
  const closedTrades = Array.isArray(raw.closedTrades)
    ? raw.closedTrades.flatMap((item) => {
        const trade = coerceClosedTrade(item);
        return trade ? [trade] : [];
      })
    : [];
  const parsedChecklist = Array.isArray(raw.checklist)
    ? raw.checklist.flatMap((item) => {
        const next = normalizeConfluence(item, "bullish");
        return next ? [next] : [];
      })
    : null;
  const checklist = toChecklistTemplate(
    parsedChecklist ??
      trades[0]?.confluences ??
      createBlankConfluences(),
  );
  return {
    trades,
    closedTrades,
    recentTickers: raw.recentTickers as string[],
    groups,
    checklist,
  };
}

function migrateLegacyBoard(value: unknown): DeskState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as BoardState;
  if (typeof raw.ticker !== "string" || !isBias(raw.bias) || !isWave(raw.wave)) {
    return null;
  }
  if (!Array.isArray(raw.confluences)) return null;
  const now = Date.now();
  return {
    recentTickers: Array.isArray(raw.recentTickers)
      ? raw.recentTickers.filter((item) => typeof item === "string")
      : [],
    trades: [
      {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ticker: raw.ticker,
        bias: raw.bias,
        wave: raw.wave,
        confluences: raw.confluences.flatMap((item) => {
          const next = normalizeConfluence(item, raw.bias);
          return next ? [next] : [];
        }),
        calculator: createDefaultCalculator(),
        groupId: null,
      },
    ],
    closedTrades: [],
    groups: [],
    checklist: toChecklistTemplate(
      raw.confluences.flatMap((item) => {
        const next = normalizeConfluence(item, raw.bias);
        return next ? [next] : [];
      }),
    ),
  };
}

export function loadDesk(): DeskState {
  if (typeof window === "undefined") return createEmptyDesk();
  try {
    const raw = window.localStorage.getItem(DESK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { checklist?: unknown };
      const desk = coerceDesk(parsed);
      if (desk) {
        if (!Array.isArray(parsed.checklist)) saveDesk(desk);
        return desk;
      }
    }

    for (const key of PREV_DESK_KEYS) {
      const previous = window.localStorage.getItem(key);
      if (!previous) continue;
      const desk = coerceDesk(JSON.parse(previous));
      if (desk) {
        saveDesk(desk);
        return desk;
      }
    }

    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const desk = migrateLegacyBoard(JSON.parse(legacy));
      if (desk) {
        saveDesk(desk);
        return desk;
      }
    }

    return createEmptyDesk();
  } catch {
    return createEmptyDesk();
  }
}

export function saveDesk(state: DeskState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DESK_KEY, JSON.stringify(state));
}

export function clearLegacyDeskKeys() {
  if (typeof window === "undefined") return;
  for (const key of PREV_DESK_KEYS) {
    window.localStorage.removeItem(key);
  }
  window.localStorage.removeItem(LEGACY_KEY);
}
