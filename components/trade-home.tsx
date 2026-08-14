"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Check, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
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
import type { TradeGroup } from "@/lib/types";
import type { ScoredTrade } from "@/lib/desk-stats";

export function TradeHome() {
  const {
    hydrated,
    trades,
    groups,
    deleteTrade,
    createGroup,
    deleteGroup,
    renameGroup,
    setTradeGroup,
  } = useDesk();
  const now = useNow(hydrated && trades.length > 0);

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
          <div>
            <h2 className="text-5xl font-black tracking-tight sm:text-6xl">
              Striker Trade
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Score a ticker by activating confluence prints across 5m, 15m, and
              30m. The desk reads the board for long, short, or range, then grades
              the setup A–C so you only fire when the rails are stacked.
            </p>
          </div>

          <WorldClock />

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
        className={
          onDeleteGroup
            ? "flex items-center justify-between gap-3 border-b border-gold/15 px-4 py-3 sm:px-5"
            : "flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5"
        }
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
          <div className="min-w-0">
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
          </div>
        )}
        {onDeleteGroup ? (
          <div className="flex items-center gap-1">
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
          </div>
        ) : null}
      </div>
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
