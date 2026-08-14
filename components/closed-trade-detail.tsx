"use client";

import {
  calculateTrade,
  DEFAULT_LEVERAGE,
  isStockOptions,
  money,
  qty,
  tickLabel,
} from "@/lib/calculator";
import {
  categoryScore,
  formatScore,
  itemMax,
  itemPoints,
  pointsLabel,
} from "@/lib/scoring";
import type { ClosedTrade, Confluence, ScoreResult, TfSide } from "@/lib/types";
import {
  CATEGORIES,
  CATEGORY_SHORT,
  TIMEFRAMES,
  isNewsCategory,
  isZoneCategory,
  newsToneFromSentiment,
  resolveCategory,
} from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ClosedScored = ClosedTrade & { result: ScoreResult };

const ASSET_LABEL = {
  forex: "FOREX",
  stock: "STOCK",
  etf: "ETF",
  crypto: "CRYPTO",
} as const;

const SIDE_LABEL: Record<TfSide | "even", string> = {
  bullish: "LONG",
  bearish: "SHORT",
  range: "RANGE",
  even: "FLAT",
};

const WIN_TONE: Record<TfSide | "even", string> = {
  bullish: "#b6ff3b",
  bearish: "#ff3b5c",
  range: "#f4c430",
  even: "#8b907c",
};

export function ClosedTradeDetail({
  trade,
  open,
  onOpenChange,
}: {
  trade: ClosedScored | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-white/8 bg-[#0c0e14] sm:max-w-xl"
      >
        {trade ? <DetailBody trade={trade} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({ trade }: { trade: ClosedScored }) {
  const won = trade.outcome === "won";
  const lost = trade.outcome === "lost";

  return (
    <>
      <SheetHeader className="border-b border-white/8">
        <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
          CLOSED TICKET
        </p>
        <SheetTitle className="font-mono text-2xl tracking-[0.16em]">
          {trade.ticker || "UNTITLED"}
        </SheetTitle>
        <SheetDescription>
          {formatStamp(trade.closedAt)}
          {won ? " · Won" : lost ? " · Lost" : ""} · Grade {trade.result.grade}
        </SheetDescription>
      </SheetHeader>

      <ClosedTicketData trade={trade} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6" />
    </>
  );
}

export function ClosedTicketData({
  trade,
  className,
}: {
  trade: ClosedScored;
  className?: string;
}) {
  const calc = calculateTrade(trade.calculator, trade.ticker);
  const input = trade.calculator;
  const options = isStockOptions(input);
  const won = trade.outcome === "won";
  const lost = trade.outcome === "lost";
  const pnl =
    trade.realizedPnl ??
    (won ? calc.takeProfit : lost ? -Math.abs(calc.stopLoss) : null);
  const target = input.target > 0 ? input.target : calc.derivedTarget;
  const currency = input.accountCurrency;
  const pip = tickLabel(input);
  const side = options
    ? `${input.side === "long" ? "BUY" : "SELL"} ${input.optionRight.toUpperCase()}`
    : input.side === "long"
      ? "LONG"
      : "SHORT";

  return (
      <div className={cn("space-y-5", className)}>
        <div className="flex flex-wrap items-center gap-2">
          {won || lost ? (
            <span
              className={cn(
                "rounded-full px-3 py-1 font-mono text-[11px] font-black tracking-widest",
                won
                  ? "bg-[#b6ff3b] text-[#0b1204] shadow-[0_0_16px_rgb(182_255_59/0.55)]"
                  : "bg-[#ff3b5c] text-white shadow-[0_0_16px_rgb(255_59_92/0.55)]",
              )}
            >
              {won ? "WON" : "LOST"}
            </span>
          ) : null}
          <span
            className="rounded-full px-2.5 py-1 font-mono text-[10px] tracking-widest"
            style={{
              background: `${WIN_TONE[input.side === "long" ? "bullish" : "bearish"]}22`,
              color: WIN_TONE[input.side === "long" ? "bullish" : "bearish"],
            }}
          >
            {side}
          </span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-widest">
            {trade.result.band.toUpperCase()} · {formatScore(trade.result.score)}
          </span>
          <span className="rounded-full border border-gold/30 px-2.5 py-1 font-mono text-[10px] tracking-widest text-gold">
            {SIDE_LABEL[trade.result.overall.winning]}
          </span>
        </div>

        {pnl !== null ? (
          <p
            className="font-mono text-3xl font-black tabular-nums tracking-tight"
            style={{ color: pnl >= 0 ? "#b6ff3b" : "#ff3b5c" }}
          >
            {pnl > 0 ? "+" : pnl < 0 ? "−" : ""}
            {money(Math.abs(pnl), currency)}
          </p>
        ) : null}

        <p className="text-sm leading-relaxed text-muted-foreground">
          {trade.result.hint}
        </p>

        <section>
          <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
            SETUP
          </p>
          {options ? (
            <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
              {input.optionRight.toUpperCase()}
              {input.strike > 0 ? ` · ${qty(input.strike, 2)} STRIKE` : ""}
              {input.expiry ? ` · ${input.expiry}` : ""}
            </p>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <Stat
              label={options ? "PREMIUM" : "ENTRY"}
              value={level(input.entry)}
            />
            <Stat label="STOP" value={level(input.stop)} tone="#ff3b5c" />
            <Stat label="TARGET" value={level(target)} tone="#b6ff3b" />
            <Stat
              label={calc.sizeLabel.toUpperCase()}
              value={calc.size > 0 ? qty(calc.size) : "—"}
            />
          </div>
        </section>

        <section>
          <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
            TICKET
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <Stat
              label="RISK"
              value={money(calc.stopLoss, currency)}
              tone="#ff3b5c"
            />
            <Stat
              label="REWARD"
              value={money(calc.takeProfit, currency)}
              tone="#b6ff3b"
            />
            <Stat
              label="R:R"
              value={calc.rewardRisk > 0 ? `${calc.rewardRisk.toFixed(2)}R` : "—"}
              tone="#f4c430"
            />
            <Stat
              label={`STOP ${pip}S`}
              value={qty(calc.ticksToStop, 1)}
            />
            <Stat
              label={`TARGET ${pip}S`}
              value={qty(calc.ticksToTarget, 1)}
            />
            <Stat
              label="NOTIONAL"
              value={money(calc.notional, currency)}
            />
            <Stat label="ASSET" value={ASSET_LABEL[input.asset]} />
            <Stat
              label="BALANCE"
              value={money(input.accountBalance, currency)}
            />
            <Stat
              label="MARGIN"
              value={
                input.asset === "forex"
                  ? `1:${DEFAULT_LEVERAGE[input.asset]} · ${money(calc.margin, currency)}`
                  : money(calc.margin, currency)
              }
            />
            <Stat label="RISK %" value={`${input.riskPercent}%`} />
            <Stat label="REWARD %" value={`${input.rewardPercent}%`} />
            <Stat
              label="CONVICTION"
              value={`${Math.round(trade.result.overall.conviction)}%`}
            />
          </div>
        </section>

        <section>
          <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
            RAILS
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {CATEGORIES.map((category) => {
              const score = categoryScore(trade.result, category);
              const winning = trade.result.byCategory[category]?.winning ?? "even";
              return (
                <li
                  key={category}
                  className="rounded-lg border border-white/8 bg-black/30 px-2 py-1.5"
                >
                  <p className="font-mono text-[8px] tracking-[0.22em] text-muted-foreground">
                    {CATEGORY_SHORT[category]}
                  </p>
                  <p
                    className="mt-0.5 font-mono text-sm font-semibold tabular-nums"
                    style={{ color: WIN_TONE[winning] }}
                  >
                    {formatScore(score)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
            CONFLUENCES
          </p>
          <div className="mt-2 space-y-3">
            {CATEGORIES.map((category) => {
              const rows = trade.confluences.filter(
                (item) => resolveCategory(item.category) === category,
              );
              if (rows.length === 0) return null;
              const score = categoryScore(trade.result, category);
              const winning =
                trade.result.byCategory[category]?.winning ?? "even";
              return (
                <div
                  key={category}
                  className="overflow-hidden rounded-xl border border-white/8 bg-black/25"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
                    <p className="font-mono text-[10px] tracking-[0.22em] text-gold">
                      {category.toUpperCase()}
                    </p>
                    <p
                      className="font-mono text-[10px] tracking-widest"
                      style={{ color: WIN_TONE[winning] }}
                    >
                      {SIDE_LABEL[winning]} · {formatScore(score)}
                    </p>
                  </div>
                  <ul className="divide-y divide-white/6">
                    {rows.map((item) => (
                      <ConfluenceRow key={item.id} item={item} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>
  );
}

function ConfluenceRow({ item }: { item: Confluence }) {
  const earned = itemPoints(item);
  const max = itemMax(item);
  const pct = max > 0 ? (earned / max) * 100 : 0;
  const zone = isZoneCategory(item.category);
  const news = isNewsCategory(item.category);
  const tone =
    item.newsTone ?? newsToneFromSentiment(item.sentiment ?? 50);
  const bad = tone === "bad";

  return (
    <li className={cn("px-3 py-2", item.active ? "" : "opacity-40")}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm">{item.name}</p>
        <p className="shrink-0 font-mono text-[10px] tabular-nums tracking-widest text-gold">
          {pointsLabel(earned)} / {pointsLabel(max)}
        </p>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gold"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {news ? (
          <>
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[9px] tracking-widest"
              style={{
                background: bad ? "#ff3b5c" : "#b6ff3b",
                color: bad ? "#fff" : "#0b1204",
              }}
            >
              {bad ? "BAD NEWS" : "GOOD NEWS"}
            </span>
            <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground">
              SENT {Math.round(item.sentiment ?? 50)}
            </span>
          </>
        ) : (
          TIMEFRAMES.map((timeframe) => {
            const bias = item.biasByTf?.[timeframe] ?? "bullish";
            const play = item.zoneByTf?.[timeframe] ?? "reaction";
            return (
              <span
                key={timeframe}
                className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest"
                style={{ color: WIN_TONE[bias] }}
              >
                {timeframe}M {SIDE_LABEL[bias]}
                {zone ? ` · ${play.toUpperCase()}` : ""}
              </span>
            );
          })
        )}
        {item.candleConfirmed ? (
          <span className="rounded-md bg-[#4de8c8]/15 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-[#4de8c8]">
            CANDLE
          </span>
        ) : null}
        {!item.active ? (
          <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground">
            OFF
          </span>
        ) : null}
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-2 py-1.5">
      <p className="font-mono text-[8px] tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-0.5 font-mono text-xs font-semibold tabular-nums tracking-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function level(value: number) {
  return value > 0 ? qty(value, 4) : "—";
}

function formatStamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}
