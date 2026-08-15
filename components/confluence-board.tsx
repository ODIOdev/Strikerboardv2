"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bandFor,
  categoryScore,
  formatScore,
  itemPoints,
  newsSentiment,
  pointsLabel,
  ZONE_PLAY_POINTS,
} from "@/lib/scoring";
import type {
  Category,
  Confluence,
  ScoreResult,
  Timeframe,
  TfSide,
  ZonePlay,
} from "@/lib/types";
import {
  CATEGORIES,
  TIMEFRAMES,
  TF_SIDES,
  isNewsCategory,
  isStructureCategory,
  isZoneCategory,
  newsFields,
  newsToneFromSentiment,
  resolveCategory,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ConfluenceBoardProps = {
  result: ScoreResult;
  confluences: Confluence[];
  onTfBias: (id: string, timeframe: Timeframe, bias: TfSide) => void;
  onTfZone: (id: string, timeframe: Timeframe, play: ZonePlay) => void;
  onPatch: (id: string, patch: Partial<Omit<Confluence, "id">>) => void;
  onAdd: (input: { name: string; category: Category; weight: number }) => void;
  onRemove: (id: string) => void;
  onRestore: () => void;
};

function barColor(score: number) {
  if (score >= 80) return "var(--gold)";
  if (score >= 60) return "var(--bias)";
  return "#8b907c";
}

const WIN_STYLE = {
  bullish: { background: "#b6ff3b", color: "#0b1204" },
  bearish: { background: "#ff3b5c", color: "#1a0508" },
  range: { background: "#f4c430", color: "#16120a" },
  even: {
    border: "1px solid rgb(255 255 255 / 12%)",
    color: "#8b907c",
  },
} as const;

const SIDE_LABEL: Record<TfSide, { short: string; long: string }> = {
  bullish: { short: "L", long: "LONG" },
  bearish: { short: "S", long: "SHORT" },
  range: { short: "R", long: "RANGE" },
};

export function ConfluenceBoard({
  result,
  confluences,
  onTfBias,
  onTfZone,
  onPatch,
  onAdd,
  onRemove,
  onRestore,
}: ConfluenceBoardProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("News / Events");
  const [weight, setWeight] = useState(8);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState<Partial<Record<Category, boolean>>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    onAdd({ name, category, weight: clampWeight(String(weight)) });
    setOpen((prev) => ({ ...prev, [category]: true }));
    setName("");
    setWeight(8);
  }

  function toggle(group: Category) {
    setOpen((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-black/35 p-3 lg:p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 lg:mb-4 lg:gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
            CONFLUENCE BOARD
          </p>
          <h2 className="hidden text-xl font-semibold tracking-tight lg:block">
            Weighted checklist
          </h2>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onRestore}>
          Reset checklist
        </Button>
      </div>

      <div className="space-y-2">
        {CATEGORIES.map((group) => {
          const rows = confluences.filter(
            (item) => resolveCategory(item.category) === group,
          );
          const score = categoryScore(result, group);
          const expanded = Boolean(open[group]);
          const tone = barColor(score);
          const winning = result.byCategory[group]?.winning ?? "even";
          const winningLabel =
            winning === "bullish"
              ? "BULL"
              : winning === "bearish"
                ? "BEAR"
                : winning === "range"
                  ? "RANGE"
                  : "FLAT";

          return (
            <div
              key={group}
              className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]"
            >
              <button
                type="button"
                onClick={() => toggle(group)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left lg:gap-3 lg:px-3 lg:py-2.5"
              >
                <ChevronRight
                  className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
                    expanded ? "rotate-90" : ""
                  }`}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] tracking-[0.22em] text-gold">
                  {group.toUpperCase()}
                </span>
                <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/8 sm:block sm:w-32">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.min(100, score)}%`, background: tone }}
                  />
                </span>
                <span
                  className="w-8 shrink-0 text-right font-mono text-xs"
                  style={{ color: tone }}
                >
                  {formatScore(score)}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[10px] tracking-widest"
                  style={WIN_STYLE[winning]}
                >
                  {winningLabel}
                </span>
              </button>

              <div className="h-1 bg-white/8 sm:hidden">
                <div
                  className="h-full"
                  style={{ width: `${Math.min(100, score)}%`, background: tone }}
                />
              </div>

              {expanded ? (
                <div className="border-t border-white/8 px-2 py-1.5 lg:px-3 lg:py-2">
                  {rows.length === 0 ? (
                    <p className="px-1 py-2 font-mono text-[10px] tracking-widest text-muted-foreground">
                      NO PRINTS · {bandFor(score).toUpperCase()}
                    </p>
                  ) : (
                    <ul className="space-y-1 lg:space-y-1.5">
                      {rows.map((item) => {
                        const earned = itemPoints(item);
                        const showZonePlay = isZoneCategory(item.category);
                        const showCandleConfirm = isStructureCategory(
                          item.category,
                        );
                        const showNews = isNewsCategory(item.category);
                        const sentiment = newsSentiment(item);
                        const newsTone =
                          item.newsTone ?? newsToneFromSentiment(sentiment);
                        return (
                          <li
                            key={item.id}
                            className={`grid grid-cols-1 items-center gap-1.5 rounded-xl border border-white/6 bg-black/20 px-2 py-1.5 lg:gap-2 lg:px-3 lg:py-2 ${
                              item.active || editingId === item.id ? "" : "opacity-45"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.active}
                                onChange={() =>
                                  onPatch(item.id, { active: !item.active })
                                }
                                aria-label={`Activate ${item.name}`}
                                className="size-4 shrink-0 rounded border-white/20 bg-black/40 accent-[#f4c430]"
                              />
                              {editingId === item.id ? (
                                <ConfluenceEditor
                                  item={item}
                                  showZonePlay={showZonePlay}
                                  onPatch={onPatch}
                                  onDone={() => setEditingId(null)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingId(item.id)}
                                  className="flex min-w-0 items-center gap-2 text-left text-sm"
                                >
                                  <Pencil className="size-3 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{item.name}</span>
                                  <span className="shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground">
                                    WT{" "}
                                    {showZonePlay
                                      ? `${ZONE_PLAY_POINTS.reaction}/${ZONE_PLAY_POINTS.breakout}`
                                      : showNews
                                        ? Math.round(sentiment)
                                        : item.weight}
                                  </span>
                                </button>
                              )}
                              {showCandleConfirm ? (
                                <label className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-wide text-muted-foreground">
                                  <input
                                    type="checkbox"
                                    checked={item.candleConfirmed}
                                    onChange={() =>
                                      onPatch(item.id, {
                                        candleConfirmed: !item.candleConfirmed,
                                      })
                                    }
                                    className="size-3.5 rounded border-white/20 bg-black/40 accent-[#4de8c8]"
                                  />
                                  <span className="lg:hidden">CANDLE</span>
                                  <span className="hidden lg:inline">
                                    Confirmed new candle
                                  </span>
                                </label>
                              ) : null}
                            </div>

                            {showNews ? (
                              <SentimentSlide
                                value={sentiment}
                                onLive={(next) => {
                                  const input = document.getElementById(
                                    `news-wt-${item.id}`,
                                  ) as HTMLInputElement | null;
                                  if (input && input !== document.activeElement) {
                                    input.value = String(Math.round(next));
                                  }
                                }}
                                onChange={(next) =>
                                  onPatch(item.id, newsFields(next))
                                }
                              />
                            ) : null}

                            <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                              <label
                                className={`items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground ${
                                  showNews ? "hidden lg:flex" : "flex"
                                }`}
                              >
                                WT
                                {showZonePlay ? (
                                  <span className="inline-flex h-7 w-14 items-center justify-center rounded-md border border-white/10 bg-black/40 text-[9px] tracking-wide text-foreground">
                                    {ZONE_PLAY_POINTS.reaction}/{ZONE_PLAY_POINTS.breakout}
                                  </span>
                                ) : (
                                  <input
                                    id={showNews ? `news-wt-${item.id}` : undefined}
                                    type="number"
                                    min={showNews ? 0 : 1}
                                    max={100}
                                    value={showNews ? Math.round(sentiment) : item.weight}
                                    onChange={(event) =>
                                      onPatch(
                                        item.id,
                                        showNews
                                          ? newsFields(
                                              Number(event.target.value) || 0,
                                            )
                                          : {
                                              weight: clampWeight(
                                                event.target.value,
                                              ),
                                            },
                                      )
                                    }
                                    className="h-7 w-14 rounded-md border border-white/10 bg-black/40 px-1 text-center tabular-nums text-foreground"
                                  />
                                )}
                              </label>

                              {showNews ? (
                                <div className="grid min-w-0 flex-1 grid-cols-2 overflow-hidden rounded-lg border border-white/10">
                                  <button
                                    type="button"
                                    aria-pressed={newsTone === "bad"}
                                    onClick={() =>
                                      onPatch(item.id, newsFields(0))
                                    }
                                    className={`px-2 py-1 font-mono text-[10px] font-semibold tracking-widest lg:py-1.5 ${
                                      newsTone === "bad"
                                        ? "bg-[#ff3b5c] text-white"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    <span className="lg:hidden">BAD</span>
                                    <span className="hidden lg:inline">BAD NEWS</span>
                                  </button>
                                  <button
                                    type="button"
                                    aria-pressed={newsTone === "good"}
                                    onClick={() =>
                                      onPatch(item.id, newsFields(100))
                                    }
                                    className={`px-2 py-1 font-mono text-[10px] font-semibold tracking-widest lg:py-1.5 ${
                                      newsTone === "good"
                                        ? "bg-[#b6ff3b] text-[#0b1204]"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    <span className="lg:hidden">GOOD</span>
                                    <span className="hidden lg:inline">GOOD NEWS</span>
                                  </button>
                                </div>
                              ) : (
                              <TfPad
                                item={item}
                                showZonePlay={showZonePlay}
                                onTfBias={onTfBias}
                                onTfZone={onTfZone}
                              />
                              )}

                              <div className="ml-auto flex items-center gap-2">
                                <span className="font-mono text-xs text-gold">
                                  +{pointsLabel(earned)}
                                  {item.candleConfirmed ? (
                                    <span className="ml-1 text-[10px] text-[#4de8c8]">
                                      +25%
                                    </span>
                                  ) : null}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onRemove(item.id)}
                                  className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                                  aria-label={`Remove ${item.name}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={submit}
        className="mt-3 grid grid-cols-1 gap-2 border-t border-white/8 pt-3 lg:mt-5 lg:pt-4 sm:grid-cols-[1fr_auto_auto_auto]"
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add confluence…"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as Category)}
          className="h-8 min-w-[11rem] appearance-none rounded-lg border border-white/10 bg-black/40 bg-[length:12px] bg-[position:right_12px_center] bg-no-repeat py-0 pr-9 pl-2 text-sm"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b907c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          }}
        >
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={100}
          value={weight}
          onFocus={(event) => {
            const input = event.currentTarget;
            setWeight(0);
            requestAnimationFrame(() => input.select());
          }}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "") {
              setWeight(0);
              return;
            }
            setWeight(Math.min(100, Math.max(0, Number(raw))));
          }}
          className="h-8 w-full rounded-lg border border-white/10 bg-black/40 px-2 font-mono text-sm sm:w-[4.5rem]"
          aria-label="Weight"
        />
        <Button type="submit" size="sm">
          <Plus className="size-3.5" />
          Add
        </Button>
      </form>
    </section>
  );
}

function clampWeight(value: string) {
  return Math.min(100, Math.max(1, Number(value) || 1));
}

const SIDE_INK: Record<TfSide, string> = {
  bullish: "#b6ff3b",
  bearish: "#ff3b5c",
  range: "#f4c430",
};

function TfPad({
  item,
  showZonePlay,
  onTfBias,
  onTfZone,
}: {
  item: Confluence;
  showZonePlay: boolean;
  onTfBias: (id: string, timeframe: Timeframe, bias: TfSide) => void;
  onTfZone: (id: string, timeframe: Timeframe, play: ZonePlay) => void;
}) {
  const [selected, setSelected] = useState<Timeframe>(5);
  const selectedBias = item.biasByTf?.[selected] ?? "bullish";
  const selectedPlay = item.zoneByTf?.[selected] ?? "reaction";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <div
        role="tablist"
        aria-label="Timeframe"
        className="inline-flex h-7 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/55"
      >
        {TIMEFRAMES.map((timeframe) => {
          const bias = item.biasByTf?.[timeframe] ?? "bullish";
          const on = selected === timeframe;
          return (
            <button
              key={timeframe}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${timeframe}m ${SIDE_LABEL[bias].long}`}
              onClick={() => setSelected(timeframe)}
              className={cn(
                "relative flex h-full w-8 items-center justify-center font-mono text-[10px] tabular-nums tracking-wide transition",
                on
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {timeframe}m
              <span
                className="absolute inset-x-1 bottom-0.5 h-0.5 rounded-full"
                style={{
                  background: SIDE_INK[bias],
                  opacity: on ? 1 : 0.45,
                }}
              />
            </button>
          );
        })}
      </div>
      <div
        role="group"
        aria-label={`${selected}m direction`}
        className="inline-flex h-7 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/55"
      >
        {TF_SIDES.map((side) => {
          const on = selectedBias === side;
          return (
            <button
              key={side}
              type="button"
              aria-pressed={on}
              aria-label={SIDE_LABEL[side].long}
              onClick={() => onTfBias(item.id, selected, side)}
              className={cn(
                "flex h-full w-7 items-center justify-center font-mono text-[10px] font-semibold tracking-widest transition",
                !on && "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
              style={on ? WIN_STYLE[side] : undefined}
            >
              {SIDE_LABEL[side].short}
            </button>
          );
        })}
      </div>
      {showZonePlay ? (
        <div
          role="group"
          aria-label={`${selected}m zone play`}
          className="inline-flex h-7 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/55"
        >
          <button
            type="button"
            title="Reaction · 50 pts"
            aria-pressed={selectedPlay === "reaction"}
            onClick={() => onTfZone(item.id, selected, "reaction")}
            className={cn(
              "flex h-full items-center px-1.5 font-mono text-[9px] tracking-widest transition",
              selectedPlay === "reaction"
                ? "bg-[#4de8c8] text-[#041210]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            RXN
          </button>
          <button
            type="button"
            title="Breakout · 75 pts"
            aria-pressed={selectedPlay === "breakout"}
            onClick={() => onTfZone(item.id, selected, "breakout")}
            className={cn(
              "flex h-full items-center px-1.5 font-mono text-[9px] tracking-widest transition",
              selectedPlay === "breakout"
                ? "bg-[#ff8a3b] text-[#1a0c04]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            BO
          </button>
        </div>
      ) : null}
    </div>
  );
}

function heatColor(value: number) {
  if (value < 50) return "#ff3b5c";
  if (value > 50) return "#b6ff3b";
  return "#f4c430";
}

function SentimentSlide({
  value,
  onChange,
  onLive,
}: {
  value: number;
  onChange: (value: number) => void;
  onLive?: (value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const liveRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onLiveRef = useRef(onLive);
  onChangeRef.current = onChange;
  onLiveRef.current = onLive;

  const paint = useCallback((next: number) => {
    const v = Math.min(100, Math.max(0, next));
    liveRef.current = v;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (track && thumb) {
      const x = (v / 100) * track.clientWidth;
      thumb.style.transform = `translate3d(${x}px, -50%, 0) translate3d(-50%, 0, 0)`;
      const heat = heatColor(v);
      thumb.style.background = heat;
      thumb.style.boxShadow = `0 0 16px ${heat}`;
      track.setAttribute("aria-valuenow", String(Math.round(v)));
    }
    if (labelRef.current) {
      labelRef.current.textContent = String(Math.round(v)).padStart(3, "0");
    }
    onLiveRef.current?.(v);
  }, []);

  const readValue = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return liveRef.current;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return liveRef.current;
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const commit = useCallback(() => {
    onChangeRef.current(Math.round(liveRef.current));
  }, []);

  useLayoutEffect(() => {
    if (draggingRef.current) return;
    paint(value);
  }, [paint, value]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => paint(liveRef.current));
    observer.observe(track);
    return () => observer.disconnect();
  }, [paint]);

  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-center justify-between font-mono text-[9px] tracking-widest lg:mb-1.5">
        <span className="text-[#ff3b5c]">BAD</span>
        <span className="tabular-nums text-muted-foreground">
          SENTIMENT{" "}
          <span ref={labelRef}>{String(Math.round(value)).padStart(3, "0")}</span>
        </span>
        <span className="text-[#b6ff3b]">GOOD</span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="News sentiment"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        onPointerDown={(event) => {
          event.preventDefault();
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          paint(readValue(event.clientX));
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          paint(readValue(event.clientX));
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          paint(readValue(event.clientX));
          commit();
        }}
        onPointerCancel={() => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          commit();
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 1;
          let next = liveRef.current;
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") next -= step;
          else if (event.key === "ArrowRight" || event.key === "ArrowUp") next += step;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = 100;
          else return;
          event.preventDefault();
          paint(next);
          commit();
        }}
        className="relative h-7 cursor-ew-resize touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-gold/50 lg:h-10"
      >
        <div
          className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full ring-1 ring-white/25 lg:h-3"
          style={{
            background:
              "linear-gradient(90deg, #ff3b5c 0%, #f4c430 50%, #b6ff3b 100%)",
            boxShadow:
              "inset 0 1px 2px rgb(0 0 0 / 45%), 0 0 0 1px rgb(0 0 0 / 40%)",
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-black/50" />
        <span
          ref={thumbRef}
          className="pointer-events-none absolute top-1/2 left-0 z-10 size-3.5 rounded-full border-2 border-white will-change-transform lg:size-5"
        />
      </div>
    </div>
  );
}

function ConfluenceEditor({
  item,
  showZonePlay,
  onPatch,
  onDone,
}: {
  item: Confluence;
  showZonePlay: boolean;
  onPatch: (id: string, patch: Partial<Omit<Confluence, "id">>) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Input
        autoFocus
        value={item.name}
        onChange={(event) => onPatch(item.id, { name: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") onDone();
        }}
        aria-label="Confluence name"
        className="h-7 min-w-0 flex-1"
      />
      {showZonePlay ? (
        <span className="inline-flex h-7 items-center rounded-md border border-white/10 bg-black/40 px-2 font-mono text-[10px] tracking-widest text-muted-foreground">
          WT {ZONE_PLAY_POINTS.reaction}/{ZONE_PLAY_POINTS.breakout}
        </span>
      ) : (
        <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
          WT
          <input
            type="number"
            min={isNewsCategory(item.category) ? 0 : 1}
            max={100}
            value={
              isNewsCategory(item.category)
                ? Math.round(item.sentiment ?? item.weight)
                : item.weight
            }
            onChange={(event) =>
              onPatch(
                item.id,
                isNewsCategory(item.category)
                  ? newsFields(Number(event.target.value) || 0)
                  : { weight: clampWeight(event.target.value) },
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") onDone();
            }}
            aria-label={`Weight for ${item.name}`}
            className="h-7 w-14 rounded-md border border-white/10 bg-black/40 px-1 text-center text-foreground"
          />
        </label>
      )}
      <button
        type="button"
        onClick={onDone}
        className="rounded-md border border-gold/40 bg-gold/15 px-2 py-1 font-mono text-[10px] tracking-widest text-gold"
      >
        DONE
      </button>
    </div>
  );
}
