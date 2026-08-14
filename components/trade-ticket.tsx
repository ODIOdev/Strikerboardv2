"use client";

import { formatScore } from "@/lib/scoring";
import type { Band, TfSide } from "@/lib/types";

type TradeTicketProps = {
  ticker: string;
  winning: TfSide | "even";
  score: number;
  band: Band;
  hint: string;
};

const SIDE_LABEL: Record<TfSide | "even", string> = {
  bullish: "BULL",
  bearish: "BEAR",
  range: "RANGE",
  even: "FLAT",
};

export function TradeTicket({
  ticker,
  winning,
  score,
  band,
  hint,
}: TradeTicketProps) {
  const symbol = ticker || "----";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-black/50 to-black/20 p-4">
      <p className="font-mono text-[10px] tracking-[0.4em] text-gold">TRADE TICKET</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-3xl font-bold tracking-[0.18em]">{symbol}</p>
          <p className="mt-1 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {symbol} · {SIDE_LABEL[winning]} · {formatScore(score)}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className="rounded-full px-2.5 py-1 font-mono text-[10px] tracking-widest"
            style={{ background: "var(--bias)", color: "var(--bias-ink)" }}
          >
            {SIDE_LABEL[winning]}
          </span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-widest">
            {band.toUpperCase()}
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{hint}</p>
    </article>
  );
}
