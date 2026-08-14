"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculateTrade,
  money,
  outcomeAtExit,
  pnlAtExit,
  qty,
} from "@/lib/calculator";
import { categoryScore } from "@/lib/scoring";
import type { Band, CalculatorInput, ScoreResult, TfSide } from "@/lib/types";
import { CATEGORY_SHORT, RAIL_CATEGORIES } from "@/lib/types";

type StrikeWindowProps = {
  result: ScoreResult;
  ticker: string;
  calculator: CalculatorInput;
  onClose: (exitPrice: number) => void;
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

export function StrikeWindow({
  result,
  ticker,
  calculator,
  onClose,
}: StrikeWindowProps) {
  const side = SIDE[result.overall.winning];
  const copy = copyFor(result.overall.winning, result.band);
  const blocker = [...result.contributions]
    .filter((item) => item.earned < item.max)
    .sort((a, b) => b.max - b.earned - (a.max - a.earned))[0];
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");

  const calc = calculateTrade(calculator, ticker);
  const exit = Number(price);
  const ready =
    Number.isFinite(exit) &&
    exit > 0 &&
    calculator.entry > 0 &&
    calc.size > 0;
  const preview = useMemo(() => {
    if (!(Number.isFinite(exit) && exit > 0 && calculator.entry > 0)) {
      return null;
    }
    const pnl = pnlAtExit(calculator, ticker, exit);
    const outcome = outcomeAtExit(calculator, exit);
    const move =
      calculator.side === "short"
        ? calculator.entry - exit
        : exit - calculator.entry;
    return { pnl, outcome, size: calc.size, sizeLabel: calc.sizeLabel, move };
  }, [calc.size, calc.sizeLabel, calculator, ticker, exit]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    onClose(exit);
    setOpen(false);
  }

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
        <button
          type="button"
          onClick={() => {
            setPrice("");
            setOpen(true);
          }}
          className="group/close relative overflow-hidden rounded-md border border-[#ff3b5c]/40 bg-[#ff3b5c] px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-widest text-white shadow-[0_0_18px_rgb(255_59_92/0.35)] transition hover:border-white hover:bg-white hover:text-[#1a0508] hover:shadow-[0_0_18px_rgb(255_255_255/0.28)]"
        >
          <span className="relative">CLOSE TRADE</span>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader className="border-b border-white/8 pb-3">
            <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
              EXIT
            </p>
            <DialogTitle className="font-mono text-xl tracking-[0.16em]">
              {ticker || "UNTITLED"}
            </DialogTitle>
            <DialogDescription>
              Enter the asset price. Win or loss is read from the calculator
              ticket.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-4 px-4 pb-4">
            <div className="grid grid-cols-4 gap-1.5">
              <Level
                label="ENTRY"
                value={calculator.entry}
                tone={calculator.side === "long" ? "#b6ff3b" : "#ff3b5c"}
              />
              <Level label="STOP" value={calculator.stop} tone="#ff3b5c" />
              <Level label="TARGET" value={calculator.target} tone="#b6ff3b" />
              <Level
                label={calc.sizeLabel.toUpperCase()}
                value={calc.size}
                tone="#f4c430"
              />
            </div>
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
              {calculator.side === "long" ? "LONG" : "SHORT"}
              {calculator.entry <= 0 ? " · SET ENTRY ON THE CALCULATOR" : ""}
              {calculator.entry > 0 && calc.size <= 0
                ? ` · SET ${calc.sizeLabel.toUpperCase()} ON THE CALCULATOR`
                : ""}
            </p>
            <label className="space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.28em] text-gold">
                ASSET PRICE
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Exit price"
                autoFocus
                className="border-gold/40 bg-gold/10 font-mono caret-gold focus-visible:border-gold focus-visible:ring-gold/40"
              />
            </label>

            {preview ? (
              <div
                className="rounded-xl border px-3 py-3"
                style={{
                  borderColor:
                    preview.outcome === "won"
                      ? "rgb(182 255 59 / 40%)"
                      : "rgb(255 59 92 / 40%)",
                  background:
                    preview.outcome === "won"
                      ? "rgb(182 255 59 / 10%)"
                      : "rgb(255 59 92 / 10%)",
                }}
              >
                <p
                  className="font-mono text-[10px] font-black tracking-widest"
                  style={{
                    color: preview.outcome === "won" ? "#b6ff3b" : "#ff3b5c",
                  }}
                >
                  {preview.outcome === "won" ? "WON" : "LOST"}
                </p>
                <p
                  className="mt-1 font-mono text-3xl font-black tracking-tighter"
                  style={{
                    color: preview.pnl >= 0 ? "#b6ff3b" : "#ff3b5c",
                  }}
                >
                  {preview.pnl > 0 ? "+" : preview.pnl < 0 ? "−" : ""}
                  {money(Math.abs(preview.pnl), calculator.accountCurrency)}
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
                  {qty(preview.size)} {preview.sizeLabel.toUpperCase()}
                  {" · "}
                  {preview.move > 0 ? "+" : preview.move < 0 ? "−" : ""}
                  {qty(Math.abs(preview.move), 4)} / UNIT
                </p>
              </div>
            ) : (
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                PRICE VS ENTRY / STOP / TARGET DECIDES THE PRINT
              </p>
            )}

            <Button
              type="submit"
              disabled={!ready}
              className="font-mono tracking-widest"
            >
              CLOSE TRADE
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Level({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-2 py-1.5">
      <p className="font-mono text-[8px] tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-0.5 font-mono text-xs font-semibold tabular-nums"
        style={tone ? { color: tone } : undefined}
      >
        {value > 0 ? qty(value, 4) : "—"}
      </p>
    </div>
  );
}
