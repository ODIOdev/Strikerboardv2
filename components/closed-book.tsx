"use client";

import { useState } from "react";
import {
  calculateTrade,
  isStockOptions,
  money,
  qty,
} from "@/lib/calculator";
import { ClosedTradeDetail } from "@/components/closed-trade-detail";
import { formatScore } from "@/lib/scoring";
import { useDesk } from "@/hooks/use-desk";
import { CATEGORY_SHORT } from "@/lib/types";
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
  const wins = closedTrades.filter((trade) => trade.outcome === "won").length;
  const losses = closedTrades.filter((trade) => trade.outcome === "lost").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-black/25">
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
      <div className="p-4 sm:p-5">
        <ClosedBookBody hydrated={hydrated} trades={closedTrades} />
      </div>
    </section>
  );
}

function ClosedBookBody({
  hydrated,
  trades,
  compact = false,
}: {
  hydrated: boolean;
  compact?: boolean;
  trades: ReturnType<typeof useDesk>["closedTrades"];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
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
        NO CLOSED TRADES
      </p>
    );
  }

  return (
    <>
      <ul className={compact ? "space-y-1.5" : "grid gap-3 sm:grid-cols-2"}>
        {trades.map((trade) => (
          <ClosedTradeCard
            key={trade.id}
            trade={trade}
            compact={compact}
            onOpen={() => setOpenId(trade.id)}
          />
        ))}
      </ul>
      <ClosedTradeDetail
        trade={selected}
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
      />
    </>
  );
}

function ClosedTradeCard({
  trade,
  compact,
  onOpen,
}: {
  trade: ReturnType<typeof useDesk>["closedTrades"][number];
  compact?: boolean;
  onOpen: () => void;
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
  const winning = trade.result.overall.winning;
  const prints = trade.result.contributions
    .filter((item) => item.earned > 0)
    .filter((item) => winning === "even" || item.winning === winning)
    .slice(0, compact ? 3 : 8);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${trade.ticker || "trade"} details`}
        className={cn(
          "w-full rounded-xl border bg-black/40 text-left transition hover:border-gold/40",
          won
            ? "border-[#b6ff3b]/20"
            : lost
              ? "border-[#ff3b5c]/20"
              : "border-white/8",
          compact ? "px-2.5 py-2" : "p-4",
        )}
      >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn(
              "truncate font-mono font-semibold tracking-widest",
              compact ? "text-sm" : "text-2xl tracking-[0.16em]",
            )}
          >
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
          {compact ? formatAgo(trade.closedAt) : formatClosedAt(trade.closedAt)}
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
        {!compact ? (
          <>
            <span className="text-white/20">·</span>
            <span>GRADE {trade.result.grade}</span>
          </>
        ) : null}
      </p>
      <p className="mt-1 font-mono text-[10px] tracking-widest">
        {pnl !== null ? (
          <>
            <span className={pnl >= 0 ? "text-[#b6ff3b]" : "text-[#ff3b5c]"}>
              {pnl > 0 ? "+" : pnl < 0 ? "−" : ""}
              {money(Math.abs(pnl), currency)}
            </span>
            <span className="text-muted-foreground"> · </span>
          </>
        ) : (
          <>
            <span className="text-[#ff3b5c]">{money(calc.stopLoss, currency)}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-[#b6ff3b]">
              {money(calc.takeProfit, currency)}
            </span>
            <span className="text-muted-foreground"> · </span>
          </>
        )}
        <span className="text-gold">
          {calc.rewardRisk > 0 ? `${calc.rewardRisk.toFixed(2)}R` : "—"}
        </span>
      </p>

      {compact ? (
        <p className="mt-1 truncate font-mono text-[10px] tracking-widest text-muted-foreground">
          {setupLine(input, calc.size, calc.sizeLabel, target, options)}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="font-mono text-[9px] tracking-[0.28em] text-muted-foreground">
            SETUP
          </p>
          {options ? (
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
              {input.optionRight.toUpperCase()}
              {input.strike > 0 ? ` · ${qty(input.strike, 2)} STRIKE` : ""}
              {input.expiry ? ` · ${input.expiry}` : ""}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <SetupStat
              label={options ? "PREMIUM" : "ENTRY"}
              value={level(input.entry)}
            />
            <SetupStat label="STOP" value={level(input.stop)} tone="#ff3b5c" />
            <SetupStat
              label="TARGET"
              value={level(target)}
              tone="#b6ff3b"
            />
            <SetupStat
              label={calc.sizeLabel.toUpperCase()}
              value={calc.size > 0 ? qty(calc.size) : "—"}
            />
          </div>
          {prints.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {prints.map((item) => (
                <span
                  key={item.id}
                  className="rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground"
                >
                  {CATEGORY_SHORT[item.category]} · {item.name.toUpperCase()}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
      </button>
    </li>
  );
}

function SetupStat({
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
