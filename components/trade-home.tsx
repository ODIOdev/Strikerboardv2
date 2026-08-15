"use client";

import { FormEvent, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronRight, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { DeskHud } from "@/components/desk-hud";
import { MobileNav } from "@/components/side-nav";
import { WorldClock } from "@/components/world-clock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatScore } from "@/lib/scoring";
import { useDesk } from "@/hooks/use-desk";
import { useNow } from "@/hooks/use-now";
import { formatElapsed } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TradeGroup } from "@/lib/types";
import {
  closedBookStats,
  type ClosedStats,
  type ScoredTrade,
} from "@/lib/desk-stats";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function TradeHome() {
  const {
    hydrated,
    trades,
    closedTrades,
    groups,
    deleteTrade,
    createGroup,
    deleteGroup,
    renameGroup,
    setTradeGroup,
  } = useDesk();
  const now = useNow(hydrated && trades.length > 0);

  const pnl = useMemo(
    () => (hydrated ? closedBookStats(closedTrades) : null),
    [hydrated, closedTrades],
  );

  const ungrouped = useMemo(
    () => trades.filter((trade) => !trade.groupId),
    [trades],
  );
  const grouped = useMemo(
    () =>
      groups.map((group) => ({
        group,
        trades: trades.filter((trade) => trade.groupId === group.id),
      })),
    [groups, trades],
  );

  return (
    <div className="desk-glow relative min-h-screen">
      <div className="desk-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-white/8 bg-black/30 px-4 py-3 backdrop-blur-md lg:hidden">
          <MobileNav />
        </header>

        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 p-4 pb-10">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-5">
              <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                <h2 className="m-0">
                  <img
                    src="/logo.webp"
                    alt="DeskStriker"
                    width={1863}
                    height={256}
                    className="block h-auto w-[36rem] max-w-full shrink-0"
                  />
                </h2>
                <p className="max-w-xl text-left text-sm leading-relaxed text-muted-foreground">
                  Score a ticker by activating confluence prints across 5m, 15m, and
                  30m. The desk reads the board for long, short, or range, then grades
                  the setup A–C so you only fire when the rails are stacked.
                </p>
              </div>
              <PnlInfographic stats={pnl} />
            </div>
            <WorldClock />
          </div>

          <DeskHud trades={hydrated ? trades : []} />

          {!hydrated ? (
            <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
              LOADING DESK
            </p>
          ) : trades.length === 0 ? (
            <section className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-white/12 bg-black/25 px-6 py-12">
              <p className="font-mono text-[10px] tracking-[0.35em] text-gold">
                EMPTY BOOK
              </p>
              <h3 className="text-2xl font-semibold tracking-tight">
                No trades yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Open a new trade to score confluence and lock bias for a ticker.
              </p>
              <Button asChild className="font-mono tracking-widest">
                <Link href="/trade/new">
                  <Plus className="size-3.5" />
                  New Trade
                </Link>
              </Button>
            </section>
          ) : (
            <div className="space-y-8">
              {ungrouped.length > 0 ? (
                <TradeSection
                  title="Ungrouped"
                  trades={ungrouped}
                  groups={groups}
                  now={now}
                  onDelete={deleteTrade}
                  onAssign={setTradeGroup}
                  onCreateGroup={createGroup}
                />
              ) : null}
              {grouped.map(({ group, trades: rows }) => (
                <TradeSection
                  key={group.id}
                  title={group.name}
                  trades={rows}
                  groups={groups}
                  now={now}
                  onDelete={deleteTrade}
                  onAssign={setTradeGroup}
                  onCreateGroup={createGroup}
                  onRenameGroup={(name) => renameGroup(group.id, name)}
                  onDeleteGroup={() => deleteGroup(group.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const PNL_RING_R = 28;
const PNL_RING_C = 2 * Math.PI * PNL_RING_R;

function PnlInfographic({ stats }: { stats: ClosedStats | null }) {
  const [revealed, setRevealed] = useState(false);
  const empty = !stats || stats.decided === 0;
  const net = stats?.net ?? 0;
  const winColor = net >= 0 ? "#b6ff3b" : "#ff3b5c";
  const rate = empty ? 0 : stats.winRate;
  const rateColor = empty
    ? "#8b907c"
    : stats.wins >= stats.losses
      ? "#b6ff3b"
      : "#ff3b5c";
  const currency = stats?.currency ?? "USD";
  const pnlTotal = Math.max((stats?.grossWin ?? 0) + (stats?.grossLoss ?? 0), 1);
  const factor =
    empty || !stats
      ? "—"
      : !Number.isFinite(stats.profitFactor)
        ? "∞"
        : stats.profitFactor === 0
          ? "—"
          : stats.profitFactor.toFixed(2);
  const edgeNeedle = empty
    ? 50
    : Math.min(
        100,
        Math.max(0, 50 + (stats.expectancy / Math.max(stats.avgLoss, 1)) * 40),
      );

  return (
    <div
      className={cn(
        revealed
          ? "w-full lg:w-auto"
          : "mx-auto flex items-stretch justify-center gap-2 lg:mx-0",
      )}
    >
    <section
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-black/35",
        revealed
          ? "w-full p-3 lg:w-[24rem]"
          : "flex h-[82px] w-[112px] items-center justify-center gap-1.5 p-2",
      )}
    >
      {revealed ? (
        <span
          className="pointer-events-none absolute -top-16 -right-10 size-36 rounded-full blur-3xl"
          style={{ background: winColor, opacity: 0.14 }}
        />
      ) : null}
      {revealed ? (
        <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
          POST TRADE
        </p>
        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          aria-pressed={!revealed}
          aria-label={revealed ? "Hide P&L" : "Show P&L"}
          className="rounded-md p-1 text-muted-foreground transition hover:text-gold"
        >
          <EyeIcon open={revealed} />
        </button>
      </div>
      <Tabs defaultValue="pnl" className="mt-2 gap-0">
        <div className="relative grid min-h-[5.5rem]">
          <TabsContent
            forceMount
            value="pnl"
            className="col-start-1 row-start-1 mt-0 h-full data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible [&[hidden]]:block"
          >
            <div className="flex h-full flex-col items-center justify-center text-center">
              <PnlMoney value={net} currency={currency} color={winColor} />
              <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-white/8">
                <span
                  className="h-full bg-[#b6ff3b]"
                  style={{
                    width: `${((stats?.grossWin ?? 0) / pnlTotal) * 100}%`,
                  }}
                />
                <span
                  className="h-full bg-[#ff3b5c]"
                  style={{
                    width: `${((stats?.grossLoss ?? 0) / pnlTotal) * 100}%`,
                  }}
                />
              </div>
              <PnlCaption>
                <span className="text-[#b6ff3b]">{stats?.wins ?? 0}W</span>
                <span className="mx-1.5 text-white/20">·</span>
                <span className="text-[#ff3b5c]">{stats?.losses ?? 0}L</span>
                <span className="mx-1.5 text-white/20">·</span>
                {stats?.count ?? 0} CLOSED
              </PnlCaption>
            </div>
          </TabsContent>

          <TabsContent
            forceMount
            value="rate"
            className="col-start-1 row-start-1 mt-0 h-full data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible [&[hidden]]:block"
          >
            <div className="flex h-full flex-col items-center justify-center text-center">
              <PnlRing pct={rate} color={rateColor} />
              <PnlCaption>
                <span className="text-[#b6ff3b]">{stats?.wins ?? 0}W</span>
                <span className="mx-1.5 text-white/20">·</span>
                <span className="text-[#ff3b5c]">{stats?.losses ?? 0}L</span>
                <span className="mx-1.5 text-white/20">·</span>
                {stats?.decided ?? 0} TRADES
              </PnlCaption>
            </div>
          </TabsContent>

          <TabsContent
            forceMount
            value="edge"
            className="col-start-1 row-start-1 mt-0 h-full data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible [&[hidden]]:block"
          >
            <div className="flex h-full flex-col items-center justify-center text-center">
              <PnlMoney
                value={stats?.expectancy ?? 0}
                currency={currency}
                color="var(--gold)"
              />
              <div className="relative mt-2 h-1 w-full">
                <div
                  className="absolute inset-0 rounded-full opacity-80"
                  style={{
                    background:
                      "linear-gradient(90deg, #ff3b5c 0%, #f4c430 50%, #b6ff3b 100%)",
                  }}
                />
                <span
                  className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black bg-white shadow-[0_0_10px_rgb(255_255_255_/_55%)]"
                  style={{ left: `${edgeNeedle}%` }}
                />
              </div>
              <PnlCaption>
                PF {factor}
                <span className="mx-1.5 text-white/20">·</span>
                PER TRADE
              </PnlCaption>
            </div>
          </TabsContent>
        </div>

        <TabsList className="mt-2 grid h-8 w-full grid-cols-3 border border-white/8 bg-black/40">
          <TabsTrigger
            value="pnl"
            className="font-mono text-[10px] tracking-[0.22em]"
          >
            P&L
          </TabsTrigger>
          <TabsTrigger
            value="rate"
            className="font-mono text-[10px] tracking-[0.22em]"
          >
            RATE
          </TabsTrigger>
          <TabsTrigger
            value="edge"
            className="font-mono text-[10px] tracking-[0.22em]"
          >
            EDGE
          </TabsTrigger>
        </TabsList>
      </Tabs>
        </>
      ) : (
        <>
          <PnlRing pct={rate} color={rateColor} compact />
          <button
            type="button"
            onClick={() => setRevealed(true)}
            aria-pressed
            aria-label="Show P&L"
            className="rounded-md p-1 text-muted-foreground transition hover:text-gold"
          >
            <EyeIcon open={false} />
          </button>
        </>
      )}
    </section>
      {!revealed ? (
        <Link
          href="/trade/new"
          className="flex h-[82px] w-[112px] shrink-0 flex-col items-center justify-center rounded-2xl border border-gold bg-gold font-mono text-[10px] font-bold tracking-[0.22em] text-[#0b1204] transition hover:bg-black hover:text-gold lg:hidden"
        >
          NEW
          <span>TRADE</span>
        </Link>
      ) : null}
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
          <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.1" />
          <path d="M6.6 6.6C3.9 8.5 2 12 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.4-1" />
        </>
      )}
    </svg>
  );
}

function PnlCaption({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 font-mono text-[11px] font-bold tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function PnlMoney({
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
    <p
      className="flex items-baseline justify-center font-mono tabular-nums"
      style={{ color, textShadow: `0 0 22px ${color}` }}
    >
      <span className="mr-1 text-sm font-medium opacity-55">
        {sign}
        {symbol}
      </span>
      <span className="text-3xl font-semibold tracking-tight">{integer}</span>
      <span className="text-sm font-medium opacity-45">.{fraction}</span>
    </p>
  );
}

function PnlRing({
  pct,
  color,
  compact = false,
}: {
  pct: number;
  color: string;
  compact?: boolean;
}) {
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * PNL_RING_C;
  return (
    <div className={cn("relative", compact ? "size-16" : "size-14")}>
      <svg viewBox="0 0 72 72" className="size-full">
        <circle
          cx="36"
          cy="36"
          r={PNL_RING_R}
          fill="none"
          stroke="rgb(255 255 255 / 8%)"
          strokeWidth={compact ? 8 : 6}
        />
        <circle
          cx="36"
          cy="36"
          r={PNL_RING_R}
          fill="none"
          stroke={color}
          strokeWidth={compact ? 8 : 6}
          strokeDasharray={`${dash} ${PNL_RING_C}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <p
        className="absolute inset-0 flex items-center justify-center font-mono tabular-nums"
        style={{ color }}
      >
        <span
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-lg" : "text-xl",
          )}
        >
          {Math.round(pct)}
        </span>
        <span
          className={cn(
            "font-medium opacity-45",
            compact ? "ml-px text-[10px]" : "ml-0.5 text-[10px]",
          )}
        >
          %
        </span>
      </p>
    </div>
  );
}

function TradeSection({
  title,
  trades,
  groups,
  now,
  onDelete,
  onAssign,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: {
  title: string;
  trades: ScoredTrade[];
  groups: TradeGroup[];
  now: number;
  onDelete: (id: string) => void;
  onAssign: (tradeId: string, groupId: string | null) => void;
  onCreateGroup: (name: string) => TradeGroup | null;
  onRenameGroup?: (name: string) => void;
  onDeleteGroup?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(title);

  function saveName() {
    const next = draft.trim();
    if (next && next !== title) onRenameGroup?.(next);
    setEditing(false);
    setDraft(next || title);
  }

  return (
    <section
      className={
        onDeleteGroup
          ? "overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.09] to-black/50"
          : "overflow-hidden rounded-2xl border border-white/8 bg-black/25"
      }
    >
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${
          open
            ? onDeleteGroup
              ? "border-b border-gold/15"
              : "border-b border-white/8"
            : ""
        }`}
      >
        {editing && onRenameGroup ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveName();
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={saveName}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                setDraft(title);
                setEditing(false);
              }}
              autoFocus
              aria-label="Group name"
              className="h-8 max-w-xs border-white/10 bg-black/40 font-mono text-xs tracking-widest uppercase"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            className="min-w-0 flex-1 text-left"
          >
            <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
              {onDeleteGroup ? "GROUP" : "BOOK"}
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <h3 className="truncate text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
                {trades.length}
              </span>
            </div>
          </button>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {onDeleteGroup ? (
            <>
              {onRenameGroup ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(title);
                    setEditing(true);
                  }}
                  aria-label={`Rename ${title}`}
                  className="rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onDeleteGroup}
                aria-label={`Delete group ${title}`}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/35 bg-white/10 px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.22em] text-white shadow-[0_0_16px_rgb(255_255_255_/_18%)] transition hover:border-white hover:bg-white hover:text-black"
          >
            {open ? "CLOSE DETAILS" : "OPEN DETAILS"}
            <ChevronRight
              className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`}
            />
          </button>
        </div>
      </div>
      {open ? (
      <div className="p-4 sm:p-5">
      {trades.length === 0 ? (
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
          NO TRADES IN GROUP
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {trades.map((trade) => {
            const symbol = trade.ticker || "UNTITLED";
            const isBull = trade.bias === "bullish";
            return (
              <li key={trade.id}>
                <article
                  data-bias={trade.bias}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/45 transition hover:border-gold/40"
                >
                  <Link href={`/trade/${trade.id}`} className="block p-4 pb-10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
                          {isBull ? "LONG" : "SHORT"}
                        </p>
                        <h3 className="mt-1 font-mono text-2xl font-bold tracking-[0.16em]">
                          {symbol}
                        </h3>
                      </div>
                      <span
                        className="rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-widest"
                        style={{
                          borderColor:
                            trade.result.band === "Prime"
                              ? "var(--gold)"
                              : trade.result.band === "Valid"
                                ? "var(--bias)"
                                : "rgb(255 255 255 / 20%)",
                          color:
                            trade.result.band === "Prime"
                              ? "var(--gold)"
                              : trade.result.band === "Valid"
                                ? "var(--bias)"
                                : "#8b907c",
                        }}
                      >
                        {trade.result.band.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 font-mono text-xs tracking-[0.18em] text-muted-foreground">
                      <span>
                        {isBull ? "BULL" : "BEAR"} · {formatScore(trade.result.score)}
                      </span>
                      <span className="text-white/20">·</span>
                      <span className="tabular-nums tracking-[0.22em] text-gold">
                        {now ? formatElapsed(trade.createdAt, now) : "00:00:00"}
                      </span>
                    </p>
                  </Link>
                  <GroupMenu
                    groups={groups}
                    currentId={trade.groupId}
                    onAssign={(groupId) => onAssign(trade.id, groupId)}
                    onCreate={(name) => {
                      const group = onCreateGroup(name);
                      if (group) onAssign(trade.id, group.id);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onDelete(trade.id)}
                    aria-label={`Delete ${symbol}`}
                    className="absolute right-3 bottom-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      )}
      </div>
      ) : null}
    </section>
  );
}

function GroupMenu({
  groups,
  currentId,
  onAssign,
  onCreate,
}: {
  groups: TradeGroup[];
  currentId: string | null;
  onAssign: (groupId: string | null) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name);
    setName("");
    setOpen(false);
  }

  function assign(groupId: string | null) {
    onAssign(groupId);
    setOpen(false);
  }

  return (
    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Group trade"
            className="flex items-center gap-1 rounded-md border border-white/10 bg-black/50 px-2 py-1 font-mono text-[10px] tracking-widest text-muted-foreground transition hover:border-gold/40 hover:text-gold"
          >
            <FolderPlus className="size-3.5" />
            GROUP
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-56 gap-1 border-white/10 bg-[#0c0e14] p-2 shadow-xl"
        >
          <p className="px-2 py-1 font-mono text-[9px] tracking-[0.28em] text-muted-foreground">
            SAVE TO GROUP
          </p>
          <button
            type="button"
            onClick={() => assign(null)}
            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-mono text-[10px] tracking-widest ${
              currentId === null
                ? "bg-gold/15 text-gold"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            UNGROUPED
            {currentId === null ? <Check className="size-3" /> : null}
          </button>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => assign(group.id)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-mono text-[10px] tracking-widest ${
                currentId === group.id
                  ? "bg-gold/15 text-gold"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <span className="truncate">{group.name.toUpperCase()}</span>
              {currentId === group.id ? <Check className="size-3 shrink-0" /> : null}
            </button>
          ))}
          <form
            onSubmit={submit}
            className="mt-1 flex flex-col gap-1.5 border-t border-white/8 pt-2"
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New group"
              className="h-8 border-white/10 bg-black/40 font-mono text-xs"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim()}
              className="h-8 w-full font-mono text-[10px] tracking-widest"
            >
              ADD GROUP
            </Button>
          </form>
        </PopoverContent>
      </Popover>
      {currentId ? (
        <button
          type="button"
          onClick={() => onAssign(null)}
          aria-label="Ungroup trade"
          className="rounded-md border border-white/10 bg-black/50 px-2 py-1 font-mono text-[10px] tracking-widest text-muted-foreground transition hover:border-white/25 hover:text-foreground"
        >
          UNGROUP
        </button>
      ) : null}
    </div>
  );
}
