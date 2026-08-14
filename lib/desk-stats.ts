import { calculateTrade, createDefaultCalculator } from "./calculator";
import { categoryScore } from "./scoring";
import type { Band, Bias, Category, ScoreResult, Trade } from "./types";
import { CATEGORIES } from "./types";

export type ScoredTrade = Trade & { result: ScoreResult };

export type DeskStats = {
  count: number;
  bullish: number;
  bearish: number;
  bullPct: number;
  bearPct: number;
  lead: Bias | "even";
  leadPct: number;
  bands: Record<Band, number>;
  avgScore: number;
  avgByCategory: Record<Category, number>;
  totalRisk: number;
  totalReward: number;
  bookRR: number;
  exposure: BookLine[];
};

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
  const bullish = trades.filter((trade) => trade.bias === "bullish").length;
  const bearish = count - bullish;
  const bullPct = count === 0 ? 0 : Math.round((bullish / count) * 100);
  const bearPct = count === 0 ? 0 : 100 - bullPct;

  let lead: DeskStats["lead"] = "even";
  let leadPct = 0;
  if (bullish > bearish) {
    lead = "bullish";
    leadPct = bullPct;
  } else if (bearish > bullish) {
    lead = "bearish";
    leadPct = bearPct;
  } else if (count > 0) {
    leadPct = 50;
  }

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
    bullPct,
    bearPct,
    lead,
    leadPct,
    bands,
    avgScore,
    avgByCategory,
    totalRisk,
    totalReward,
    bookRR: totalRisk > 0 ? totalReward / totalRisk : 0,
    exposure,
  };
}
