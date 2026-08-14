"use client";

import { useMemo, useState } from "react";
import {
  calculateTrade,
  isStockOptions,
  money,
  qty,
} from "@/lib/calculator";
import { ClosedTicketData, ClosedTradeDetail } from "@/components/closed-trade-detail";
import {
  addMonths,
  dateKey,
  formatDayLabel,
  formatMonthLabel,
  isWeekend,
  monthCells,
  parseDateKey,
  sameMonth,
  WEEKDAYS,
} from "@/lib/calendar";
import { formatScore } from "@/lib/scoring";
import { closedBookStats, type ClosedStats } from "@/lib/desk-stats";
import { useDesk } from "@/hooks/use-desk";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function formatAgo(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H`;
  return `${Math.floor(hours / 24)}D`;
}

function formatClosedAt(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

export function ClosedBookPreview() {
  const { hydrated, closedTrades } = useDesk();

  return (
    <>
      <p className="px-2 py-1 font-mono text-[9px] tracking-[0.28em] text-muted-foreground">
        CLOSED BOOK
      </p>
      <ClosedBookBody hydrated={hydrated} compact trades={closedTrades} />
    </>
  );
}

export function ClosedBookSection() {
  const { hydrated, closedTrades } = useDesk();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState("");
  const todayKey = hydrated ? dateKey(new Date()) : "";
  const wins = closedTrades.filter((trade) => trade.outcome === "won").length;
  const losses = closedTrades.filter((trade) => trade.outcome === "lost").length;

  const stats = useMemo(
    () => (hydrated ? closedBookStats(closedTrades) : null),
    [hydrated, closedTrades],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, typeof closedTrades>();
    for (const trade of closedTrades) {
      const key = dateKey(new Date(trade.closedAt));
      const rows = map.get(key) ?? [];
      rows.push(trade);
      map.set(key, rows);
    }
    return map;
  }, [closedTrades]);

  const visible = selected ? (byDate.get(selected) ?? []) : closedTrades;

  function selectDay(date: Date) {
    const key = dateKey(date);
    setSelected((prev) => (prev === key ? "" : key));
    setCursor(date);
  }

  function goToday() {
    const now = new Date();
    setCursor(now);
    setSelected(dateKey(now));
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-black/25">
      {stats ? <ClosedPostTabs stats={stats} /> : null}
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            CLOSED BOOK
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <h3 className="text-lg font-semibold tracking-tight">Archive</h3>
            <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
              {hydrated ? closedTrades.length : "…"}
            </span>
          </div>
        </div>
        {hydrated && closedTrades.length > 0 ? (
          <p className="shrink-0 font-mono text-[10px] tracking-widest">
            <span className="text-[#b6ff3b]">{wins}W</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-[#ff3b5c]">{losses}L</span>
          </p>
        ) : null}
      </div>
      <ClosedArchiveCalendar
        cursor={cursor}
        selected={selected}
        todayKey={todayKey}
        byDate={byDate}
        onJump={(direction) => setCursor((prev) => addMonths(prev, direction))}
        onToday={goToday}
        onSelect={selectDay}
      />
      <div className="p-4 sm:p-5">
        {selected ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
              {formatDayLabel(parseDateKey(selected))}
              <span className="ml-2 text-foreground/50">{visible.length}</span>
            </p>
            <button
              type="button"
              onClick={() => setSelected("")}
              className="font-mono text-[10px] tracking-widest text-gold hover:text-foreground"
            >
              ALL
            </button>
          </div>
        ) : null}
        <ClosedBookBody
          hydrated={hydrated}
          trades={visible}
          emptyLabel={selected ? "NO CLOSES THIS DAY" : undefined}
        />
      </div>
    </section>
  );
}

function signedMoney(value: number, currency: string) {
  if (value === 0) return money(0, currency);
  return `${value > 0 ? "+" : "−"}${money(Math.abs(value), currency)}`;
}

function rate(wins: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((wins / total) * 100)}%`;
}

function ClosedPostTabs({ stats }: { stats: ClosedStats }) {
  const winColor = stats.net >= 0 ? "#b6ff3b" : "#ff3b5c";
  const factor =
    !Number.isFinite(stats.profitFactor)
      ? "∞"
      : stats.profitFactor === 0
        ? "—"
        : stats.profitFactor.toFixed(2);

  return (
    <div className="border-b border-white/8 px-4 py-3 sm:px-5">
      <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
        POST TRADE
      </p>
      <Tabs defaultValue="rate" className="mt-2">
        <TabsList
          variant="line"
          className="w-full justify-start border-b border-white/8 bg-transparent"
        >
          <TabsTrigger value="rate" className="font-mono text-[10px] tracking-widest">
            Win rate
          </TabsTrigger>
          <TabsTrigger value="pnl" className="font-mono text-[10px] tracking-widest">
            P&L
          </TabsTrigger>
          <TabsTrigger value="edge" className="font-mono text-[10px] tracking-widest">
            Edge
          </TabsTrigger>
          <TabsTrigger value="mix" className="font-mono text-[10px] tracking-widest">
            Mix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rate" className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p
                className="font-mono text-5xl font-black tracking-tighter"
                style={{
                  color: stats.winRate >= 50 ? "#b6ff3b" : "#ff3b5c",
                  textShadow: `0 0 22px ${stats.winRate >= 50 ? "#b6ff3b" : "#ff3b5c"}`,
                }}
              >
                {stats.decided === 0 ? "—" : `${Math.round(stats.winRate)}%`}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
                {stats.wins}W · {stats.losses}L · {stats.decided} DECIDED
              </p>
            </div>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/8">
            <span
              className="h-full bg-[#b6ff3b]"
              style={{ width: `${stats.decided === 0 ? 0 : stats.winRate}%` }}
            />
            <span
              className="h-full bg-[#ff3b5c]"
              style={{
                width: `${stats.decided === 0 ? 0 : Math.max(0, 100 - stats.winRate)}%`,
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="pnl" className="mt-4">
          <p
            className="font-mono text-5xl font-black tracking-tighter"
            style={{ color: winColor, textShadow: `0 0 22px ${winColor}` }}
          >
            {signedMoney(stats.net, stats.currency)}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            NET · {stats.count} CLOSED
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PostStat label="GROSS +" value={signedMoney(stats.grossWin, stats.currency)} tone="#b6ff3b" />
            <PostStat label="GROSS −" value={signedMoney(-stats.grossLoss, stats.currency)} tone="#ff3b5c" />
            <PostStat label="BEST" value={signedMoney(stats.best, stats.currency)} tone="#b6ff3b" />
            <PostStat label="WORST" value={signedMoney(stats.worst, stats.currency)} tone="#ff3b5c" />
          </div>
        </TabsContent>

        <TabsContent value="edge" className="mt-4">
          <p className="font-mono text-5xl font-black tracking-tighter text-gold">
            {signedMoney(stats.expectancy, stats.currency)}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            EXPECTANCY / TRADE
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PostStat label="PROFIT FACTOR" value={factor} tone="#f4c430" />
            <PostStat
              label="AVG R"
              value={stats.avgRR > 0 ? `${stats.avgRR.toFixed(2)}R` : "—"}
              tone="#f4c430"
            />
            <PostStat
              label="AVG WIN"
              value={signedMoney(stats.avgWin, stats.currency)}
              tone="#b6ff3b"
            />
            <PostStat
              label="AVG LOSS"
              value={signedMoney(-stats.avgLoss, stats.currency)}
              tone="#ff3b5c"
            />
          </div>
        </TabsContent>

        <TabsContent value="mix" className="mt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PostStat
              label="LONG WR"
              value={rate(stats.longWins, stats.longCount)}
              tone="#b6ff3b"
            />
            <PostStat
              label="SHORT WR"
              value={rate(stats.shortWins, stats.shortCount)}
              tone="#ff3b5c"
            />
            <PostStat
              label="WIN SCORE"
              value={formatScore(stats.avgWinScore)}
              tone="#b6ff3b"
            />
            <PostStat
              label="LOSS SCORE"
              value={formatScore(stats.avgLossScore)}
              tone="#ff3b5c"
            />
          </div>
          <p className="mt-3 font-mono text-[10px] tracking-widest text-muted-foreground">
            AVG CLOSED SCORE {formatScore(stats.avgScore)} · {stats.longCount} LONG · {stats.shortCount} SHORT
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PostStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-2.5 py-2">
      <p className="font-mono text-[8px] tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-0.5 font-mono text-sm font-semibold tabular-nums tracking-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function ClosedArchiveCalendar({
  cursor,
  selected,
  todayKey,
  byDate,
  onJump,
  onToday,
  onSelect,
}: {
  cursor: Date;
  selected: string;
  todayKey: string;
  byDate: Map<string, ReturnType<typeof useDesk>["closedTrades"]>;
  onJump: (direction: number) => void;
  onToday: () => void;
  onSelect: (date: Date) => void;
}) {
  const cells = monthCells(cursor);

  return (
    <div className="border-b border-white/8">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
          {formatMonthLabel(cursor)}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onJump(-1)}
            aria-label="Previous month"
            className="rounded-md border border-white/10 p-1.5 text-muted-foreground hover:text-foreground"
          >
            <Chevron dir={-1} />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="h-8 rounded-md border border-white/10 px-2.5 font-mono text-[10px] tracking-widest text-muted-foreground hover:text-foreground"
          >
            TODAY
          </button>
          <button
            type="button"
            onClick={() => onJump(1)}
            aria-label="Next month"
            className="rounded-md border border-white/10 p-1.5 text-muted-foreground hover:text-foreground"
          >
            <Chevron dir={1} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-t border-white/8">
        {WEEKDAYS.map((day) => (
          <p
            key={day}
            className="px-2 py-2 text-center font-mono text-[10px] tracking-[0.28em] text-muted-foreground"
          >
            {day}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-white/8">
        {cells.map((date) => {
          const key = dateKey(date);
          const closes = byDate.get(key) ?? [];
          const inMonth = sameMonth(date, cursor);
          const isSelected = key === selected;
          const isToday = key === todayKey;
          const extra = closes.length - 3;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "flex min-h-[6.5rem] flex-col items-start gap-1 border-b border-r border-white/8 p-2 text-left transition hover:bg-white/[0.03]",
                "[&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-black/25 opacity-45",
                isWeekend(date) && inMonth && "bg-white/[0.015]",
                isSelected && "bg-gold/10",
              )}
            >
              <span className="flex w-full items-center justify-between gap-1">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full font-mono text-xs",
                    isToday && "bg-gold text-primary-foreground",
                    isSelected && !isToday && "text-gold",
                    !isToday && !isSelected && "text-muted-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                {closes.length > 0 ? (
                  <span className="flex gap-0.5">
                    {closes.some((trade) => trade.outcome === "won") ? (
                      <span className="size-1.5 rounded-full bg-[#b6ff3b]" />
                    ) : null}
                    {closes.some((trade) => trade.outcome === "lost") ? (
                      <span className="size-1.5 rounded-full bg-[#ff3b5c]" />
                    ) : null}
                  </span>
                ) : null}
              </span>
              <span className="flex w-full flex-col gap-1">
                {closes.slice(0, 3).map((trade) => {
                  const won = trade.outcome === "won";
                  const lost = trade.outcome === "lost";
                  return (
                    <span
                      key={trade.id}
                      className={cn(
                        "truncate rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-widest",
                        won
                          ? "bg-[#b6ff3b]/15 text-[#b6ff3b]"
                          : lost
                            ? "bg-[#ff3b5c]/15 text-[#ff3b5c]"
                            : "bg-black/50 text-gold",
                      )}
                    >
                      {trade.ticker || "UNTITLED"}
                    </span>
                  );
                })}
                {extra > 0 ? (
                  <span className="px-1 font-mono text-[9px] tracking-widest text-muted-foreground">
                    +{extra}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path
        d={dir < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClosedBookBody({
  hydrated,
  trades,
  compact = false,
  emptyLabel = "NO CLOSED TRADES",
}: {
  hydrated: boolean;
  compact?: boolean;
  emptyLabel?: string;
  trades: ReturnType<typeof useDesk>["closedTrades"];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const selected = trades.find((trade) => trade.id === openId) ?? null;

  if (!hydrated) {
    return (
      <p className="px-2 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
        LOADING
      </p>
    );
  }

  if (trades.length === 0) {
    return (
      <p className="px-2 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <>
      <ul className={compact ? "space-y-1.5" : "space-y-2"}>
        {trades.map((trade) => (
          <ClosedTradeCard
            key={trade.id}
            trade={trade}
            compact={compact}
            expanded={Boolean(expanded[trade.id])}
            onOpen={() => setOpenId(trade.id)}
            onToggle={() =>
              setExpanded((prev) => ({
                ...prev,
                [trade.id]: !prev[trade.id],
              }))
            }
          />
        ))}
      </ul>
      {compact ? (
        <ClosedTradeDetail
          trade={selected}
          open={selected !== null}
          onOpenChange={(next) => {
            if (!next) setOpenId(null);
          }}
        />
      ) : null}
    </>
  );
}

function ClosedTradeCard({
  trade,
  compact,
  expanded,
  onOpen,
  onToggle,
}: {
  trade: ReturnType<typeof useDesk>["closedTrades"][number];
  compact?: boolean;
  expanded: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const calc = calculateTrade(trade.calculator, trade.ticker);
  const input = trade.calculator;
  const options = isStockOptions(input);
  const side = options
    ? `${input.side === "long" ? "BUY" : "SELL"} ${input.optionRight.toUpperCase()}`
    : input.side === "long"
      ? "LONG"
      : "SHORT";
  const prime = trade.result.band === "Prime";
  const valid = trade.result.band === "Valid";
  const won = trade.outcome === "won";
  const lost = trade.outcome === "lost";
  const pnl =
    trade.realizedPnl ??
    (won ? calc.takeProfit : lost ? -Math.abs(calc.stopLoss) : null);
  const currency = input.accountCurrency;
  const target = input.target > 0 ? input.target : calc.derivedTarget;
  const pnlLabel =
    pnl === null
      ? null
      : `${pnl > 0 ? "+" : pnl < 0 ? "−" : ""}${money(Math.abs(pnl), currency)}`;

  if (compact) {
    return (
      <li>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${trade.ticker || "trade"} details`}
          className={cn(
            "w-full rounded-xl border bg-black/40 px-2.5 py-2 text-left transition hover:border-gold/40",
            won
              ? "border-[#b6ff3b]/20"
              : lost
                ? "border-[#ff3b5c]/20"
                : "border-white/8",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-mono text-sm font-semibold tracking-widest">
                {trade.ticker || "UNTITLED"}
              </p>
              {won || lost ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest",
                    won
                      ? "bg-[#b6ff3b] text-[#0b1204] shadow-[0_0_12px_rgb(182_255_59/0.45)]"
                      : "bg-[#ff3b5c] text-white shadow-[0_0_12px_rgb(255_59_92/0.45)]",
                  )}
                >
                  {won ? "WON" : "LOST"}
                </span>
              ) : null}
            </div>
            <span className="shrink-0 font-mono text-[9px] tracking-widest text-muted-foreground">
              {formatAgo(trade.closedAt)}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            <span className={input.side === "long" ? "text-[#b6ff3b]" : "text-[#ff3b5c]"}>
              {side}
            </span>
            <span className="text-white/20">·</span>
            <span className={prime ? "text-gold" : valid ? "text-[#b6ff3b]" : undefined}>
              {trade.result.band.toUpperCase()}
            </span>
            <span className="text-white/20">·</span>
            <span>{formatScore(trade.result.score)}</span>
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-widest">
            {pnlLabel ? (
              <>
                <span className={pnl !== null && pnl >= 0 ? "text-[#b6ff3b]" : "text-[#ff3b5c]"}>
                  {pnlLabel}
                </span>
                <span className="text-muted-foreground"> · </span>
              </>
            ) : (
              <>
                <span className="text-[#ff3b5c]">{money(calc.stopLoss, currency)}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-[#b6ff3b]">{money(calc.takeProfit, currency)}</span>
                <span className="text-muted-foreground"> · </span>
              </>
            )}
            <span className="text-gold">
              {calc.rewardRisk > 0 ? `${calc.rewardRisk.toFixed(2)}R` : "—"}
            </span>
          </p>
          <p className="mt-1 truncate font-mono text-[10px] tracking-widest text-muted-foreground">
            {setupLine(input, calc.size, calc.sizeLabel, target, options)}
          </p>
        </button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border bg-black/40 transition",
        won
          ? "border-[#b6ff3b]/25"
          : lost
            ? "border-[#ff3b5c]/25"
            : "border-white/8",
        expanded &&
          (won
            ? "border-[#b6ff3b]/70 bg-[#b6ff3b]/[0.04]"
            : lost
              ? "border-[#ff3b5c]/70 bg-[#ff3b5c]/[0.04]"
              : "border-gold/35"),
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${trade.ticker || "trade"}`}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.03] sm:px-4"
      >
        <DropChevron open={expanded} />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-base font-semibold tracking-[0.16em] sm:text-lg">
              {trade.ticker || "UNTITLED"}
            </span>
            {won || lost ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest",
                  won
                    ? "bg-[#b6ff3b] text-[#0b1204] shadow-[0_0_12px_rgb(182_255_59/0.45)]"
                    : "bg-[#ff3b5c] text-white shadow-[0_0_12px_rgb(255_59_92/0.45)]",
                )}
              >
                {won ? "WON" : "LOST"}
              </span>
            ) : null}
          </span>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            <span className={input.side === "long" ? "text-[#b6ff3b]" : "text-[#ff3b5c]"}>
              {side}
            </span>
            <span className="text-white/20"> · </span>
            <span className={prime ? "text-gold" : valid ? "text-[#b6ff3b]" : undefined}>
              {trade.result.band.toUpperCase()}
            </span>
            <span className="text-white/20"> · </span>
            <span>{formatScore(trade.result.score)}</span>
            <span className="text-white/20"> · </span>
            <span>GRADE {trade.result.grade}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          {pnlLabel ? (
            <span
              className="font-mono text-sm font-semibold tabular-nums tracking-tight"
              style={{ color: pnl !== null && pnl >= 0 ? "#b6ff3b" : "#ff3b5c" }}
            >
              {pnlLabel}
            </span>
          ) : (
            <span className="font-mono text-sm font-semibold tabular-nums text-gold">
              {calc.rewardRisk > 0 ? `${calc.rewardRisk.toFixed(2)}R` : "—"}
            </span>
          )}
          <span className="font-mono text-[9px] tracking-widest text-muted-foreground">
            {formatClosedAt(trade.closedAt)}
          </span>
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-white/8 px-3 py-4 sm:px-4">
          <ClosedTicketData trade={trade} />
        </div>
      ) : null}
    </li>
  );
}

function DropChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn(
        "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
        open && "rotate-90 text-gold",
      )}
      aria-hidden
    >
      <path
        d="M6 3l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function setupLine(
  input: ReturnType<typeof useDesk>["closedTrades"][number]["calculator"],
  size: number,
  sizeLabel: string,
  target: number,
  options: boolean,
) {
  const parts = [
    options && input.strike > 0 ? `${qty(input.strike, 2)} STRIKE` : null,
    input.entry > 0 ? `E ${qty(input.entry, 4)}` : null,
    input.stop > 0 ? `S ${qty(input.stop, 4)}` : null,
    target > 0 ? `T ${qty(target, 4)}` : null,
    size > 0 ? `${qty(size)} ${sizeLabel.toUpperCase()}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "NO LEVELS";
}
