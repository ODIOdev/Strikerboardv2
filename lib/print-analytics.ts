import { isNewsCategory, CATEGORIES, type Category, type Confluence, type TfSide } from "./types";
import { newsHeat, newsSentiment, sidePoints } from "./scoring";
import type { ScoredClosed } from "./desk-stats";

export type PrintGrade = "good" | "bad" | "normal";

export type PrintStat = {
  key: string;
  name: string;
  category: Category;
  samples: number;
  wins: number;
  losses: number;
  winRate: number;
  lift: number;
  net: number;
  aligned: number;
  grade: PrintGrade;
};

export type CategoryPrintStat = {
  category: Category;
  samples: number;
  wins: number;
  losses: number;
  winRate: number;
  lift: number;
  net: number;
  grade: PrintGrade;
};

function itemWinning(item: Confluence): TfSide | "even" {
  if (!item.active) return "even";
  if (isNewsCategory(item.category)) {
    if (newsHeat(item) === 0) return "even";
    const sentiment = newsSentiment(item);
    if (sentiment > 50) return "bullish";
    if (sentiment < 50) return "bearish";
    return "range";
  }
  const longEarned = sidePoints(item, "bullish");
  const shortEarned = sidePoints(item, "bearish");
  const best = Math.max(longEarned, shortEarned);
  if (best === 0) return "even";
  if (longEarned === shortEarned) return "even";
  return longEarned > shortEarned ? "bullish" : "bearish";
}

export type PrintTradeHit = {
  trade: ScoredClosed;
  side: TfSide;
  aligned: boolean;
  pnl: number;
};

export function tradesForPrint(
  trades: ScoredClosed[],
  key: string,
): PrintTradeHit[] {
  const hits: PrintTradeHit[] = [];
  for (const trade of trades) {
    if (trade.outcome !== "won" && trade.outcome !== "lost") continue;
    const calcSide = trade.calculator?.side === "short" ? "short" : "long";
    for (const item of trade.confluences) {
      if (`${item.category}::${item.name}` !== key) continue;
      const side = itemWinning(item);
      if (side === "even") continue;
      hits.push({
        trade,
        side,
        aligned:
          (side === "bullish" && calcSide === "long") ||
          (side === "bearish" && calcSide === "short"),
        pnl: realized(trade),
      });
      break;
    }
  }
  return hits;
}

function realized(trade: ScoredClosed): number {
  return typeof trade.realizedPnl === "number" && Number.isFinite(trade.realizedPnl)
    ? trade.realizedPnl
    : 0;
}

function gradeFor(samples: number, winRate: number, lift: number): PrintGrade {
  if (samples < 2) return "normal";
  if (lift >= 12 && winRate >= 55) return "good";
  if (lift <= -12 || winRate <= 40) return "bad";
  return "normal";
}

type Acc = {
  name: string;
  category: Category;
  samples: number;
  wins: number;
  losses: number;
  net: number;
  aligned: number;
};

function emptyAcc(name: string, category: Category): Acc {
  return { name, category, samples: 0, wins: 0, losses: 0, net: 0, aligned: 0 };
}

function toStat(row: Acc, bookRate: number): PrintStat {
  const decided = row.wins + row.losses;
  const winRate = decided === 0 ? 0 : (row.wins / decided) * 100;
  const lift = winRate - bookRate;
  return {
    key: `${row.category}::${row.name}`,
    name: row.name,
    category: row.category,
    samples: row.samples,
    wins: row.wins,
    losses: row.losses,
    winRate,
    lift,
    net: row.net,
    aligned: row.aligned,
    grade: gradeFor(row.samples, winRate, lift),
  };
}

export function printPerformance(trades: ScoredClosed[]): {
  bookRate: number;
  decided: number;
  signals: PrintStat[];
  categories: CategoryPrintStat[];
  highest: PrintStat | null;
  lowest: PrintStat | null;
} {
  const decidedTrades = trades.filter(
    (trade) => trade.outcome === "won" || trade.outcome === "lost",
  );
  const wins = decidedTrades.filter((trade) => trade.outcome === "won").length;
  const bookRate = decidedTrades.length === 0 ? 0 : (wins / decidedTrades.length) * 100;
  const byKey = new Map<string, Acc>();
  const byCategory = new Map<Category, Acc>();

  for (const trade of decidedTrades) {
    const calcSide = trade.calculator?.side === "short" ? "short" : "long";
    const pnl = realized(trade);
    const won = trade.outcome === "won";
    for (const item of trade.confluences) {
      const side = itemWinning(item);
      if (side === "even") continue;
      const key = `${item.category}::${item.name}`;
      const signal = byKey.get(key) ?? emptyAcc(item.name, item.category);
      signal.samples += 1;
      if (won) signal.wins += 1;
      else signal.losses += 1;
      signal.net += pnl;
      const agrees =
        (side === "bullish" && calcSide === "long") ||
        (side === "bearish" && calcSide === "short");
      if (agrees) signal.aligned += 1;
      byKey.set(key, signal);

      const cat = byCategory.get(item.category) ?? emptyAcc(item.category, item.category);
      cat.samples += 1;
      if (won) cat.wins += 1;
      else cat.losses += 1;
      cat.net += pnl;
      if (agrees) cat.aligned += 1;
      byCategory.set(item.category, cat);
    }
  }

  const signals = [...byKey.values()]
    .map((row) => toStat(row, bookRate))
    .sort((a, b) => b.lift - a.lift || b.samples - a.samples);

  const ranked = signals.filter((row) => row.samples >= 2);
  const highest = ranked[0] ?? null;
  const lowest =
    ranked.length > 1 ? ranked[ranked.length - 1] : ranked.length === 1 ? ranked[0] : null;

  const categories = CATEGORIES.map((category) => {
    const row = byCategory.get(category) ?? emptyAcc(category, category);
    const stat = toStat(row, bookRate);
    return {
      category,
      samples: stat.samples,
      wins: stat.wins,
      losses: stat.losses,
      winRate: stat.winRate,
      lift: stat.lift,
      net: stat.net,
      grade: stat.grade,
    };
  });

  return {
    bookRate,
    decided: decidedTrades.length,
    signals,
    categories,
    highest,
    lowest: highest && lowest && highest.key === lowest.key ? null : lowest,
  };
}
