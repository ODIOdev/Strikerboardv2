"use client";

import { useMemo } from "react";
import Link from "next/link";
import { deskStats, type DeskStats, type ScoredTrade } from "@/lib/desk-stats";
import { money } from "@/lib/calculator";
import { formatScore } from "@/lib/scoring";
import { CATEGORY_SHORT, RAIL_CATEGORIES, type TfSide } from "@/lib/types";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type DeskHudProps = {
  trades: ScoredTrade[];
};

const BANDS = ["Prime", "Valid", "Watch"] as const;

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const LEAD: Record<
  TfSide | "even",
  { label: string; color: string; side: string }
> = {
  bullish: { label: "BULL", color: "#b6ff3b", side: "LONG" },
  bearish: { label: "BEAR", color: "#ff3b5c", side: "SHORT" },
  range: { label: "RANGE", color: "#f4c430", side: "RANGE" },
  even: { label: "EVEN", color: "#8b907c", side: "FLAT" },
};

export function DeskHud({ trades }: DeskHudProps) {
  const stats = useMemo(() => deskStats(trades), [trades]);
  const tone = LEAD[stats.lead];

  return (
    <div className="space-y-3">
    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,1.4fr)]">
      <section className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/8 bg-black/35 p-4 text-center">
        <p className="font-mono text-xs tracking-[0.4em] text-muted-foreground">
          OPEN
        </p>
        <p className="mt-2 font-mono text-8xl font-black leading-none tracking-tighter text-gold">
          {stats.count}
        </p>
      </section>

      <section
        data-bias={stats.lead === "even" ? undefined : stats.lead}
        className="relative overflow-hidden rounded-2xl border border-white/8 bg-black/35 p-4"
      >
        <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
          LEAD BIAS
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p
              className="font-mono text-4xl font-black tracking-tighter"
              style={{ color: tone.color, textShadow: `0 0 24px ${tone.color}` }}
            >
              {tone.label}
            </p>
            <p className="mt-1 font-mono text-sm tracking-widest text-muted-foreground">
              {stats.count === 0 ? "NO OPEN TRADES" : `${stats.leadPct}% OPEN PRINTS`}
            </p>
          </div>
          <p className="font-mono text-4xl font-bold text-gold">
            {stats.leadPct}
            <span className="text-lg text-muted-foreground">%</span>
          </p>
        </div>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/8">
          <span
            className="h-full bg-[#b6ff3b]"
            style={{ width: `${stats.bullPct}%` }}
          />
          <span
            className="h-full bg-[#f4c430]"
            style={{ width: `${stats.rangePct}%` }}
          />
          <span
            className="h-full bg-[#ff3b5c]"
            style={{ width: `${stats.bearPct}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[10px] tracking-widest text-muted-foreground">
          {stats.bullish} LONG · {stats.range} RANGE · {stats.bearish} SHORT
        </p>
        <OpenTickers items={stats.sentiments} />
      </section>

      <section className="rounded-2xl border border-white/8 bg-black/35 p-4">
        <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
          INFOGRAPHICS
        </p>
        <Tabs defaultValue="bias" className="mt-3">
          <TabsList
            variant="line"
            className="w-full justify-start border-b border-white/8 bg-transparent"
          >
            <TabsTrigger
              value="bias"
              className="font-mono text-[10px] tracking-widest"
            >
              Bias
            </TabsTrigger>
            <TabsTrigger
              value="bands"
              className="font-mono text-[10px] tracking-widest"
            >
              Bands
            </TabsTrigger>
            <TabsTrigger
              value="rails"
              className="font-mono text-[10px] tracking-widest"
            >
              Rails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bias" className="mt-4">
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 120 120" className="size-24 shrink-0">
                <circle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke="rgb(255 255 255 / 8%)"
                  strokeWidth="12"
                />
                {stats.count > 0 ? (
                  <>
                    <BiasArc
                      color="#b6ff3b"
                      pct={stats.bullPct}
                      offset={0}
                    />
                    <BiasArc
                      color="#f4c430"
                      pct={stats.rangePct}
                      offset={stats.bullPct}
                    />
                    <BiasArc
                      color="#ff3b5c"
                      pct={stats.bearPct}
                      offset={stats.bullPct + stats.rangePct}
                    />
                  </>
                ) : null}
                <text
                  x="60"
                  y="56"
                  textAnchor="middle"
                  className="fill-gold font-mono text-[18px] font-bold"
                >
                  {formatScore(stats.conviction)}
                </text>
                <text
                  x="60"
                  y="72"
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[7px] tracking-widest"
                >
                  LEAN
                </text>
              </svg>
              <div className="min-w-0 flex-1 space-y-2">
                <BiasRow label="BULL" value={stats.bullPct} count={stats.bullish} color="#b6ff3b" />
                <BiasRow label="RANGE" value={stats.rangePct} count={stats.range} color="#f4c430" />
                <BiasRow label="BEAR" value={stats.bearPct} count={stats.bearish} color="#ff3b5c" />
              </div>
            </div>
            <OpenTickers items={stats.sentiments} />
          </TabsContent>

          <TabsContent value="bands" className="mt-4 space-y-2">
            {BANDS.map((band) => {
              const count = stats.bands[band];
              const pct = stats.count === 0 ? 0 : Math.round((count / stats.count) * 100);
              const color =
                band === "Prime" ? "var(--gold)" : band === "Valid" ? "#b6ff3b" : "#8b907c";
              return (
                <div key={band}>
                  <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-widest">
                    <span className="text-muted-foreground">{band.toUpperCase()}</span>
                    <span style={{ color }}>
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="rails" className="mt-4 grid grid-cols-2 gap-2">
            {RAIL_CATEGORIES.map((category) => {
              const score = stats.avgByCategory[category];
              return (
                <div
                  key={category}
                  className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-2"
                >
                  <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
                    {CATEGORY_SHORT[category]}
                  </p>
                  <p className="font-mono text-lg text-gold">{formatScore(score)}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-bias"
                      style={{ width: `${Math.min(100, score)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </section>
    </div>

    <section className="rounded-2xl border border-white/8 bg-black/35 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
            BOOK EXPOSURE
          </p>
          <p className="mt-1 font-mono text-sm tracking-widest text-muted-foreground">
            SUM OF SAVED TICKETS
          </p>
        </div>
        <p className="font-mono text-2xl font-black tracking-tight text-gold">
          {stats.bookRR > 0 ? `${stats.bookRR.toFixed(2)}R` : "—"}
        </p>
      </div>

      <Tabs defaultValue="risk" className="mt-4">
        <TabsList
          variant="line"
          className="w-full justify-start border-b border-white/8 bg-transparent"
        >
          <TabsTrigger
            value="risk"
            className="font-mono text-[10px] tracking-widest"
          >
            Risk
          </TabsTrigger>
          <TabsTrigger
            value="reward"
            className="font-mono text-[10px] tracking-widest"
          >
            Reward
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="mt-4">
          <p className="font-mono text-4xl font-black tracking-tighter text-[#ff3b5c] sm:text-5xl">
            {money(stats.totalRisk, "USD")}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
            TOTAL RISK · {stats.count} {stats.count === 1 ? "TRADE" : "TRADES"}
          </p>
          <ExposureList
            items={stats.exposure}
            field="risk"
            total={stats.totalRisk}
            color="#ff3b5c"
          />
        </TabsContent>

        <TabsContent value="reward" className="mt-4">
          <p className="font-mono text-4xl font-black tracking-tighter text-[#b6ff3b] sm:text-5xl">
            {money(stats.totalReward, "USD")}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
            TOTAL REWARD · {stats.count} {stats.count === 1 ? "TRADE" : "TRADES"}
          </p>
          <ExposureList
            items={stats.exposure}
            field="reward"
            total={stats.totalReward}
            color="#b6ff3b"
          />
        </TabsContent>
      </Tabs>
    </section>
    </div>
  );
}

function ExposureList({
  items,
  field,
  total,
  color,
}: {
  items: DeskStats["exposure"];
  field: "risk" | "reward";
  total: number;
  color: string;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground">
        NO SAVED TICKETS
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => {
        const value = item[field];
        const pct = total === 0 ? 0 : (value / total) * 100;
        return (
          <li key={item.id}>
            <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[10px] tracking-widest">
              <span className="truncate text-muted-foreground">
                {item.ticker} · {item.side === "long" ? "LONG" : "SHORT"}
              </span>
              <span style={{ color }}>{money(value, item.currency)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function BiasArc({
  color,
  pct,
  offset,
}: {
  color: string;
  pct: number;
  offset: number;
}) {
  if (pct <= 0) return null;
  return (
    <circle
      cx="60"
      cy="60"
      r={RADIUS}
      fill="none"
      stroke={color}
      strokeWidth="12"
      strokeDasharray={`${(pct / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
      strokeDashoffset={-((offset / 100) * CIRCUMFERENCE)}
      transform="rotate(-90 60 60)"
    />
  );
}

function OpenTickers({ items }: { items: DeskStats["sentiments"] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => {
        const tone = LEAD[item.side];
        return (
          <li key={item.id}>
            <Link
              href={`/trade/${item.id}`}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-widest transition hover:brightness-125"
              style={{
                background: `${tone.color}22`,
                color: tone.color,
              }}
            >
              {item.ticker}
              <span className="opacity-70">{tone.side}</span>
              <span className="opacity-70">{formatScore(item.score)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BiasRow({
  label,
  value,
  count,
  color,
}: {
  label: string;
  value: number;
  count: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-widest">
        <span style={{ color }}>{label}</span>
        <span className="text-muted-foreground">
          {count} · {value}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}
