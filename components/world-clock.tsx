"use client";

import { useEffect, useRef, useState } from "react";
import { useNow } from "@/hooks/use-now";
import { formatElapsed } from "@/lib/time";
import {
  WORLD_ZONES,
  equityWindow,
  formatZoneClock,
  formatZoneWeekday,
  forexWindow,
} from "@/lib/markets";
import {
  announceMarketOpen,
  playClosingBell,
  testMarketAlerts,
  unlockMarketAudio,
} from "@/lib/market-alerts";
import { cn } from "@/lib/utils";

type ClockMode = "live" | "forex" | "stocks";

const MODES: { id: ClockMode; label: string }[] = [
  { id: "live", label: "REAL TIME" },
  { id: "forex", label: "FOREX" },
  { id: "stocks", label: "STOCKS" },
];

export function WorldClock() {
  const now = useNow(true);
  const [mode, setMode] = useState<ClockMode>("live");
  const instant = now ? new Date(now) : null;
  const prevOpen = useRef<boolean | null>(null);
  const prevMode = useRef(mode);

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
    <section className="w-full rounded-2xl border border-white/8 bg-black/35 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
              <li
                key={zone.id}
                className="rounded-xl border border-white/8 bg-black/40 px-2.5 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[9px] tracking-[0.22em] text-muted-foreground">
                    {zone.label}
                  </p>
                  <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
                    {formatZoneWeekday(instant, zone.tz)}
                  </p>
                </div>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight sm:text-xl">
                  {formatZoneClock(instant, zone.tz)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <MarketCountdown
            now={now}
            window={mode === "forex" ? forexWindow(instant) : equityWindow(instant)}
            market={mode === "forex" ? "FOREX" : "US EQUITY"}
            kind={mode}
          />
        )}
      </div>
    </section>
  );
}

function MarketCountdown({
  now,
  window,
  market,
  kind,
}: {
  now: number;
  window: ReturnType<typeof forexWindow>;
  market: string;
  kind: "forex" | "stocks";
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
        <button
          type="button"
          onClick={() => void testMarketAlerts(kind)}
          className="rounded-md border border-gold/40 bg-gold/15 px-2 py-1 font-mono text-[9px] tracking-widest text-gold transition hover:bg-gold hover:text-primary-foreground"
        >
          TEST ALERTS
        </button>
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
