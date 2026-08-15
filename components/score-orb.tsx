"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GRADE_A_POINTS, pointsLabel } from "@/lib/scoring";
import { GRADE_COLOR, type TfSide, type Wave } from "@/lib/types";
import { cn } from "@/lib/utils";

type ScoreOrbProps = {
  score: number;
  grade: Wave;
  winning: TfSide | "even";
  earned: number;
  max: number;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const BIAS_COLOR: Record<TfSide | "even", string> = {
  bullish: "#b6ff3b",
  bearish: "#ff3b5c",
  range: "#f4c430",
  even: "#8b907c",
};

export function ScoreOrb({ grade, winning, earned, max }: ScoreOrbProps) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(earned);
  const ring = Math.min(100, (Math.max(0, earned) / GRADE_A_POINTS) * 100);
  const offset = CIRCUMFERENCE - (ring / 100) * CIRCUMFERENCE;
  const label = pointsLabel(earned);

  useEffect(() => {
    if (prev.current < GRADE_A_POINTS && earned >= GRADE_A_POINTS) {
      setFlash(true);
      const timer = window.setTimeout(() => setFlash(false), 700);
      prev.current = earned;
      return () => window.clearTimeout(timer);
    }
    prev.current = earned;
  }, [earned]);

  const gradeColor = GRADE_COLOR[grade];
  const biasColor = BIAS_COLOR[winning];

  return (
    <div className="relative isolate hidden h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/8 bg-black/35 p-3 md:flex xl:p-4">
      {flash && (
        <div className="strike-flash pointer-events-none absolute inset-0 bg-gold/40" />
      )}
      <p className="w-full shrink-0 font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
        CONVICTION
      </p>
      <div className="relative mx-auto aspect-square w-full min-h-0 max-w-[9.25rem]">
        <svg viewBox="0 0 148 148" className="size-full">
          <circle
            cx="74"
            cy="74"
            r={RADIUS}
            fill="none"
            stroke="rgb(255 255 255 / 8%)"
            strokeWidth="8"
          />
          <motion.circle
            cx="74"
            cy="74"
            r={RADIUS}
            fill="none"
            stroke={biasColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: offset }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            transform="rotate(-90 74 74)"
            style={{ filter: `drop-shadow(0 0 10px ${biasColor})` }}
          />
        </svg>
        <div className="absolute inset-[24%] flex flex-col items-center justify-center gap-1.5 overflow-hidden text-center">
          <motion.span
            key={label}
            initial={{ scale: 0.86, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "max-w-full font-mono font-bold leading-none tabular-nums tracking-tight",
              label.length >= 6 ? "text-xl" : "text-2xl",
            )}
            style={{ color: biasColor }}
          >
            {label}
          </motion.span>
          <span className="font-mono text-[9px] leading-none tracking-widest text-muted-foreground">
            / {GRADE_A_POINTS} A
          </span>
        </div>
      </div>
      <div
        className="mt-2 shrink-0 whitespace-nowrap rounded-full border px-3 py-0.5 font-mono text-[11px] tracking-[0.18em]"
        style={{ borderColor: gradeColor, color: gradeColor }}
      >
        {grade} TRADE
      </div>
      <p className="mt-1.5 shrink-0 font-mono text-[9px] tracking-widest whitespace-nowrap text-muted-foreground">
        {earned.toFixed(1)} / {max.toFixed(0)} PTS
      </p>
    </div>
  );
}
