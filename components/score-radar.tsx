"use client";

import { categoryScore, pointsLabel } from "@/lib/scoring";
import type { Category, Contribution, ScoreResult, TfSide } from "@/lib/types";
import { CATEGORY_SHORT, RAIL_CATEGORIES } from "@/lib/types";

type ScoreRadarProps = {
  result: ScoreResult;
};

const SIDE_FILL: Record<TfSide | "even", string> = {
  bullish: "#b6ff3b",
  bearish: "#ff3b5c",
  range: "#f4c430",
  even: "#8b907c",
};

const AXES: Array<{ key: Category; angle: number }> = [
  { key: "Market Bias", angle: -90 },
  { key: "Price Structure", angle: 0 },
  { key: "Order Flow", angle: 90 },
  { key: "Momentum", angle: 180 },
];

function polar(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

export function ScoreRadar({ result }: ScoreRadarProps) {
  const cx = 110;
  const cy = 110;
  const maxR = 78;
  const rings = [0.33, 0.66, 1];

  const points = AXES.map(({ key, angle }) => {
    const ratio = categoryScore(result, key) / 100;
    const winning = result.byCategory[key]?.winning ?? "even";
    return { ...polar(cx, cy, maxR * ratio, angle), key, winning };
  });
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const overallColor = SIDE_FILL[result.overall.winning];

  const top = result.contributions.slice(0, 6);

  return (
    <section className="rounded-2xl border border-white/8 bg-black/35 p-4">
      <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
        INFOGRAPHICS
      </p>
      <h2 className="mb-3 text-xl font-semibold tracking-tight">Category radar</h2>

      <svg viewBox="0 0 220 220" className="mx-auto h-[220px] w-full max-w-[260px]">
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={AXES.map(({ angle }) => {
              const p = polar(cx, cy, maxR * ring, angle);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="rgb(255 255 255 / 10%)"
          />
        ))}
        {AXES.map(({ key, angle }) => {
          const end = polar(cx, cy, maxR, angle);
          const label = polar(cx, cy, maxR + 18, angle);
          const winning = result.byCategory[key]?.winning ?? "even";
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
                className="font-mono text-[9px] tracking-widest"
                fill={SIDE_FILL[winning]}
              >
                {CATEGORY_SHORT[key]}
              </text>
            </g>
          );
        })}
        <polygon
          points={polygon}
          fill={`color-mix(in oklab, ${overallColor} 28%, transparent)`}
          stroke={overallColor}
          strokeWidth="2"
        />
        {points.map((p) => (
          <g key={p.key}>
            <line
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={SIDE_FILL[p.winning]}
              strokeWidth="2"
            />
            <circle cx={p.x} cy={p.y} r="3.5" fill={SIDE_FILL[p.winning]} />
          </g>
        ))}
      </svg>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {RAIL_CATEGORIES.map((category) => (
          <div
            key={category}
            className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5"
          >
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
              {CATEGORY_SHORT[category]}
            </p>
            <p
              className="font-mono text-sm"
              style={{
                color: SIDE_FILL[result.byCategory[category]?.winning ?? "even"],
              }}
            >
              {Math.round(categoryScore(result, category))}
            </p>
          </div>
        ))}
      </div>

      <h3 className="mt-5 font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
        SCORE CARRIERS
      </h3>
      <ul className="mt-2 space-y-2">
        {top.map((item: Contribution) => (
          <li key={item.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-xs">{item.name}</span>
              <span className="font-mono text-[10px] text-gold">
                {pointsLabel(item.earned)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.max === 0 ? 0 : (item.earned / item.max) * 100}%`,
                  background: SIDE_FILL[item.winning],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
