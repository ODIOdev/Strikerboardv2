import type {
  Band,
  Category,
  CategoryScore,
  Confluence,
  OverallBias,
  ScoreResult,
  Timeframe,
  TfSide,
  Wave,
  ZonePlay,
} from "./types";
import {
  CATEGORIES,
  TIMEFRAMES,
  clampSentiment,
  createTfBias,
  isNewsCategory,
  isZoneCategory,
  resolveCategory,
} from "./types";

export const ZONE_PLAY_POINTS: Record<ZonePlay, number> = {
  reaction: 50,
  breakout: 75,
};

export const TF_SPAN = 0.8 + 0.9 + 1 + 1.1;

function biasMap(item: Confluence) {
  return item.biasByTf ?? createTfBias("bullish");
}

export function selectedTimeframes(item: Confluence): Timeframe[] {
  const map = biasMap(item);
  return TIMEFRAMES.filter(
    (timeframe) => map[timeframe] === "bullish" || map[timeframe] === "bearish",
  );
}

export function selectedSpan(item: Confluence): number {
  return selectedTimeframes(item).reduce(
    (sum, timeframe) => sum + timeframeMultiplier(timeframe),
    0,
  );
}

export function bandFor(score: number): Band {
  if (score >= 80) return "Prime";
  if (score >= 60) return "Valid";
  return "Watch";
}

export function gradeFor(score: number): Wave {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  return "C";
}

export function timeframeMultiplier(timeframe: Timeframe): number {
  if (timeframe === 1) return 0.8;
  if (timeframe === 5) return 0.9;
  if (timeframe === 30) return 1.1;
  return 1;
}

export function playWeight(item: Confluence, timeframe: Timeframe): number {
  if (!isZoneCategory(item.category)) return item.weight;
  const play = item.zoneByTf?.[timeframe] ?? "reaction";
  return ZONE_PLAY_POINTS[play];
}

export const CANDLE_CONFIRM_BONUS = 1.25;

export function newsSentiment(item: Confluence): number {
  if (typeof item.sentiment === "number" && Number.isFinite(item.sentiment)) {
    return clampSentiment(item.sentiment);
  }
  const map = item.biasByTf ?? createTfBias("bullish");
  const bear = TIMEFRAMES.filter((tf) => map[tf] === "bearish").length;
  const bull = TIMEFRAMES.filter((tf) => map[tf] === "bullish").length;
  if (bear > bull) return 0;
  if (bull > bear) return 100;
  return 50;
}

export function newsHeat(item: Confluence): number {
  return Math.abs(newsSentiment(item) - 50) / 50;
}

export function tfPoints(item: Confluence, timeframe: Timeframe): number {
  const side = biasMap(item)[timeframe];
  if (side === "range") return 0;
  if (isNewsCategory(item.category)) {
    return 100 * timeframeMultiplier(timeframe) * newsHeat(item);
  }
  const base = playWeight(item, timeframe) * timeframeMultiplier(timeframe);
  return item.candleConfirmed ? base * CANDLE_CONFIRM_BONUS : base;
}

export function sidePoints(item: Confluence, side: TfSide): number {
  if (side === "range") return 0;
  const map = biasMap(item);
  return TIMEFRAMES.reduce((sum, timeframe) => {
    return map[timeframe] === side ? sum + tfPoints(item, timeframe) : sum;
  }, 0);
}

export function itemMax(item: Confluence): number {
  const span = selectedSpan(item);
  if (span === 0) return 0;
  if (isNewsCategory(item.category)) return 100 * span;
  if (!isZoneCategory(item.category)) return item.weight * span;
  return ZONE_PLAY_POINTS.breakout * span;
}

export function itemPoints(item: Confluence): number {
  return Math.max(sidePoints(item, "bullish"), sidePoints(item, "bearish"));
}

export function actionHint(winning: TfSide | "even", band: Band): string {
  if (winning === "even") {
    return "Board is split. No side has the print yet.";
  }
  if (winning === "range") {
    if (band === "Prime") {
      return "Range confluence is stacked. Fade the edges or stand down.";
    }
    if (band === "Valid") {
      return "Range is tradable, but a rail is thin. Wait for the next print.";
    }
    return "Range lean is weak. Fill the board before you fade.";
  }
  const side = winning === "bullish" ? "long" : "short";
  if (band === "Prime") {
    return `Strike window open — ${side} confluence is stacked. Size the ticket.`;
  }
  if (band === "Valid") {
    return `Setup is tradable ${side}, but a rail is thin. Size down or wait for one more print.`;
  }
  return `Stand down on the ${side}. Fill the board before you fire.`;
}

function sideFromPoints(
  longEarned: number,
  shortEarned: number,
  rangeEarned: number,
): TfSide | "even" {
  const best = Math.max(longEarned, shortEarned, rangeEarned);
  if (best === 0) return "even";
  const tied =
    Number(longEarned === best) +
    Number(shortEarned === best) +
    Number(rangeEarned === best);
  if (tied > 1) return "even";
  if (longEarned === best) return "bullish";
  if (shortEarned === best) return "bearish";
  return "range";
}

function majorityVote(votes: Array<TfSide | "even">): TfSide | "even" {
  const bull = votes.filter((vote) => vote === "bullish").length;
  const bear = votes.filter((vote) => vote === "bearish").length;
  const range = votes.filter((vote) => vote === "range").length;
  const best = Math.max(bull, bear, range);
  if (best === 0) return "even";
  const tied =
    Number(bull === best) + Number(bear === best) + Number(range === best);
  if (tied > 1) return "even";
  if (bull === best) return "bullish";
  if (bear === best) return "bearish";
  return "range";
}

function timeframeVote(
  group: Confluence[],
  timeframe: Timeframe,
): TfSide | "even" {
  const longEarned = group.reduce((sum, item) => {
    return biasMap(item)[timeframe] === "bullish"
      ? sum + tfPoints(item, timeframe)
      : sum;
  }, 0);
  const shortEarned = group.reduce((sum, item) => {
    return biasMap(item)[timeframe] === "bearish"
      ? sum + tfPoints(item, timeframe)
      : sum;
  }, 0);
  return sideFromPoints(longEarned, shortEarned, 0);
}

export function overallBias(confluences: Confluence[]): OverallBias {
  let longEarned = 0;
  let shortEarned = 0;
  for (const item of confluences) {
    longEarned += sidePoints(item, "bullish");
    shortEarned += sidePoints(item, "bearish");
  }
  const winning = sideFromPoints(longEarned, shortEarned, 0);
  const total = longEarned + shortEarned;
  const best = Math.max(longEarned, shortEarned);
  return {
    winning,
    longEarned,
    shortEarned,
    rangeEarned: 0,
    conviction: total === 0 ? 0 : (best / total) * 100,
  };
}

export function scoreBoard(confluences: Confluence[]): ScoreResult {
  const live = confluences.filter((item) => item.active);
  const overall = overallBias(live);
  const max = live.reduce((sum, item) => sum + itemMax(item), 0);
  const earned = live.reduce((sum, item) => sum + itemPoints(item), 0);
  const score = max === 0 ? 0 : (earned / max) * 100;
  const band = bandFor(score);
  const grade = gradeFor(score);

  const byCategory = Object.fromEntries(
    CATEGORIES.map((category) => {
      const group = live.filter(
        (item) => resolveCategory(item.category) === category,
      );
      const catMax = group.reduce((sum, item) => sum + itemMax(item), 0);
      const longEarned = group.reduce(
        (sum, item) => sum + sidePoints(item, "bullish"),
        0,
      );
      const shortEarned = group.reduce(
        (sum, item) => sum + sidePoints(item, "bearish"),
        0,
      );
      const catEarned = Math.max(longEarned, shortEarned);
      const cat: CategoryScore = {
        score: catMax === 0 ? 0 : (catEarned / catMax) * 100,
        earned: catEarned,
        max: catMax,
        longEarned,
        shortEarned,
        rangeEarned: 0,
        winning: majorityVote(
          TIMEFRAMES.map((timeframe) => timeframeVote(group, timeframe)),
        ),
      };
      return [category, cat];
    }),
  ) as ScoreResult["byCategory"];

  const contributions = live
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: (resolveCategory(item.category) ?? item.category) as Category,
      earned: itemPoints(item),
      max: itemMax(item),
      winning: sideFromPoints(
        sidePoints(item, "bullish"),
        sidePoints(item, "bearish"),
        0,
      ),
    }))
    .sort((a, b) => b.earned - a.earned || b.max - a.max);

  return {
    score,
    earned,
    max,
    band,
    grade,
    overall,
    byCategory,
    contributions,
    hint: actionHint(overall.winning, band),
  };
}

export function categoryScore(
  result: ScoreResult,
  category: Category,
): number {
  return result.byCategory?.[category]?.score ?? 0;
}

export function formatScore(score: number): string {
  return Math.round(score).toString();
}

export function pointsLabel(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}
