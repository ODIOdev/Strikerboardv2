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
import { useDesk } from "@/hooks/use-desk";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import type { ScoredTrade } from "@/lib/desk-stats";

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

function dayChips(
  key: string,
  plans: Idea[],
  tradesByDate: Map<string, ScoredTrade[]>,
  activeTickers: Set<string>,
) {
  const chips: { id: string; ticker: string; active: boolean }[] = [];
  const seen = new Set<string>();
  for (const trade of tradesByDate.get(key) ?? []) {
    const ticker = trade.ticker || "UNTITLED";
    chips.push({ id: `t-${trade.id}`, ticker, active: true });
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

function MonthView({
  cursor,
  selected,
  todayKey,
  byDate,
  tradesByDate,
  activeTickers,
  onSelect,
}: {
  cursor: Date;
  selected: string;
  todayKey: string;
  byDate: Map<string, Idea[]>;
  tradesByDate: Map<string, ScoredTrade[]>;
  activeTickers: Set<string>;
  onSelect: (date: Date) => void;
}) {
  const cells = monthCells(cursor);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-black/35">
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
                {chips.slice(0, 3).map((chip) => (
                  <span
                    key={chip.id}
                    className={cn(
                      "truncate rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-widest",
                      chip.active
                        ? "bg-[#b6ff3b]/15 text-[#b6ff3b]"
                        : "bg-black/50 text-gold",
                    )}
                  >
                    {chip.ticker}
                  </span>
                ))}
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
                {WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
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
