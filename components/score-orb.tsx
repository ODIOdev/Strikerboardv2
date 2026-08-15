"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GRADE_A_POINTS, pointsLabel } from "@/lib/scoring";
import { GRADE_COLOR, type TfSide, type Wave } from "@/lib/types";

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
    <div className="relative isolate hidden min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/8 bg-black/35 p-4 lg:flex">
      {flash && (
        <div className="strike-flash pointer-events-none absolute inset-0 bg-gold/40" />
      )}
      <p className="absolute top-4 left-4 font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
        CONVICTION
      </p>
      <div className="relative">
        <svg width="148" height="148" viewBox="0 0 148 148">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={Math.round(earned)}
            initial={{ scale: 0.86, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-4xl font-bold tracking-tight"
            style={{ color: biasColor }}
          >
            {pointsLabel(earned)}
          </motion.span>
          <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
            / {GRADE_A_POINTS} A
          </span>
        </div>
      </div>
      <div
        className="mt-2 whitespace-nowrap rounded-full border px-3 py-0.5 font-mono text-[11px] tracking-[0.18em]"
        style={{ borderColor: gradeColor, color: gradeColor }}
      >
        {grade} TRADE
      </div>
      <p className="mt-2 font-mono text-[10px] tracking-widest text-muted-foreground">
        {earned.toFixed(1)} / {max.toFixed(0)} PTS
      </p>
    </div>
  );
}
