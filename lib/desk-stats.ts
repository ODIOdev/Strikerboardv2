import { calculateTrade, createDefaultCalculator } from "./calculator";
import { categoryScore } from "./scoring";
import type { Band, Category, ClosedTrade, ScoreResult, TfSide, Trade } from "./types";
import { CATEGORIES } from "./types";

export type ScoredTrade = Trade & { result: ScoreResult };

export type BookSentiment = {
  id: string;
  ticker: string;
  side: TfSide;
  score: number;
};

export type DeskStats = {
  count: number;
  bullish: number;
  bearish: number;
  range: number;
  bullPct: number;
  bearPct: number;
  rangePct: number;
  lead: TfSide | "even";
  leadPct: number;
  conviction: number;
  bands: Record<Band, number>;
  avgScore: number;
  avgByCategory: Record<Category, number>;
  totalRisk: number;
  totalReward: number;
  bookRR: number;
  exposure: BookLine[];
  sentiments: BookSentiment[];
};

export function tradeSentiment(trade: ScoredTrade): TfSide {
  const winning = trade.result.overall.winning;
  return winning === "even" ? trade.bias : winning;
}

export type BookLine = {
  id: string;
  ticker: string;
  side: "long" | "short";
  risk: number;
  reward: number;
  rr: number;
  currency: string;
};

export function deskStats(trades: ScoredTrade[]): DeskStats {
  const count = trades.length;
  const sentiments: BookSentiment[] = [];
  let bullish = 0;
  let bearish = 0;
  let range = 0;
  let longPts = 0;
  let shortPts = 0;
  let rangePts = 0;

  for (const trade of trades) {
    const side = tradeSentiment(trade);
    if (side === "bullish") bullish += 1;
    else if (side === "bearish") bearish += 1;
    else range += 1;
    longPts += trade.result.overall.longEarned;
    shortPts += trade.result.overall.shortEarned;
    rangePts += trade.result.overall.rangeEarned;
    sentiments.push({
      id: trade.id,
      ticker: trade.ticker || "UNTITLED",
      side,
      score: trade.result.score,
    });
  }

  const pts = longPts + shortPts + rangePts;
  const bullPct =
    count === 0
      ? 0
      : pts > 0
        ? Math.round((longPts / pts) * 100)
        : Math.round((bullish / count) * 100);
  const bearPct =
    count === 0
      ? 0
      : pts > 0
        ? Math.round((shortPts / pts) * 100)
        : Math.round((bearish / count) * 100);
  const rangePct =
    count === 0 ? 0 : Math.max(0, 100 - bullPct - bearPct);

  let lead: DeskStats["lead"] = "even";
  let leadPct = 0;
  if (pts > 0) {
    const best = Math.max(longPts, shortPts, rangePts);
    if (longPts === best && longPts > shortPts && longPts > rangePts) {
      lead = "bullish";
      leadPct = bullPct;
    } else if (shortPts === best && shortPts > longPts && shortPts > rangePts) {
      lead = "bearish";
      leadPct = bearPct;
    } else if (rangePts === best && rangePts > longPts && rangePts > shortPts) {
      lead = "range";
      leadPct = rangePct;
    } else {
      leadPct = Math.round((best / pts) * 100);
    }
  } else if (bullish > bearish && bullish >= range) {
    lead = "bullish";
    leadPct = bullPct;
  } else if (bearish > bullish && bearish >= range) {
    lead = "bearish";
    leadPct = bearPct;
  } else if (range > bullish && range > bearish) {
    lead = "range";
    leadPct = rangePct;
  } else if (count > 0) {
    leadPct = 50;
  }

  const conviction = pts > 0 ? (Math.max(longPts, shortPts, rangePts) / pts) * 100 : leadPct;

  const bands: Record<Band, number> = { Prime: 0, Valid: 0, Watch: 0 };
  for (const trade of trades) {
    bands[trade.result.band] += 1;
  }

  const avgScore =
    count === 0
      ? 0
      : trades.reduce((sum, trade) => sum + trade.result.score, 0) / count;

  const avgByCategory = Object.fromEntries(
    CATEGORIES.map((category) => {
      const average =
        count === 0
          ? 0
          : trades.reduce(
              (sum, trade) => sum + categoryScore(trade.result, category),
              0,
            ) / count;
      return [category, average];
    }),
  ) as Record<Category, number>;

  const exposure: BookLine[] = trades.map((trade) => {
    const input = trade.calculator ?? createDefaultCalculator();
    const calc = calculateTrade(input, trade.ticker);
    const risk = calc.stopLoss > 0 ? calc.stopLoss : calc.riskAmount;
    const reward = calc.takeProfit > 0 ? calc.takeProfit : calc.rewardAmount;
    return {
      id: trade.id,
      ticker: trade.ticker || "UNTITLED",
      side: input.side,
      risk,
      reward,
      rr: risk > 0 ? reward / risk : 0,
      currency: input.accountCurrency,
    };
  });
  const totalRisk = exposure.reduce((sum, item) => sum + item.risk, 0);
  const totalReward = exposure.reduce((sum, item) => sum + item.reward, 0);

  return {
    count,
    bullish,
    bearish,
    range,
    bullPct,
    bearPct,
    rangePct,
    lead,
    leadPct,
    conviction,
    bands,
    avgScore,
    avgByCategory,
    totalRisk,
    totalReward,
    bookRR: totalRisk > 0 ? totalReward / totalRisk : 0,
    exposure,
    sentiments,
  };
}

export type ScoredClosed = ClosedTrade & { result: ScoreResult };

export type ClosedStats = {
  count: number;
  decided: number;
  wins: number;
  losses: number;
  winRate: number;
  net: number;
  grossWin: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  profitFactor: number;
  avgRR: number;
  avgScore: number;
  avgWinScore: number;
  avgLossScore: number;
  longWins: number;
  longCount: number;
  shortWins: number;
  shortCount: number;
  currency: string;
  best: number;
  worst: number;
};

function realizedOf(trade: ScoredClosed): number {
  if (typeof trade.realizedPnl === "number" && Number.isFinite(trade.realizedPnl)) {
    return trade.realizedPnl;
  }
  const calc = calculateTrade(
    trade.calculator ?? createDefaultCalculator(),
    trade.ticker,
  );
  if (trade.outcome === "won") return calc.takeProfit;
  if (trade.outcome === "lost") return -Math.abs(calc.stopLoss);
  return 0;
}

export function closedBookStats(trades: ScoredClosed[]): ClosedStats {
  const count = trades.length;
  const decided = trades.filter(
    (trade) => trade.outcome === "won" || trade.outcome === "lost",
  );
  const wins = decided.filter((trade) => trade.outcome === "won");
  const losses = decided.filter((trade) => trade.outcome === "lost");
  const pnls = decided.map(realizedOf);
  const net = pnls.reduce((sum, value) => sum + value, 0);
  const winPnls = pnls.filter((value) => value > 0);
  const lossPnls = pnls.filter((value) => value < 0);
  const grossWin = winPnls.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(lossPnls.reduce((sum, value) => sum + value, 0));
  const avg = (rows: number[]) =>
    rows.length === 0 ? 0 : rows.reduce((sum, value) => sum + value, 0) / rows.length;
  const long = decided.filter((trade) => trade.calculator.side === "long");
  const short = decided.filter((trade) => trade.calculator.side !== "long");
  const rr = decided.map((trade) => {
    const calc = calculateTrade(
      trade.calculator ?? createDefaultCalculator(),
      trade.ticker,
    );
    return calc.rewardRisk;
  });
  const currency = trades[0]?.calculator.accountCurrency ?? "USD";

  return {
    count,
    decided: decided.length,
    wins: wins.length,
    losses: losses.length,
    winRate: decided.length === 0 ? 0 : (wins.length / decided.length) * 100,
    net,
    grossWin,
    grossLoss,
    avgWin: avg(winPnls),
    avgLoss: avg(lossPnls.map(Math.abs)),
    expectancy: decided.length === 0 ? 0 : net / decided.length,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Number.POSITIVE_INFINITY : 0,
    avgRR: avg(rr.filter((value) => value > 0)),
    avgScore: avg(decided.map((trade) => trade.result.score)),
    avgWinScore: avg(wins.map((trade) => trade.result.score)),
    avgLossScore: avg(losses.map((trade) => trade.result.score)),
    longWins: long.filter((trade) => trade.outcome === "won").length,
    longCount: long.length,
    shortWins: short.filter((trade) => trade.outcome === "won").length,
    shortCount: short.length,
    currency,
    best: pnls.length === 0 ? 0 : Math.max(...pnls),
    worst: pnls.length === 0 ? 0 : Math.min(...pnls),
  };
}
