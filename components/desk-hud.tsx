"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { deskStats, type DeskStats, type ScoredTrade } from "@/lib/desk-stats";
import { money } from "@/lib/calculator";
import { formatScore, pointsLabel } from "@/lib/scoring";
import { CATEGORY_SHORT, GRADE_COLOR, RAIL_CATEGORIES, type Category, type TfSide } from "@/lib/types";
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

const BIAS_SIDES = [
  { key: "bull", label: "BULL", color: "#b6ff3b" },
  { key: "range", label: "RANGE", color: "#f4c430" },
  { key: "bear", label: "BEAR", color: "#ff3b5c" },
] as const;

const RAIL_AXES: Array<{ key: Category; angle: number }> = [
  { key: "Market Bias", angle: -90 },
  { key: "Price Structure", angle: 0 },
  { key: "Order Flow", angle: 90 },
  { key: "Momentum", angle: 180 },
];

const LEAD: Record<
  TfSide | "even",
  { label: string; color: string; side: string }
> = {
  bullish: { label: "BULL", color: "#b6ff3b", side: "LONG" },
  bearish: { label: "BEAR", color: "#ff3b5c", side: "SHORT" },
  range: { label: "RANGE", color: "#f4c430", side: "RANGE" },
  even: { label: "FLAT", color: "#8b907c", side: "FLAT" },
};

export function DeskHud({ trades }: DeskHudProps) {
  const stats = useMemo(() => deskStats(trades), [trades]);
  const tone = LEAD[stats.lead];
  const currency = stats.exposure[0]?.currency ?? "USD";
  const span = stats.totalRisk + stats.totalReward;
  const riskShare = span === 0 ? 0 : (stats.totalRisk / span) * 100;
  const rewardShare = span === 0 ? 0 : (stats.totalReward / span) * 100;

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
        className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-black/35 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
            LEAD BIAS
          </p>
          <span
            className="flex size-12 items-center justify-center rounded-full border font-mono text-lg font-black"
            style={{
              borderColor: GRADE_COLOR[stats.grade],
              color: GRADE_COLOR[stats.grade],
              background: `${GRADE_COLOR[stats.grade]}18`,
            }}
            aria-label={`Book grade ${stats.grade}`}
          >
            {stats.grade}
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p
              className="font-mono text-4xl font-black tracking-tighter"
              style={{ color: tone.color, textShadow: `0 0 24px ${tone.color}` }}
            >
              {tone.label}
            </p>
            <p className="mt-1 font-mono text-sm tracking-widest text-muted-foreground">
              {stats.count === 0
                ? "NO OPEN TRADES"
                : stats.lead === "even"
                  ? "NO PRINTS"
                  : `${stats.leadPct}% OPEN PRINTS`}
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
          {stats.even > 0 ? ` · ${stats.even} FLAT` : ""}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <LeadStat label="CONV" value={formatScore(stats.conviction)} />
          <LeadStat
            label="PRINTS"
            value={`+${pointsLabel(stats.earned)}`}
            hint={stats.max > 0 ? `/ ${pointsLabel(stats.max)}` : undefined}
          />
          <LeadStat label="BAND" value={stats.band.toUpperCase()} />
        </div>
        <p className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-widest">
          <span className="text-[#b6ff3b]">+{pointsLabel(stats.longPts)} L</span>
          <span className="text-[#f4c430]">+{pointsLabel(stats.rangePts)} R</span>
          <span className="text-[#ff3b5c]">+{pointsLabel(stats.shortPts)} S</span>
        </p>
        <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
          {stats.grades.A}A · {stats.grades.B}B · {stats.grades.C}C
        </p>
        <OpenTickers items={stats.sentiments} />
      </section>

      <section className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/35 p-4">
        <Tabs defaultValue="bias" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList
            variant="line"
            className="w-full shrink-0 justify-center border-b border-white/8 bg-transparent"
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

          <div className="relative mt-4 grid min-h-[10rem] flex-1">
            <TabsContent
              forceMount
              value="bias"
              className="col-start-1 row-start-1 mt-0 h-full data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible [&[hidden]]:block"
            >
              <div className="flex h-full flex-col items-center justify-center">
                <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
                  CONV
                  <span className="ml-2 text-gold">{formatScore(stats.conviction)}</span>
                </p>
                <div className="mt-3 grid w-full grid-cols-3 gap-2">
                  {BIAS_SIDES.map((side) => {
                    const pct =
                      side.key === "bull"
                        ? stats.bullPct
                        : side.key === "range"
                          ? stats.rangePct
                          : stats.bearPct;
                    const count =
                      side.key === "bull"
                        ? stats.bullish
                        : side.key === "range"
                          ? stats.range
                          : stats.bearish;
                    return (
                      <div
                        key={side.key}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-black/30 px-2 py-3 text-center"
                      >
                        <p
                          className="font-mono text-[9px] tracking-[0.28em]"
                          style={{ color: side.color }}
                        >
                          {side.label}
                        </p>
                        <p
                          className="font-mono text-2xl font-semibold tabular-nums tracking-tight"
                          style={{ color: side.color }}
                        >
                          {pct}
                          <span className="ml-0.5 text-xs font-medium opacity-45">%</span>
                        </p>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: side.color }}
                          />
                        </div>
                        <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                          {count}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent
              forceMount
              value="bands"
              className="col-start-1 row-start-1 mt-0 h-full data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible [&[hidden]]:block"
            >
              <div className="flex h-full flex-col justify-center gap-3">
                {BANDS.map((band) => {
                  const count = stats.bands[band];
                  const pct = stats.count === 0 ? 0 : Math.round((count / stats.count) * 100);
                  const color =
                    band === "Prime" ? "var(--gold)" : band === "Valid" ? "#b6ff3b" : "#8b907c";
                  return (
                    <BiasRow
                      key={band}
                      label={band.toUpperCase()}
                      value={pct}
                      count={count}
                      color={color}
                    />
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent
              forceMount
              value="rails"
              className="col-start-1 row-start-1 mt-0 h-full data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible [&[hidden]]:block"
            >
              <div className="flex h-full items-center justify-center gap-3">
                <BookRadar
                  scores={stats.avgByCategory}
                  color={tone.color}
                />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  {RAIL_CATEGORIES.map((category) => {
                    const score = Math.round(stats.avgByCategory[category]);
                    return (
                      <div
                        key={category}
                        className="rounded-xl border border-white/8 bg-black/30 px-2.5 py-2"
                      >
                        <p className="font-mono text-[9px] tracking-[0.28em] text-muted-foreground">
                          {CATEGORY_SHORT[category]}
                        </p>
                        <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-gold">
                          {score}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </section>
    </div>

    <BookExposure
      stats={stats}
      currency={currency}
      riskShare={riskShare}
      rewardShare={rewardShare}
      span={span}
    />
    </div>
  );
}

function BookExposure({
  stats,
  currency,
  riskShare,
  rewardShare,
  span,
}: {
  stats: DeskStats;
  currency: string;
  riskShare: number;
  rewardShare: number;
  span: number;
}) {
  const [open, setOpen] = useState(false);
  const rr = stats.bookRR > 0 ? `${stats.bookRR.toFixed(2)}R` : "—";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-black/35">
      <span
        className="pointer-events-none absolute -top-16 -left-12 size-40 rounded-full blur-3xl"
        style={{ background: "#ff3b5c", opacity: 0.12 }}
      />
      <span
        className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full blur-3xl"
        style={{ background: "#b6ff3b", opacity: 0.12 }}
      />

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full flex-col gap-3 p-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
            BOOK EXPOSURE
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/35 bg-white/10 px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.22em] text-white shadow-[0_0_16px_rgb(255_255_255_/_18%)]">
            {open ? "CLOSE DETAILS" : "OPEN DETAILS"}
            <ChevronRight
              className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`}
            />
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
          <div>
            <p className="font-mono text-4xl font-black tracking-tighter text-gold">
              {rr}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
              {stats.count} {stats.count === 1 ? "TRADE" : "TRADES"}
            </p>
          </div>
          <ExposureChip
            label="RISK"
            value={money(stats.totalRisk, currency)}
            color="#ff3b5c"
            share={span === 0 ? 0 : riskShare}
          />
          <ExposureChip
            label="REWARD"
            value={money(stats.totalReward, currency)}
            color="#b6ff3b"
            share={span === 0 ? 0 : rewardShare}
          />
        </div>

        <div className="flex h-1.5 overflow-hidden rounded-full bg-white/8">
          <span
            className="h-full bg-[#ff3b5c]"
            style={{ width: `${riskShare}%` }}
          />
          <span
            className="h-full bg-[#b6ff3b]"
            style={{ width: `${rewardShare}%` }}
          />
        </div>
      </button>

      {open ? (
        <div className="border-t border-white/8 px-4 pb-4">
          <ExposureList items={stats.exposure} />
        </div>
      ) : null}
    </section>
  );
}

function ExposureChip({
  label,
  value,
  color,
  share,
}: {
  label: string;
  value: string;
  color: string;
  share: number;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
      <p className="font-mono text-[10px] tracking-[0.32em] text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-xl font-black tracking-tight sm:text-2xl"
        style={{ color, textShadow: `0 0 18px ${color}` }}
      >
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
        {Math.round(share)}%
      </p>
    </div>
  );
}

function ExposureList({ items }: { items: DeskStats["exposure"] }) {
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
        const local = item.risk + item.reward;
        const riskPct = local === 0 ? 0 : (item.risk / local) * 100;
        const rewardPct = local === 0 ? 0 : (item.reward / local) * 100;
        return (
          <li key={item.id}>
            <Link
              href={`/trade/${item.id}`}
              className="block rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 transition hover:border-gold/40 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-widest">
                <span className="truncate text-muted-foreground">
                  {item.ticker}
                  <span className="mx-1.5 text-white/20">·</span>
                  <span
                    className={
                      item.side === "long" ? "text-[#b6ff3b]" : "text-[#ff3b5c]"
                    }
                  >
                    {item.side === "long" ? "LONG" : "SHORT"}
                  </span>
                </span>
                <span className="shrink-0 text-gold">
                  {item.rr > 0 ? `${item.rr.toFixed(2)}R` : "—"}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3 font-mono text-[10px] tracking-widest">
                <span className="text-[#ff3b5c]">{money(item.risk, item.currency)}</span>
                <span className="text-[#b6ff3b]">{money(item.reward, item.currency)}</span>
              </div>
              <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-white/8">
                <span
                  className="h-full bg-[#ff3b5c]"
                  style={{ width: `${riskPct}%` }}
                />
                <span
                  className="h-full bg-[#b6ff3b]"
                  style={{ width: `${rewardPct}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function BookRadar({
  scores,
  color,
}: {
  scores: Record<Category, number>;
  color: string;
}) {
  const cx = 80;
  const cy = 80;
  const maxR = 48;
  const rings = [0.33, 0.66, 1];
  const points = RAIL_AXES.map(({ key, angle }) => {
    const ratio = Math.min(1, Math.max(0, (scores[key] ?? 0) / 100));
    return polar(cx, cy, maxR * ratio, angle);
  });
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox="0 0 160 160" className="size-[9.5rem] shrink-0">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={RAIL_AXES.map(({ angle }) => {
            const p = polar(cx, cy, maxR * ring, angle);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="rgb(255 255 255 / 10%)"
        />
      ))}
      {RAIL_AXES.map(({ key, angle }) => {
        const end = polar(cx, cy, maxR, angle);
        const label = polar(cx, cy, maxR + 16, angle);
        return (
          <g key={key}>
            <line
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="rgb(255 255 255 / 12%)"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground font-mono text-[8px] tracking-widest"
            >
              {CATEGORY_SHORT[key]}
            </text>
          </g>
        );
      })}
      <polygon
        points={polygon}
        fill={`color-mix(in oklab, ${color} 28%, transparent)`}
        stroke={color}
        strokeWidth="2"
      />
      {points.map((p, index) => (
        <circle key={RAIL_AXES[index].key} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
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
              <span className="opacity-80">{item.grade}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function LeadStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-2 py-1.5">
      <p className="font-mono text-[9px] tracking-[0.28em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums tracking-tight">
        {value}
        {hint ? (
          <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </p>
    </div>
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
  count: number | null;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-widest">
        <span style={{ color }}>{label}</span>
        <span className="text-muted-foreground">
          {count === null ? value : `${count} · ${value}%`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
    </div>
  );
}
