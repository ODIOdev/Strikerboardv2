"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  calculateTrade,
  isStockOptions,
  money,
  qty,
} from "@/lib/calculator";
import { ClosedTicketData, ClosedTradeDetail } from "@/components/closed-trade-detail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const { hydrated, closedTrades, deleteClosedTrade } = useDesk();

  return (
    <>
      <p className="px-2 py-1 font-mono text-[9px] tracking-[0.28em] text-muted-foreground">
        CLOSED BOOK
      </p>
      <ClosedBookBody
        hydrated={hydrated}
        compact
        trades={closedTrades}
        onDelete={deleteClosedTrade}
      />
    </>
  );
}

export function ClosedBookSection() {
  const { hydrated, closedTrades, deleteClosedTrade } = useDesk();
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

  const dayTrades = selected ? (byDate.get(selected) ?? []) : [];

  function selectDay(date: Date) {
    const key = dateKey(date);
    setSelected(key);
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
          <p className="shrink-0 font-mono text-sm font-bold tracking-widest">
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
      <ClosedDayDialog
        dayKey={selected}
        trades={dayTrades}
        hydrated={hydrated}
        onOpenChange={(open) => {
          if (!open) setSelected("");
        }}
        onDelete={deleteClosedTrade}
      />
      <div className="p-4 sm:p-5">
        <ClosedBookBody
          hydrated={hydrated}
          trades={closedTrades}
          onDelete={deleteClosedTrade}
        />
      </div>
    </section>
  );
}

export function ClosedPostTabs({
  stats,
  className,
}: {
  stats: ClosedStats;
  className?: string;
}) {
  const empty = stats.decided === 0;
  const winColor = stats.net >= 0 ? "#b6ff3b" : "#ff3b5c";
  const rateColor = empty
    ? "#8b907c"
    : stats.wins >= stats.losses
      ? "#b6ff3b"
      : "#ff3b5c";
  const factor =
    !Number.isFinite(stats.profitFactor)
      ? "∞"
      : stats.profitFactor === 0
        ? "—"
        : stats.profitFactor.toFixed(2);
  const winPct = empty ? 0 : (stats.wins / stats.decided) * 100;
  const pnlTotal = Math.max(stats.grossWin + stats.grossLoss, 1);
  const longWr = stats.longCount === 0 ? 0 : (stats.longWins / stats.longCount) * 100;
  const shortWr =
    stats.shortCount === 0 ? 0 : (stats.shortWins / stats.shortCount) * 100;
  const edgeNeedle = Math.min(
    100,
    Math.max(0, 50 + (stats.expectancy / Math.max(stats.avgLoss, 1)) * 40),
  );

  return (
    <div className={cn("border-b border-white/8 px-4 py-3 sm:px-5", className)}>
      <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
        POST TRADE
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox label="WIN RATE">
          <div className="flex items-center justify-between gap-3">
            <PercentHero pct={empty ? 0 : winPct} color={rateColor} />
            <RingMeter pct={winPct} color={rateColor} />
          </div>
          <p className="font-mono text-sm tracking-widest text-muted-foreground">
            <span className="text-[#b6ff3b]">{stats.wins}W</span>
            <span className="mx-1.5 text-white/20">·</span>
            <span className="text-[#ff3b5c]">{stats.losses}L</span>
            <span className="mx-1.5 text-white/20">·</span>
            {stats.decided} TRADES
          </p>
        </StatBox>

        <StatBox label="P&L">
          <div>
            <MoneyHero
              value={stats.net}
              currency={stats.currency}
              color={winColor}
            />
            <SplitBar
              left={stats.grossWin}
              right={stats.grossLoss}
              total={pnlTotal}
            />
          </div>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {stats.count} CLOSED
          </p>
        </StatBox>

        <StatBox label="EDGE">
          <div>
            <MoneyHero
              value={stats.expectancy}
              currency={stats.currency}
              color="var(--gold)"
            />
            <HeatTrack value={empty ? 50 : edgeNeedle} />
          </div>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
            PF {factor}
            <span className="mx-1.5 text-white/20">·</span>
            PER TRADE
          </p>
        </StatBox>

        <StatBox label="MIX">
          <div className="flex flex-1 flex-col justify-center gap-3">
            <MeterRow
              label="LONG"
              pct={longWr}
              note={`${stats.longWins}/${stats.longCount}`}
              color="#b6ff3b"
            />
            <MeterRow
              label="SHORT"
              pct={shortWr}
              note={`${stats.shortWins}/${stats.shortCount}`}
              color="#ff3b5c"
            />
          </div>
        </StatBox>
      </div>
    </div>
  );
}

function StatBox({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[168px] flex-col rounded-2xl border border-white/8 bg-black/30 px-4 py-3.5">
      <p className="font-mono text-[10px] tracking-[0.32em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-4 flex flex-1 flex-col justify-between gap-4">{children}</div>
    </div>
  );
}

function PercentHero({ pct, color }: { pct: number; color: string }) {
  return (
    <p className="flex items-baseline font-mono tabular-nums" style={{ color }}>
      <span className="text-3xl font-semibold tracking-tight">
        {Math.round(pct)}
      </span>
      <span className="ml-0.5 text-lg font-medium opacity-45">%</span>
    </p>
  );
}

function MoneyHero({
  value,
  currency,
  color,
}: {
  value: number;
  currency: string;
  color: string;
}) {
  const abs = Math.abs(value);
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(abs);
  const symbol = parts.find((part) => part.type === "currency")?.value ?? "$";
  const integer = parts
    .filter((part) => part.type === "integer" || part.type === "group")
    .map((part) => part.value)
    .join("");
  const fraction = parts.find((part) => part.type === "fraction")?.value ?? "00";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";

  return (
    <p className="flex items-baseline font-mono tabular-nums" style={{ color }}>
      <span className="mr-1 text-lg font-medium opacity-55">
        {sign}
        {symbol}
      </span>
      <span className="text-3xl font-semibold tracking-tight">{integer}</span>
      <span className="text-lg font-medium opacity-45">.{fraction}</span>
    </p>
  );
}

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

function RingMeter({ pct, color }: { pct: number; color: string }) {
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * RING_C;
  return (
    <svg viewBox="0 0 56 56" className="size-20 shrink-0">
      <circle
        cx="28"
        cy="28"
        r={RING_R}
        fill="none"
        stroke="rgb(255 255 255 / 8%)"
        strokeWidth="5"
      />
      <circle
        cx="28"
        cy="28"
        r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${dash} ${RING_C}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
    </svg>
  );
}

function SplitBar({
  left,
  right,
  total,
}: {
  left: number;
  right: number;
  total: number;
}) {
  return (
    <div className="mt-4 flex h-1 overflow-hidden rounded-full bg-white/8">
      <span
        className="h-full bg-[#b6ff3b]"
        style={{ width: `${(left / total) * 100}%` }}
      />
      <span
        className="h-full bg-[#ff3b5c]"
        style={{ width: `${(right / total) * 100}%` }}
      />
    </div>
  );
}

function HeatTrack({ value }: { value: number }) {
  return (
    <div className="relative mt-4 h-1">
      <div
        className="absolute inset-0 rounded-full opacity-70"
        style={{
          background:
            "linear-gradient(90deg, #ff3b5c 0%, #f4c430 50%, #b6ff3b 100%)",
        }}
      />
      <span
        className="absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-white"
        style={{ left: `${value}%` }}
      />
    </div>
  );
}

function MeterRow({
  label,
  pct,
  note,
  color,
}: {
  label: string;
  pct: number;
  note: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[10px] tracking-widest">
        <span style={{ color }}>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(pct)}%
          <span className="ml-1.5 text-white/30">{note}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
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

function ClosedDayDialog({
  dayKey,
  trades,
  hydrated,
  onOpenChange,
  onDelete,
}: {
  dayKey: string;
  trades: ReturnType<typeof useDesk>["closedTrades"];
  hydrated: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const stats = trades.length > 0 ? closedBookStats(trades) : null;
  const wins = trades.filter((trade) => trade.outcome === "won").length;
  const losses = trades.filter((trade) => trade.outcome === "lost").length;

  return (
    <Dialog open={Boolean(dayKey)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,46rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            SESSION
          </p>
          <DialogTitle className="font-mono text-xl font-semibold tracking-tight">
            {dayKey ? formatDayLabel(parseDateKey(dayKey)) : "Day"}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] tracking-widest">
            {trades.length === 0 ? (
              "NO CLOSES"
            ) : (
              <>
                {trades.length} TRADE{trades.length === 1 ? "" : "S"}
                <span className="mx-1.5 text-white/20">·</span>
                <span className="text-[#b6ff3b]">{wins}W</span>
                <span className="mx-1.5 text-white/20">·</span>
                <span className="text-[#ff3b5c]">{losses}L</span>
                {stats ? (
                  <>
                    <span className="mx-1.5 text-white/20">·</span>
                    <span
                      style={{
                        color: stats.net >= 0 ? "#b6ff3b" : "#ff3b5c",
                      }}
                    >
                      {stats.net >= 0 ? "+" : "−"}
                      {money(Math.abs(stats.net), stats.currency)}
                    </span>
                  </>
                ) : null}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <ClosedBookBody
            key={dayKey}
            hydrated={hydrated}
            trades={trades}
            startExpanded={trades.length === 1}
            emptyLabel="NO CLOSES THIS DAY"
            onDelete={onDelete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClosedBookBody({
  hydrated,
  trades,
  compact = false,
  emptyLabel = "NO CLOSED TRADES",
  startExpanded = false,
  onDelete,
}: {
  hydrated: boolean;
  compact?: boolean;
  emptyLabel?: string;
  startExpanded?: boolean;
  trades: ReturnType<typeof useDesk>["closedTrades"];
  onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    startExpanded
      ? Object.fromEntries(trades.map((trade) => [trade.id, true]))
      : {},
  );
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
            onDelete={() => onDelete(trade.id)}
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
  onDelete,
}: {
  trade: ReturnType<typeof useDesk>["closedTrades"][number];
  compact?: boolean;
  expanded: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
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
      <li
        className={cn(
          "flex overflow-hidden rounded-xl border bg-black/40 transition hover:border-gold/40",
          won
            ? "border-[#b6ff3b]/20"
            : lost
              ? "border-[#ff3b5c]/20"
              : "border-white/8",
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${trade.ticker || "trade"} details`}
          className="min-w-0 flex-1 px-2.5 py-2 text-left"
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
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${trade.ticker || "trade"}`}
          className="shrink-0 self-start p-2 text-muted-foreground transition hover:text-destructive"
        >
          <TrashIcon />
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
      <div className="flex items-stretch">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${trade.ticker || "trade"}`}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.03] sm:px-4"
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
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${trade.ticker || "trade"}`}
          className="shrink-0 self-center px-3 py-2 text-muted-foreground transition hover:text-destructive sm:px-4"
        >
          <TrashIcon />
        </button>
      </div>
      {expanded ? (
        <div className="border-t border-white/8 px-3 py-4 sm:px-4">
          <ClosedTicketData trade={trade} />
        </div>
      ) : null}
    </li>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
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
