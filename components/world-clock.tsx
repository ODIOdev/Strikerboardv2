"use client";

import { useEffect, useRef, useState } from "react";
import { useNow } from "@/hooks/use-now";
import { formatElapsed } from "@/lib/time";
import {
  WEEKDAY_SHORT,
  WORLD_ZONES,
  equityWindow,
  forexWindow,
  zoneParts,
} from "@/lib/markets";
import {
  announceMarketOpen,
  playClosingBell,
  unlockMarketAudio,
} from "@/lib/market-alerts";
import { cn } from "@/lib/utils";

const ZONE_FACE: Record<
  (typeof WORLD_ZONES)[number]["id"],
  { code: string; tone: string }
> = {
  ny: { code: "NYC", tone: "#b6ff3b" },
  ldn: { code: "LDN", tone: "#f4c430" },
  tko: { code: "TYO", tone: "#7ecbff" },
  syd: { code: "SYD", tone: "#ff8a3b" },
};

function zoneOffset(date: Date, timeZone: string) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  return name?.replace("GMT", "UTC") ?? "";
}

type ClockMode = "live" | "forex" | "stocks";

const MODES: { id: ClockMode; label: string }[] = [
  { id: "live", label: "REAL TIME" },
  { id: "forex", label: "FOREX" },
  { id: "stocks", label: "STOCKS" },
];

export function WorldClock() {
  const now = useNow(true);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ClockMode>("live");
  const instant = now ? new Date(now) : null;
  const prevOpen = useRef<boolean | null>(null);
  const prevMode = useRef(mode);
  const ny = instant ? zoneParts(instant, "America/New_York") : null;

  useEffect(() => {
    if (mode === "live" || !instant) {
      prevOpen.current = null;
      prevMode.current = mode;
      return;
    }
    const session = mode === "forex" ? forexWindow(instant) : equityWindow(instant);
    if (prevMode.current !== mode) {
      prevMode.current = mode;
      prevOpen.current = session.open;
      return;
    }
    if (prevOpen.current === null) {
      prevOpen.current = session.open;
      return;
    }
    if (prevOpen.current === session.open) return;
    prevOpen.current = session.open;
    if (session.open) announceMarketOpen(mode);
    else void playClosingBell();
  }, [instant, mode]);

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-white/8 bg-black/35">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
          TIME
        </p>
        <span className="flex items-center gap-2">
          {!open && ny ? (
            <span className="font-mono text-sm tabular-nums tracking-tight text-muted-foreground">
              {String(ny.hour).padStart(2, "0")}:{String(ny.minute).padStart(2, "0")}
              <span className="ml-1.5 text-[10px] tracking-widest">NYC</span>
            </span>
          ) : null}
          <svg
            viewBox="0 0 16 16"
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              open && "rotate-90 text-gold",
            )}
            aria-hidden
          >
            <path
              d="M6 3l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open ? (
      <div className="flex flex-col gap-3 border-t border-white/8 p-3 lg:flex-row lg:items-center">
        <div
          role="radiogroup"
          aria-label="Clock mode"
          className="grid shrink-0 grid-cols-3 rounded-full border border-white/10 bg-black/50 p-0.5 lg:w-[18rem]"
        >
          {MODES.map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  void unlockMarketAudio();
                  setMode(item.id);
                }}
                className={cn(
                  "rounded-full px-2 py-1.5 font-mono text-[9px] tracking-widest transition",
                  active
                    ? "bg-gold text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {!instant ? (
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
            SYNCING
          </p>
        ) : mode === "live" ? (
          <ul className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            {WORLD_ZONES.map((zone) => (
              <ZoneTile key={zone.id} zone={zone} date={instant} />
            ))}
          </ul>
        ) : (
          <MarketCountdown
            now={now}
            window={mode === "forex" ? forexWindow(instant) : equityWindow(instant)}
            market={mode === "forex" ? "FOREX" : "US EQUITY"}
          />
        )}
      </div>
      ) : null}
    </section>
  );
}

function ZoneTile({
  zone,
  date,
}: {
  zone: (typeof WORLD_ZONES)[number];
  date: Date;
}) {
  const face = ZONE_FACE[zone.id];
  const parts = zoneParts(date, zone.tz);
  const hh = String(parts.hour).padStart(2, "0");
  const mm = String(parts.minute).padStart(2, "0");
  const ss = String(parts.second).padStart(2, "0");
  const dayPct = ((parts.hour * 60 + parts.minute) / (24 * 60)) * 100;
  const desk = parts.hour >= 8 && parts.hour < 17;
  const offset = zoneOffset(date, zone.tz);

  return (
    <li className="relative overflow-hidden rounded-xl border border-white/8 bg-black/40 px-3 py-2.5">
      <span
        className="pointer-events-none absolute -top-8 -right-6 size-20 rounded-full blur-3xl"
        style={{ background: face.tone, opacity: 0.16 }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <p
          className="font-mono text-[10px] font-bold tracking-[0.28em]"
          style={{ color: face.tone }}
        >
          {face.code}
        </p>
        <span className="rounded-full border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground">
          {WEEKDAY_SHORT[parts.weekday]}
        </span>
      </div>
      <p className="relative mt-1 flex items-baseline font-mono tabular-nums tracking-tight">
        <span className="text-2xl font-semibold">
          {hh}:{mm}
        </span>
        <span className="ml-1 text-sm font-medium text-muted-foreground">
          :{ss}
        </span>
      </p>
      <div className="relative mt-2 h-0.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{ width: `${dayPct}%`, background: face.tone }}
        />
      </div>
      <div className="relative mt-1.5 flex items-center justify-between gap-2 font-mono text-[9px] tracking-widest text-muted-foreground">
        <span className="truncate">{zone.label}</span>
        <span style={{ color: desk ? face.tone : undefined }}>
          {desk ? "DESK" : offset || "OFF"}
        </span>
      </div>
    </li>
  );
}

function MarketCountdown({
  now,
  window,
  market,
}: {
  now: number;
  window: ReturnType<typeof forexWindow>;
  market: string;
}) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-stretch">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/40 px-3 py-2 sm:flex-col sm:items-start sm:justify-center">
        <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
          {market}
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[9px] tracking-widest",
            window.open
              ? "bg-[#b6ff3b]/15 text-[#b6ff3b]"
              : "bg-[#ff3b5c]/15 text-[#ff3b5c]",
          )}
        >
          {window.open ? "OPEN" : "CLOSED"}
        </span>
      </div>
      <CountdownRow
        label="OPENS IN"
        at={window.opensAt}
        now={now}
        caption={window.openCaption}
        live={window.open}
      />
      <CountdownRow
        label="CLOSES IN"
        at={window.closesAt}
        now={now}
        caption={window.closeCaption}
      />
    </div>
  );
}

function CountdownRow({
  label,
  at,
  now,
  caption,
  live = false,
}: {
  label: string;
  at: Date;
  now: number;
  caption: string;
  live?: boolean;
}) {
  const remaining = at.getTime() - now;
  const due = remaining <= 0;
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
          {caption}
        </p>
      </div>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-black tabular-nums tracking-tight",
          live || due ? "text-[#b6ff3b]" : "text-gold",
        )}
      >
        {due || live ? "NOW" : formatElapsed(now, at.getTime())}
      </p>
    </div>
  );
}
