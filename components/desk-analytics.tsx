"use client";

import { useMemo, useState } from "react";
import { ClosedPostTabs } from "@/components/closed-book";
import { ClosedTradeDetail } from "@/components/closed-trade-detail";
import { MobileNav } from "@/components/side-nav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money } from "@/lib/calculator";
import {
  closedBookStats,
  deskStats,
  type ScoredClosed,
} from "@/lib/desk-stats";
import {
  printPerformance,
  tradesForPrint,
  type CategoryPrintStat,
  type PrintGrade,
  type PrintStat,
} from "@/lib/print-analytics";
import { formatScore } from "@/lib/scoring";
import { CATEGORY_SHORT } from "@/lib/types";
import { useDesk } from "@/hooks/use-desk";

function signedMoney(value: number, currency: string) {
  if (value === 0) return money(0, currency);
  return `${value > 0 ? "+" : "−"}${money(Math.abs(value), currency)}`;
}

function tickerRows(trades: ScoredClosed[]) {
  const map = new Map<
    string,
    { ticker: string; count: number; wins: number; losses: number; net: number }
  >();
  for (const trade of trades) {
    const ticker = trade.ticker || "UNTITLED";
    const row = map.get(ticker) ?? {
      ticker,
      count: 0,
      wins: 0,
      losses: 0,
      net: 0,
    };
    row.count += 1;
    if (trade.outcome === "won") row.wins += 1;
    if (trade.outcome === "lost") row.losses += 1;
    if (typeof trade.realizedPnl === "number" && Number.isFinite(trade.realizedPnl)) {
      row.net += trade.realizedPnl;
    }
    map.set(ticker, row);
  }
  return [...map.values()].sort((a, b) => b.net - a.net);
}

export function DeskAnalyticsPage() {
  const { hydrated, trades, closedTrades } = useDesk();
  const closed = useMemo(
    () => (hydrated ? closedBookStats(closedTrades) : null),
    [hydrated, closedTrades],
  );
  const open = useMemo(
    () => (hydrated ? deskStats(trades) : null),
    [hydrated, trades],
  );
  const tickers = useMemo(
    () => (hydrated ? tickerRows(closedTrades) : []),
    [hydrated, closedTrades],
  );
  const prints = useMemo(
    () => (hydrated ? printPerformance(closedTrades) : null),
    [hydrated, closedTrades],
  );
  const currency = closed?.currency ?? "USD";

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
              Analytics
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Closed-book P&L plus print performance — which confluence
              signals actually pay, fade, or sit in the middle.
            </p>
          </div>

          {closed ? (
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-black/25">
              <ClosedPostTabs stats={closed} className="border-b-0" />
            </section>
          ) : (
            <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
              LOADING DESK
            </p>
          )}

          {prints ? (
            <PrintPerformance
              prints={prints}
              trades={closedTrades}
              currency={currency}
            />
          ) : null}

          {open ? (
            <section className="grid gap-3 sm:grid-cols-3">
              <AnalyticStat
                label="OPEN"
                value={String(open.count)}
                note={`${open.even} FLAT`}
              />
              <AnalyticStat
                label="CONV"
                value={formatScore(open.conviction)}
                note={open.band.toUpperCase()}
              />
              <AnalyticStat
                label="BOOK R"
                value={open.bookRR > 0 ? `${open.bookRR.toFixed(2)}R` : "—"}
                note={`${money(open.totalRisk, currency)} RISK`}
              />
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-white/8 bg-black/25 p-4">
            <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
              BY TICKER
            </p>
            {tickers.length === 0 ? (
              <p className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground">
                NO CLOSED TICKETS
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {tickers.map((row) => (
                  <li
                    key={row.ticker}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/30 px-3 py-2.5"
                  >
                    <div>
                      <p className="font-mono text-sm tracking-widest">{row.ticker}</p>
                      <p className="mt-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
                        <span className="text-[#b6ff3b]">{row.wins}W</span>
                        <span className="mx-1.5 text-white/20">·</span>
                        <span className="text-[#ff3b5c]">{row.losses}L</span>
                        <span className="mx-1.5 text-white/20">·</span>
                        {row.count} CLOSED
                      </p>
                    </div>
                    <p
                      className="shrink-0 font-mono text-sm font-semibold tabular-nums"
                      style={{
                        color: row.net >= 0 ? "#b6ff3b" : "#ff3b5c",
                      }}
                    >
                      {signedMoney(row.net, currency)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function AnalyticStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/35 px-4 py-3.5">
      <p className="font-mono text-[10px] tracking-[0.32em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums text-gold">
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
        {note}
      </p>
    </div>
  );
}

const GRADE_COLOR: Record<PrintGrade, string> = {
  good: "#b6ff3b",
  normal: "#f4c430",
  bad: "#ff3b5c",
};

function signedPp(value: number) {
  const abs = Math.abs(value).toFixed(0);
  if (value > 0) return `+${abs}pp`;
  if (value < 0) return `−${abs}pp`;
  return "0pp";
}

function PrintPerformance({
  prints,
  trades,
  currency,
}: {
  prints: ReturnType<typeof printPerformance>;
  trades: ScoredClosed[];
  currency: string;
}) {
  const [focus, setFocus] = useState<PrintStat | null>(null);
  const liveCategories = prints.categories.filter((row) => row.samples > 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-black/25 p-4">
      <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
        PRINT PERFORMANCE
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Armed confluence prints on decided closed tickets. Lift is win rate
        versus the book. Thin samples stay NORMAL until they prove themselves.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <PrintCallout
          label="HIGHEST"
          row={prints.highest}
          empty="NEED 2+ PRINTS"
          onOpen={setFocus}
        />
        <PrintCallout
          label="LOWEST"
          row={prints.lowest}
          empty="NO FADE YET"
          onOpen={setFocus}
        />
        <div className="rounded-2xl border border-white/8 bg-black/35 px-4 py-3.5">
          <p className="font-mono text-[10px] tracking-[0.32em] text-muted-foreground">
            BOOK WR
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums text-gold">
            {prints.bookRate.toFixed(0)}%
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            {prints.decided} DECIDED
          </p>
        </div>
      </div>

      {liveCategories.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {liveCategories.map((row) => (
            <CategoryChip key={row.category} row={row} />
          ))}
        </ul>
      ) : null}

      {prints.signals.length === 0 ? (
        <p className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground">
          NO ARMED PRINTS ON CLOSED TICKETS
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {prints.signals.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => setFocus(row)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-left transition hover:border-gold/35 hover:bg-white/[0.03]"
              >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm tracking-wide">{row.name}</p>
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                    {CATEGORY_SHORT[row.category]}
                  </span>
                  <GradeBadge grade={row.grade} />
                </div>
                <p className="mt-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
                  <span className="text-[#b6ff3b]">{row.wins}W</span>
                  <span className="mx-1.5 text-white/20">·</span>
                  <span className="text-[#ff3b5c]">{row.losses}L</span>
                  <span className="mx-1.5 text-white/20">·</span>
                  {row.samples} PRINTS
                  <span className="mx-1.5 text-white/20">·</span>
                  {row.aligned}/{row.samples} WITH TICKET
                </p>
              </div>
              <div className="flex shrink-0 items-baseline gap-3">
                <p className="font-mono text-sm font-semibold tabular-nums text-gold">
                  {row.winRate.toFixed(0)}%
                </p>
                <p
                  className="font-mono text-sm tabular-nums"
                  style={{
                    color:
                      row.lift > 0
                        ? "#b6ff3b"
                        : row.lift < 0
                          ? "#ff3b5c"
                          : "#f4c430",
                  }}
                >
                  {signedPp(row.lift)}
                </p>
                <p
                  className="font-mono text-sm font-semibold tabular-nums"
                  style={{
                    color: row.net >= 0 ? "#b6ff3b" : "#ff3b5c",
                  }}
                >
                  {signedMoney(row.net, currency)}
                </p>
              </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <PrintDetailDialog
        row={focus}
        trades={trades}
        bookRate={prints.bookRate}
        currency={currency}
        onOpenChange={(open) => {
          if (!open) setFocus(null);
        }}
      />
    </section>
  );
}

function PrintCallout({
  label,
  row,
  empty,
  onOpen,
}: {
  label: string;
  row: PrintStat | null;
  empty: string;
  onOpen: (row: PrintStat) => void;
}) {
  if (!row) {
    return (
      <div className="rounded-2xl border border-white/8 bg-black/35 px-4 py-3.5">
        <p className="font-mono text-[10px] tracking-[0.32em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 font-mono text-sm tracking-widest text-muted-foreground">
          {empty}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="rounded-2xl border border-white/8 bg-black/35 px-4 py-3.5 text-left transition hover:border-gold/35"
    >
      <p className="font-mono text-[10px] tracking-[0.32em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 truncate font-mono text-lg font-semibold tracking-tight">
        {row.name}
      </p>
      <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
        {CATEGORY_SHORT[row.category]}
        <span className="mx-1.5 text-white/20">·</span>
        {row.winRate.toFixed(0)}%
        <span className="mx-1.5 text-white/20">·</span>
        <span style={{ color: GRADE_COLOR[row.grade] }}>
          {signedPp(row.lift)}
        </span>
      </p>
    </button>
  );
}

function CategoryChip({ row }: { row: CategoryPrintStat }) {
  return (
    <li className="rounded-xl border border-white/8 bg-black/30 px-2.5 py-2">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
        {CATEGORY_SHORT[row.category]}
      </p>
      <p
        className="mt-1 font-mono text-sm font-semibold tabular-nums"
        style={{ color: GRADE_COLOR[row.grade] }}
      >
        {row.winRate.toFixed(0)}%
      </p>
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
        {signedPp(row.lift)}
      </p>
    </li>
  );
}

function GradeBadge({ grade }: { grade: PrintGrade }) {
  return (
    <span
      className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.18em]"
      style={{
        color: GRADE_COLOR[grade],
        background: `${GRADE_COLOR[grade]}18`,
      }}
    >
      {grade.toUpperCase()}
    </span>
  );
}

const PRINT_SIDE: Record<"bullish" | "bearish" | "range", { label: string; color: string }> = {
  bullish: { label: "BULL", color: "#b6ff3b" },
  bearish: { label: "BEAR", color: "#ff3b5c" },
  range: { label: "RANGE", color: "#f4c430" },
};

function formatPrintStamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

function PrintDetailDialog({
  row,
  trades,
  bookRate,
  currency,
  onOpenChange,
}: {
  row: PrintStat | null;
  trades: ScoredClosed[];
  bookRate: number;
  currency: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const hits = row ? tradesForPrint(trades, row.key) : [];
  const ticket = hits.find((hit) => hit.trade.id === ticketId)?.trade ?? null;
  const alignPct =
    row && row.samples > 0 ? Math.round((row.aligned / row.samples) * 100) : 0;

  return (
    <>
      <Dialog open={row !== null} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(88vh,46rem)] max-w-2xl flex-col overflow-hidden">
          {row ? (
            <>
              <DialogHeader>
                <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
                  PRINT
                </p>
                <DialogTitle className="font-mono text-xl font-semibold tracking-tight">
                  {row.name}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-widest">
                  <span>{CATEGORY_SHORT[row.category]}</span>
                  <GradeBadge grade={row.grade} />
                  <span className="text-white/20">·</span>
                  <span>vs book {bookRate.toFixed(0)}%</span>
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <PrintStatBox
                    label="WIN RATE"
                    value={`${row.winRate.toFixed(0)}%`}
                    tone="#f4c430"
                  />
                  <PrintStatBox
                    label="LIFT"
                    value={signedPp(row.lift)}
                    tone={
                      row.lift > 0
                        ? "#b6ff3b"
                        : row.lift < 0
                          ? "#ff3b5c"
                          : "#f4c430"
                    }
                  />
                  <PrintStatBox
                    label="P&L"
                    value={signedMoney(row.net, currency)}
                    tone={row.net >= 0 ? "#b6ff3b" : "#ff3b5c"}
                  />
                  <PrintStatBox
                    label="ALIGNED"
                    value={`${alignPct}%`}
                    tone="#f4c430"
                    note={`${row.aligned}/${row.samples}`}
                  />
                </div>
                <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  <span className="text-[#b6ff3b]">{row.wins}W</span>
                  <span className="mx-1.5 text-white/20">·</span>
                  <span className="text-[#ff3b5c]">{row.losses}L</span>
                  <span className="mx-1.5 text-white/20">·</span>
                  {row.samples} PRINTS
                </p>
                {hits.length === 0 ? (
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                    NO TICKETS
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {hits.map((hit) => {
                      const won = hit.trade.outcome === "won";
                      const tone = PRINT_SIDE[hit.side];
                      return (
                        <li key={hit.trade.id}>
                          <button
                            type="button"
                            onClick={() => setTicketId(hit.trade.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-left transition hover:border-gold/35"
                          >
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="truncate font-mono text-sm font-semibold tracking-widest">
                                  {hit.trade.ticker || "UNTITLED"}
                                </span>
                                <span
                                  className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest"
                                  style={{
                                    background: won ? "#b6ff3b" : "#ff3b5c",
                                    color: won ? "#0b1204" : "#fff",
                                  }}
                                >
                                  {won ? "WON" : "LOST"}
                                </span>
                              </span>
                              <span className="mt-0.5 block font-mono text-[10px] tracking-widest text-muted-foreground">
                                <span style={{ color: tone.color }}>{tone.label}</span>
                                <span className="mx-1.5 text-white/20">·</span>
                                {hit.aligned ? "WITH TICKET" : "FADE"}
                                <span className="mx-1.5 text-white/20">·</span>
                                {formatPrintStamp(hit.trade.closedAt)}
                              </span>
                            </span>
                            <span
                              className="shrink-0 font-mono text-sm font-semibold tabular-nums"
                              style={{
                                color: hit.pnl >= 0 ? "#b6ff3b" : "#ff3b5c",
                              }}
                            >
                              {signedMoney(hit.pnl, currency)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <ClosedTradeDetail
        trade={ticket}
        open={ticket !== null}
        onOpenChange={(open) => {
          if (!open) setTicketId(null);
        }}
      />
    </>
  );
}

function PrintStatBox({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
      <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight"
        style={{ color: tone }}
      >
        {value}
      </p>
      {note ? (
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  );
}
