"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { pointsLabel } from "@/lib/scoring";
import { formatElapsed } from "@/lib/time";
import { useNow } from "@/hooks/use-now";
import { GRADE_COLOR, WAVES, type CalculatorInput, type OverallBias, type TfSide, type Wave } from "@/lib/types";
import { CloseTradeControl } from "@/components/strike-window";

type BiasHudProps = {
  overall: OverallBias;
  grade: Wave;
  earned: number;
  startedAt: number;
  ticker: string;
  calculator: CalculatorInput;
  onTicker: (ticker: string) => void;
  onClose: (exitPrice: number) => void;
};

const TONE: Record<
  TfSide | "even",
  { color: string; dim: string; label: string; side: string }
> = {
  bullish: {
    color: "#b6ff3b",
    dim: "rgb(182 255 59 / 18%)",
    label: "BULL",
    side: "LONG",
  },
  bearish: {
    color: "#ff3b5c",
    dim: "rgb(255 59 92 / 18%)",
    label: "BEAR",
    side: "SHORT",
  },
  range: {
    color: "#f4c430",
    dim: "rgb(244 196 48 / 18%)",
    label: "RANGE",
    side: "RANGE",
  },
  even: {
    color: "#8b907c",
    dim: "rgb(139 144 124 / 16%)",
    label: "FLAT",
    side: "FLAT",
  },
};

export function BiasHud({
  overall,
  grade,
  earned,
  startedAt,
  ticker,
  calculator,
  onTicker,
  onClose,
}: BiasHudProps) {
  const now = useNow();
  const [draft, setDraft] = useState(ticker);
  const [seenTicker, setSeenTicker] = useState(ticker);
  if (ticker !== seenTicker) {
    setSeenTicker(ticker);
    setDraft(ticker);
  }
  const tone = TONE[overall.winning];
  const total =
    overall.longEarned + overall.shortEarned + overall.rangeEarned;
  const longPct = total === 0 ? 0 : (overall.longEarned / total) * 100;
  const shortPct = total === 0 ? 0 : (overall.shortEarned / total) * 100;
  const rangePct = total === 0 ? 0 : (overall.rangeEarned / total) * 100;

  return (
    <section
      data-bias={
        overall.winning === "even" ? undefined : overall.winning
      }
      className="relative isolate flex min-h-[260px] w-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-black/35 text-left"
    >
      <span className="absolute inset-0 desk-grid opacity-40" />
      <span
        className="absolute -top-16 -left-10 size-56 rounded-full blur-3xl transition-colors"
        style={{ background: tone.dim }}
      />
      <span className="scanlines absolute inset-0 opacity-40" />

      <div className="relative z-10 flex w-full flex-1 flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden font-mono text-xs tracking-[0.4em] text-muted-foreground sm:text-sm lg:block">
            TRADE BIAS
          </p>
          <form
            className="min-w-0 flex-1 lg:hidden"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              onTicker(draft);
            }}
          >
            <div className="relative max-w-[11rem]">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value.toUpperCase())}
                placeholder="TICKER"
                aria-label="Ticker"
                className="h-8 border-white/10 bg-black/40 pr-12 font-mono text-sm font-semibold tracking-[0.22em] uppercase"
              />
              <button
                type="submit"
                className="absolute top-1/2 right-1 h-6 -translate-y-1/2 rounded-md bg-gold px-1.5 font-mono text-[9px] font-bold tracking-widest text-[#0b1204]"
              >
                GO
              </button>
            </div>
          </form>
          <span
            className="rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-xs tracking-widest sm:text-sm"
            style={{ color: tone.color }}
          >
            {tone.side}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-between gap-4">
          <p
            className="font-mono text-4xl font-black tracking-tighter text-white sm:text-5xl"
            style={{ textShadow: "0 0 32px rgb(255 255 255 / 18%)" }}
          >
            +{pointsLabel(earned)}
          </p>
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
              SESSION
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-gold sm:text-3xl">
              {now ? formatElapsed(startedAt, now) : "00:00:00"}
            </p>
          </div>
        </div>

        <motion.div
          key={overall.winning}
          initial={{ y: 18, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-end justify-between gap-3">
            <h2
              className="text-5xl font-black tracking-tighter sm:text-6xl"
              style={{
                color: tone.color,
                textShadow: `0 0 32px ${tone.dim}`,
              }}
            >
              {tone.label}
            </h2>
            <div
              className="flex items-center gap-2.5"
              aria-label={`Trade grade ${grade}`}
            >
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 font-black tracking-tighter sm:size-14 sm:text-3xl"
                style={{
                  borderColor: GRADE_COLOR[grade],
                  color: GRADE_COLOR[grade],
                  background: `${GRADE_COLOR[grade]}18`,
                  boxShadow: `0 0 24px ${GRADE_COLOR[grade]}55`,
                }}
              >
                {grade}
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-mono text-[9px] tracking-[0.28em] text-muted-foreground">
                  GRADE
                </p>
                {WAVES.map((item) => {
                  const active = item === grade;
                  return (
                    <div key={item} className="flex items-center gap-1.5">
                      <span
                        className="w-3 font-mono text-[9px] tracking-widest"
                        style={{
                          color: GRADE_COLOR[item],
                          opacity: active ? 1 : 0.35,
                        }}
                      >
                        {item}
                      </span>
                      <span
                        className="h-1 w-10 rounded-full"
                        style={{
                          background: active
                            ? GRADE_COLOR[item]
                            : "rgb(255 255 255 / 10%)",
                          boxShadow: active
                            ? `0 0 10px ${GRADE_COLOR[item]}`
                            : undefined,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/8">
            <span
              className="h-full bg-[#b6ff3b]"
              style={{ width: `${longPct}%` }}
            />
            <span
              className="h-full bg-[#ff3b5c]"
              style={{ width: `${shortPct}%` }}
            />
            <span
              className="h-full bg-[#f4c430]"
              style={{ width: `${rangePct}%` }}
            />
          </div>
        </motion.div>
        <CloseTradeControl
          ticker={ticker}
          calculator={calculator}
          onClose={onClose}
          className="mt-auto"
        />
      </div>
    </section>
  );
}
