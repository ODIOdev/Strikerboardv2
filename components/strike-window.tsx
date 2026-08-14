"use client";

import { motion } from "framer-motion";
import { categoryScore } from "@/lib/scoring";
import type { Band, ScoreResult, TfSide, TradeOutcome } from "@/lib/types";
import { CATEGORY_SHORT, RAIL_CATEGORIES } from "@/lib/types";

type StrikeWindowProps = {
  result: ScoreResult;
  onClose: (outcome: TradeOutcome) => void;
};

const SIDE: Record<
  TfSide | "even",
  { label: string; color: string; dim: string }
> = {
  bullish: {
    label: "LONG",
    color: "#b6ff3b",
    dim: "rgb(182 255 59 / 18%)",
  },
  bearish: {
    label: "SHORT",
    color: "#ff3b5c",
    dim: "rgb(255 59 92 / 18%)",
  },
  range: {
    label: "RANGE",
    color: "#f4c430",
    dim: "rgb(244 196 48 / 18%)",
  },
  even: {
    label: "FLAT",
    color: "#8b907c",
    dim: "rgb(139 144 124 / 16%)",
  },
};

function copyFor(winning: TfSide | "even", band: Band): string {
  if (winning === "even") return "No side has the print. Arm the board first.";
  if (winning === "range") {
    if (band === "Prime") return "Range window open. Fade the edges or stand down.";
    if (band === "Valid") return "Range is tradable, but a rail is still thin.";
    return "Do not fade yet. Arm the board first.";
  }
  const side = winning === "bullish" ? "long" : "short";
  if (band === "Prime") {
    return `${winning === "bullish" ? "Long" : "Short"} window open. Confluence is stacked.`;
  }
  if (band === "Valid") return `Tradable ${side}, but a rail is still thin.`;
  return `Do not fire ${side}. Arm the board first.`;
}

function pipCount(score: number) {
  return Math.max(0, Math.min(5, Math.round(score / 20)));
}

function pipColor(winning: TfSide | "even", score: number) {
  if (score >= 80) return "var(--gold)";
  if (winning === "bearish") return "#ff3b5c";
  if (winning === "bullish") return "#b6ff3b";
  if (winning === "range") return "#f4c430";
  return "#8b907c";
}

export function StrikeWindow({ result, onClose }: StrikeWindowProps) {
  const side = SIDE[result.overall.winning];
  const copy = copyFor(result.overall.winning, result.band);
  const blocker = [...result.contributions]
    .filter((item) => item.earned < item.max)
    .sort((a, b) => b.max - b.earned - (a.max - a.earned))[0];

  return (
    <div className="relative isolate min-h-[220px] overflow-hidden rounded-2xl border border-white/8 bg-black/35 p-4">
      <span
        className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full blur-3xl"
        style={{ background: side.dim }}
      />

      <div className="relative">
        <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
          STRIKE WINDOW
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
      </div>

      <motion.h2
        key={side.label}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative mt-4 w-fit text-5xl font-black tracking-tighter sm:text-6xl"
        style={{ color: side.color, textShadow: `0 0 32px ${side.dim}` }}
      >
        {side.label}
      </motion.h2>

      <div className="relative mt-4 grid grid-cols-4 gap-2">
        {RAIL_CATEGORIES.map((category) => {
          const score = categoryScore(result, category);
          const lit = pipCount(score);
          const winning = result.byCategory[category]?.winning ?? "even";
          return (
            <div key={category} className="rounded-lg border border-white/8 bg-black/30 px-2 py-2">
              <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
                {CATEGORY_SHORT[category]}
              </p>
              <div className="mt-1.5 flex gap-0.5">
                {Array.from({ length: 5 }, (_, index) => (
                  <span
                    key={index}
                    className="h-1.5 flex-1 rounded-full"
                    style={{
                      background:
                        index < lit
                          ? pipColor(winning, score)
                          : "rgb(255 255 255 / 10%)",
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-4 flex flex-col gap-2">
        <p className="min-w-0 truncate font-mono text-[10px] tracking-wide text-muted-foreground">
          {blocker
            ? `BLOCKER · ${blocker.name.toUpperCase()}`
            : "ALL RAILS ARMED"}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onClose("won")}
            className="group/won relative overflow-hidden rounded-md border border-[#b6ff3b]/40 bg-[#b6ff3b] px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-widest text-[#0b1204] shadow-[0_0_18px_rgb(182_255_59/0.35)] transition hover:bg-[#d4ff7a]"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-500 ease-out group-hover/won:translate-x-full" />
            <span className="relative">WON TRADE</span>
          </button>
          <button
            type="button"
            onClick={() => onClose("lost")}
            className="group/lost relative overflow-hidden rounded-md border border-[#ff3b5c]/40 bg-[#ff3b5c] px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-widest text-white shadow-[0_0_18px_rgb(255_59_92/0.35)] transition hover:bg-[#ff5c76]"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-500 ease-out group-hover/lost:translate-x-full" />
            <span className="relative">LOST TRADE</span>
          </button>
        </div>
      </div>
    </div>
  );
}
