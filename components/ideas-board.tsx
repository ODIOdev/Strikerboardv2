"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { MobileNav } from "@/components/side-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  dateKey,
  formatDayLabel,
  isWeekend,
  monthCells,
  parseDateKey,
  sameMonth,
  shiftCursor,
  viewLabel,
  weekDays,
  WEEKDAYS,
  type CalendarView,
} from "@/lib/calendar";
import { IDEAS_EVENT, loadIdeas, saveIdeas, type Idea } from "@/lib/ideas";
import { formatScore } from "@/lib/scoring";
import { tradeSentiment, type ScoredTrade } from "@/lib/desk-stats";
import { useDesk } from "@/hooks/use-desk";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import type { TfSide } from "@/lib/types";

export function IdeasBoard() {
  const hydrated = useHydrated();
  const { trades } = useDesk();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ticker, setTicker] = useState("");
  const [note, setNote] = useState("");
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState("");
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    function refresh() {
      setIdeas(loadIdeas());
    }
    refresh();
    const today = dateKey(new Date());
    setSelected((prev) => prev || today);
    setCursor(new Date());
    window.addEventListener(IDEAS_EVENT, refresh);
    return () => window.removeEventListener(IDEAS_EVENT, refresh);
  }, [hydrated]);

  const byDate = useMemo(() => {
    const map = new Map<string, Idea[]>();
    for (const idea of ideas) {
      const rows = map.get(idea.plannedFor) ?? [];
      rows.push(idea);
      map.set(idea.plannedFor, rows);
    }
    return map;
  }, [ideas]);

  const tradesByDate = useMemo(() => {
    const map = new Map<string, ScoredTrade[]>();
    for (const trade of trades) {
      const key = dateKey(new Date(trade.createdAt));
      const rows = map.get(key) ?? [];
      rows.push(trade);
      map.set(key, rows);
    }
    return map;
  }, [trades]);

  const activeTickers = useMemo(() => {
    const set = new Set<string>();
    for (const trade of trades) {
      if (trade.ticker) set.add(trade.ticker);
    }
    return set;
  }, [trades]);

  const selectedDate = selected ? parseDateKey(selected) : cursor;
  const selectedPlans = byDate.get(selected) ?? [];
  const dayTrades = useMemo(
    () =>
      trades.filter((trade) => dateKey(new Date(trade.createdAt)) === selected),
    [trades, selected],
  );
  const todayKey = hydrated ? dateKey(new Date()) : "";

  function write(next: Idea[]) {
    setIdeas(next);
    saveIdeas(next);
  }

  function selectDay(date: Date) {
    setSelected(dateKey(date));
    setCursor(date);
  }

  function openDay(date: Date) {
    selectDay(date);
    setOverlayOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const symbol = ticker.trim().toUpperCase();
    const body = note.trim();
    if (!symbol && !body) return;
    write([
      {
        id: crypto.randomUUID(),
        ticker: symbol,
        note: body,
        createdAt: Date.now(),
        plannedFor: selected || dateKey(new Date()),
      },
      ...ideas,
    ]);
    setTicker("");
    setNote("");
  }

  function remove(id: string) {
    write(ideas.filter((item) => item.id !== id));
  }

  function patchNote(id: string, note: string) {
    write(
      ideas.map((item) =>
        item.id === id ? { ...item, note: note.trim() } : item,
      ),
    );
  }

  function jump(direction: number) {
    const next = shiftCursor(cursor, view, direction);
    setCursor(next);
    if (view === "day") setSelected(dateKey(next));
  }

  function goToday() {
    const now = new Date();
    setCursor(now);
    setSelected(dateKey(now));
  }

  return (
    <div className="desk-glow relative min-h-screen">
      <div className="desk-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-white/8 bg-black/30 px-4 py-3 backdrop-blur-md lg:hidden">
          <MobileNav />
        </header>

        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 p-4 pb-10">
          <div>
            <h2 className="text-5xl font-black tracking-tight sm:text-6xl">
              Calendar
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Plan tickers by day, week, or month. Park the setup on a date,
              then open a trade when the rails line up.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
              {(["day", "week", "month"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setView(item);
                    if (item === "day" && selected) {
                      setCursor(parseDateKey(selected));
                    }
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-mono text-[10px] tracking-widest transition",
                    view === item
                      ? "bg-gold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => jump(-1)}
                aria-label="Previous"
                className="rounded-md border border-white/10 p-1.5 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="min-w-[11rem] text-center font-mono text-xs tracking-[0.18em]">
                {viewLabel(view === "day" ? selectedDate : cursor, view)}
              </p>
              <button
                type="button"
                onClick={() => jump(1)}
                aria-label="Next"
                className="rounded-md border border-white/10 p-1.5 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
              <Button
                type="button"
                variant="outline"
                onClick={goToday}
                className="ml-1 h-8 border-white/10 font-mono text-[10px] tracking-widest"
              >
                TODAY
              </Button>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="grid gap-2 rounded-2xl border border-white/8 bg-black/35 p-4 sm:grid-cols-[8rem_1fr_auto]"
          >
            <Input
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              placeholder="TICKER"
              aria-label="Plan ticker"
              className="border-white/10 bg-black/40 font-mono tracking-[0.28em] uppercase"
            />
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={`Setup for ${selected ? formatDayLabel(parseDateKey(selected)) : "today"}…`}
              aria-label="Plan note"
              className="border-white/10 bg-black/40"
            />
            <Button type="submit" className="font-mono tracking-widest">
              <Plus className="size-3.5" />
              Plan
            </Button>
          </form>

          {!hydrated ? (
            <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
              LOADING CALENDAR
            </p>
          ) : view === "month" ? (
            <MonthView
              cursor={cursor}
              selected={selected}
              todayKey={todayKey}
              byDate={byDate}
              tradesByDate={tradesByDate}
              trades={trades}
              activeTickers={activeTickers}
              onSelect={openDay}
            />
          ) : view === "week" ? (
            <WeekView
              cursor={cursor}
              selected={selected}
              todayKey={todayKey}
              byDate={byDate}
              tradesByDate={tradesByDate}
              activeTickers={activeTickers}
              onSelect={openDay}
              onRemove={remove}
            />
          ) : (
            <DayView
              date={selectedDate}
              plans={selectedPlans}
              trades={dayTrades}
              onRemove={remove}
              onNote={patchNote}
            />
          )}

          <DayOverlay
            open={overlayOpen}
            onOpenChange={setOverlayOpen}
            date={selectedDate}
            plans={selectedPlans}
            trades={dayTrades}
            onAdd={(symbol, body) => {
              write([
                {
                  id: crypto.randomUUID(),
                  ticker: symbol,
                  note: body,
                  createdAt: Date.now(),
                  plannedFor: selected || dateKey(new Date()),
                },
                ...ideas,
              ]);
            }}
            onRemove={remove}
            onNote={patchNote}
          />
        </main>
      </div>
    </div>
  );
}

const SENTIMENT_TONE: Record<
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

function dayChips(
  key: string,
  plans: Idea[],
  tradesByDate: Map<string, ScoredTrade[]>,
  activeTickers: Set<string>,
) {
  const chips: {
    id: string;
    ticker: string;
    active: boolean;
    side?: TfSide | "even";
  }[] = [];
  const seen = new Set<string>();
  for (const trade of tradesByDate.get(key) ?? []) {
    const ticker = trade.ticker || "UNTITLED";
    chips.push({
      id: `t-${trade.id}`,
      ticker,
      active: true,
      side: tradeSentiment(trade),
    });
    if (trade.ticker) seen.add(trade.ticker);
  }
  for (const plan of plans) {
    if (plan.ticker && seen.has(plan.ticker)) continue;
    chips.push({
      id: `p-${plan.id}`,
      ticker: plan.ticker || "NOTE",
      active: Boolean(plan.ticker && activeTickers.has(plan.ticker)),
    });
  }
  return chips;
}

function ActiveBiasMeter({ trades }: { trades: ScoredTrade[] }) {
  const stats = useMemo(() => {
    let long = 0;
    let short = 0;
    let range = 0;
    const ticks: { id: string; ticker: string; side: TfSide | "even" }[] = [];
    for (const trade of trades) {
      const side = tradeSentiment(trade);
      if (side === "bullish") long += 1;
      else if (side === "bearish") short += 1;
      else range += 1;
      ticks.push({
        id: trade.id,
        ticker: trade.ticker || "UNTITLED",
        side,
      });
    }
    const total = trades.length;
    const needle =
      total === 0 ? 50 : ((long - short) / total) * 50 + 50;
    let lead: TfSide | "even" = "even";
    if (long > short && long >= range) lead = "bullish";
    else if (short > long && short >= range) lead = "bearish";
    else if (range > long && range > short) lead = "range";
    else if (total > 0 && long === short) lead = range > 0 ? "range" : "even";
    return { long, short, range, total, needle, lead, ticks };
  }, [trades]);

  const tone = SENTIMENT_TONE[stats.lead];
  const valueText =
    stats.total === 0
      ? "No open trades"
      : `${stats.long} long, ${stats.range} range, ${stats.short} short`;

  return (
    <div className="border-b border-white/8 px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            ACTIVE BIAS
          </p>
          <p
            className="mt-1 font-mono text-2xl font-black tracking-tighter"
            style={{ color: tone.color, textShadow: `0 0 18px ${tone.color}` }}
          >
            {tone.label}
          </p>
        </div>
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
          {stats.total === 0
            ? "NO OPEN TRADES"
            : `${stats.long} LONG · ${stats.range} RANGE · ${stats.short} SHORT`}
        </p>
      </div>

      <div className="relative mt-5 pb-2 pt-7">
        <div
          role="meter"
          aria-label="Active trade sentiment"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(stats.needle)}
          aria-valuetext={valueText}
          className="relative h-4 overflow-visible rounded-full ring-1 ring-white/30"
          style={{
            background:
              "linear-gradient(90deg, #ff3b5c 0%, #f4c430 50%, #b6ff3b 100%)",
            boxShadow:
              "inset 0 1px 2px rgb(0 0 0 / 45%), 0 0 0 1px rgb(0 0 0 / 50%)",
          }}
        >
          <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-black/50" />
          <span
            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `clamp(0.9rem, ${stats.needle}%, calc(100% - 0.9rem))`,
            }}
          >
            <span
              className="absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
              style={{ background: tone.color, opacity: 0.55 }}
            />
            <span
              className="absolute left-1/2 top-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: tone.color,
                boxShadow: `0 0 12px ${tone.color}`,
              }}
            />
            <span
              className="absolute left-1/2 -top-8 -translate-x-1/2 whitespace-nowrap rounded-md border-2 px-1.5 py-0.5 font-mono text-[9px] font-black tracking-[0.22em] text-black"
              style={{
                background: tone.color,
                borderColor: "#fff",
                boxShadow: `0 0 18px ${tone.color}`,
              }}
            >
              {tone.side}
            </span>
            <span
              className="relative flex size-8 items-center justify-center rounded-full border-[3px] border-white bg-[#07080c]"
              style={{
                boxShadow: `0 0 0 2px #000, 0 0 22px ${tone.color}`,
              }}
            >
              <span
                className="size-3 rounded-full"
                style={{
                  background: tone.color,
                  boxShadow: `0 0 10px ${tone.color}`,
                }}
              />
            </span>
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[9px] tracking-[0.28em] text-muted-foreground">
        <span>SHORT</span>
        <span>RANGE</span>
        <span>LONG</span>
      </div>

      {stats.ticks.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {stats.ticks.map((tick) => {
            const chip = SENTIMENT_TONE[tick.side];
            return (
              <li key={tick.id}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-widest"
                  style={{ background: chip.dim, color: chip.color }}
                >
                  {tick.ticker}
                  <span className="opacity-70">{chip.side}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function MonthView({
  cursor,
  selected,
  todayKey,
  byDate,
  tradesByDate,
  trades,
  activeTickers,
  onSelect,
}: {
  cursor: Date;
  selected: string;
  todayKey: string;
  byDate: Map<string, Idea[]>;
  tradesByDate: Map<string, ScoredTrade[]>;
  trades: ScoredTrade[];
  activeTickers: Set<string>;
  onSelect: (date: Date) => void;
}) {
  const cells = monthCells(cursor);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-black/35">
      <ActiveBiasMeter trades={trades} />
      <div className="grid grid-cols-7 border-b border-white/8">
        {WEEKDAYS.map((day) => (
          <p
            key={day}
            className="px-2 py-2 text-center font-mono text-[10px] tracking-[0.28em] text-muted-foreground"
          >
            {day}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const key = dateKey(date);
          const chips = dayChips(key, byDate.get(key) ?? [], tradesByDate, activeTickers);
          const inMonth = sameMonth(date, cursor);
          const isSelected = key === selected;
          const isToday = key === todayKey;
          const extra = chips.length - 3;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "flex min-h-[7.25rem] flex-col items-start gap-1 border-b border-r border-white/8 p-2 text-left transition hover:bg-white/[0.03]",
                "[&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-black/25 opacity-45",
                isWeekend(date) && inMonth && "bg-white/[0.015]",
                isSelected && "bg-gold/10",
              )}
            >
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
              <span className="flex w-full flex-col gap-1">
                {chips.slice(0, 3).map((chip) => {
                  const side = chip.side;
                  const tone = side ? SENTIMENT_TONE[side] : null;
                  return (
                    <span
                      key={chip.id}
                      className={cn(
                        "truncate rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-widest",
                        !tone && chip.active && "bg-[#b6ff3b]/15 text-[#b6ff3b]",
                        !tone && !chip.active && "bg-black/50 text-gold",
                      )}
                      style={
                        tone
                          ? { background: tone.dim, color: tone.color }
                          : undefined
                      }
                    >
                      {chip.ticker}
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
    </section>
  );
}

function WeekView({
  cursor,
  selected,
  todayKey,
  byDate,
  tradesByDate,
  activeTickers,
  onSelect,
  onRemove,
}: {
  cursor: Date;
  selected: string;
  todayKey: string;
  byDate: Map<string, Idea[]>;
  tradesByDate: Map<string, ScoredTrade[]>;
  activeTickers: Set<string>;
  onSelect: (date: Date) => void;
  onRemove: (id: string) => void;
}) {
  const days = weekDays(cursor);

  return (
    <section className="grid gap-2 md:grid-cols-7">
      {days.map((date) => {
        const key = dateKey(date);
        const plans = byDate.get(key) ?? [];
        const dayTrades = tradesByDate.get(key) ?? [];
        const isSelected = key === selected;
        const isToday = key === todayKey;
        const empty = plans.length === 0 && dayTrades.length === 0;
        return (
          <div
            key={key}
            className={cn(
              "flex min-h-[18rem] flex-col gap-2 rounded-2xl border p-3 text-left transition",
              isSelected
                ? "border-gold/40 bg-gold/10"
                : "border-white/8 bg-black/35 hover:border-white/20",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(date)}
              className="flex w-full items-baseline justify-between"
            >
              <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
                {WEEKDAYS[date.getDay()]}
              </p>
              <span
                className={cn(
                  "font-mono text-lg",
                  isToday && "text-gold",
                  isSelected && !isToday && "text-foreground",
                  !isToday && !isSelected && "text-muted-foreground",
                )}
              >
                {date.getDate()}
              </span>
            </button>
            <ul className="flex flex-1 flex-col gap-1.5">
              {empty ? (
                <li>
                  <button
                    type="button"
                    onClick={() => onSelect(date)}
                    className="w-full text-left font-mono text-[9px] tracking-widest text-muted-foreground/70"
                  >
                    EMPTY
                  </button>
                </li>
              ) : (
                <>
                  {dayTrades.map((trade) => (
                    <li
                      key={trade.id}
                      className="rounded-lg border border-[#b6ff3b]/25 bg-[#b6ff3b]/10 p-2"
                    >
                      <p className="font-mono text-[10px] tracking-widest text-[#b6ff3b]">
                        {trade.ticker || "UNTITLED"}
                      </p>
                    </li>
                  ))}
                  {plans.map((plan) => {
                    const active = Boolean(plan.ticker && activeTickers.has(plan.ticker));
                    return (
                      <li
                        key={plan.id}
                        className={cn(
                          "group/plan rounded-lg border p-2",
                          active
                            ? "border-[#b6ff3b]/25 bg-[#b6ff3b]/10"
                            : "border-white/8 bg-black/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className={cn(
                              "font-mono text-[10px] tracking-widest",
                              active ? "text-[#b6ff3b]" : "text-gold",
                            )}
                          >
                            {plan.ticker || "NOTE"}
                          </p>
                          <button
                            type="button"
                            aria-label={`Delete ${plan.ticker || "note"}`}
                            onClick={() => onRemove(plan.id)}
                            className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover/plan:opacity-100"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                        {plan.note ? (
                          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-muted-foreground">
                            {plan.note}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function DayView({
  date,
  plans,
  trades,
  onRemove,
  onNote,
}: {
  date: Date;
  plans: Idea[];
  trades: ScoredTrade[];
  onRemove: (id: string) => void;
  onNote: (id: string, note: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-black/35 p-5">
      <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
        {formatDayLabel(date)}
      </p>
      <h3 className="mt-1 text-2xl font-semibold tracking-tight">
        {plans.length + trades.length === 0
          ? "No plans"
          : `${plans.length + trades.length} on the board`}
      </h3>
      {plans.length + trades.length === 0 ? (
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Add a ticker and note above to lock a setup on this session.
        </p>
      ) : (
        <div className="mt-5">
          <DayLists
            plans={plans}
            trades={trades}
            onRemove={onRemove}
            onNote={onNote}
          />
        </div>
      )}
    </section>
  );
}

function DayOverlay({
  open,
  onOpenChange,
  date,
  plans,
  trades,
  onAdd,
  onRemove,
  onNote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  plans: Idea[];
  trades: ScoredTrade[];
  onAdd: (ticker: string, note: string) => void;
  onRemove: (id: string) => void;
  onNote: (id: string, note: string) => void;
}) {
  const [ticker, setTicker] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setTicker("");
    setNote("");
  }, [open, date]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const symbol = ticker.trim().toUpperCase();
    const body = note.trim();
    if (!symbol && !body) return;
    onAdd(symbol, body);
    setTicker("");
    setNote("");
  }

  const count = plans.length + trades.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="border-white/8 bg-[#0c0e14] sm:max-w-md"
      >
        <SheetHeader className="border-b border-white/8">
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            SESSION
          </p>
          <SheetTitle className="text-lg">{formatDayLabel(date)}</SheetTitle>
          <SheetDescription>
            {count === 0
              ? "No plans or trades on this date."
              : `${plans.length} planned · ${trades.length} in the book`}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex flex-col gap-2 px-4">
          <Input
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
            placeholder="TICKER"
            aria-label="Plan ticker"
            className="border-white/10 bg-black/40 font-mono tracking-[0.28em] uppercase"
          />
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Setup note…"
            aria-label="Plan note"
            className="border-white/10 bg-black/40"
          />
          <Button type="submit" className="font-mono tracking-widest">
            <Plus className="size-3.5" />
            Plan this day
          </Button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {count === 0 ? (
            <p className="rounded-xl border border-dashed border-white/12 bg-black/25 px-4 py-8 text-sm text-muted-foreground">
              Park a ticker on this date, or open a trade from the desk.
            </p>
          ) : (
            <DayLists
              plans={plans}
              trades={trades}
              onRemove={onRemove}
              onNote={onNote}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DayLists({
  plans,
  trades,
  onRemove,
  onNote,
}: {
  plans: Idea[];
  trades: ScoredTrade[];
  onRemove: (id: string) => void;
  onNote: (id: string, note: string) => void;
}) {
  return (
    <div className="space-y-5">
      {trades.length > 0 ? (
        <section className="space-y-2">
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            TRADES
            <span className="ml-2 text-foreground/50">{trades.length}</span>
          </p>
          <ul className="space-y-2">
            {trades.map((trade) => (
              <li key={trade.id}>
                <Link
                  href={`/trade/${trade.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/40 p-3 transition hover:border-gold/30"
                >
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
                      {trade.bias === "bullish" ? "LONG" : "SHORT"}
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-bold tracking-[0.16em]">
                      {trade.ticker || "UNTITLED"}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] tracking-widest text-gold">
                    {trade.result.band.toUpperCase()} · {formatScore(trade.result.score)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {plans.length > 0 ? (
        <section className="space-y-2">
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            PLANS
            <span className="ml-2 text-foreground/50">{plans.length}</span>
          </p>
          <ul className="space-y-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onRemove={onRemove}
                onNote={onNote}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PlanCard({
  plan,
  onRemove,
  onNote,
}: {
  plan: Idea;
  onRemove: (id: string) => void;
  onNote: (id: string, note: string) => void;
}) {
  const href = plan.ticker
    ? `/trade/new?ticker=${encodeURIComponent(plan.ticker)}`
    : "/trade/new";
  const [draft, setDraft] = useState(plan.note);

  useEffect(() => {
    setDraft(plan.note);
  }, [plan.note]);

  function saveNote() {
    if (draft.trim() === plan.note) return;
    onNote(plan.id, draft);
  }

  return (
    <li className="rounded-xl border border-white/8 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            PLAN
          </p>
          <h4 className="mt-1 font-mono text-xl font-bold tracking-[0.16em]">
            {plan.ticker || "NOTE"}
          </h4>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={href}
            className="rounded-md border border-gold/40 bg-gold/10 px-2 py-1 font-mono text-[10px] tracking-widest text-gold transition hover:bg-gold hover:text-primary-foreground"
          >
            TRADE
          </Link>
          <button
            type="button"
            onClick={() => onRemove(plan.id)}
            aria-label={`Delete ${plan.ticker || "note"}`}
            className="rounded-md p-1.5 text-muted-foreground transition hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={saveNote}
        placeholder="Add note…"
        rows={2}
        aria-label={`${plan.ticker || "Plan"} note`}
        className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-gold/40"
      />
    </li>
  );
}
