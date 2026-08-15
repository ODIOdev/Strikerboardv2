"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createDefaultBoard, createBlankConfluences } from "@/lib/default-checklist";
import { createDefaultCalculator } from "@/lib/calculator";
import {
  getDeskSnapshot,
  getServerDeskSnapshot,
  subscribeDesk,
  writeRecents,
  writeTrade,
} from "@/lib/desk-store";
import { scoreBoard } from "@/lib/scoring";
import { useHydrated } from "@/hooks/use-hydrated";
import type {
  Bias,
  CalculatorInput,
  Category,
  Confluence,
  Timeframe,
  TfSide,
  Wave,
  ZonePlay,
} from "@/lib/types";
import { createTfBias, createTfZone, newsFields } from "@/lib/types";

function isStructurePatch(patch: Partial<Omit<Confluence, "id">>) {
  const keys = Object.keys(patch);
  const live =
    keys.includes("active") ||
    keys.includes("candleConfirmed") ||
    keys.includes("biasByTf") ||
    keys.includes("zoneByTf") ||
    keys.includes("sentiment") ||
    keys.includes("newsTone");
  if (live) return keys.includes("name") || keys.includes("category");
  return keys.includes("name") || keys.includes("weight") || keys.includes("category");
}

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

export function useBoard(tradeId: string) {
  const hydrated = useHydrated();
  const desk = useSyncExternalStore(
    subscribeDesk,
    getDeskSnapshot,
    getServerDeskSnapshot,
  );

  const trade = desk.trades.find((item) => item.id === tradeId) ?? null;

  const result = useMemo(
    () => (trade ? scoreBoard(trade.confluences) : null),
    [trade],
  );

  const setTicker = useCallback(
    (ticker: string) => {
      const next = normalizeTicker(ticker);
      writeTrade(tradeId, (prev) => ({ ...prev, ticker: next }));
      if (!next) return;
      const recent = [
        next,
        ...desk.recentTickers.filter((item) => item !== next),
      ].slice(0, 6);
      writeRecents(recent);
    },
    [desk.recentTickers, tradeId],
  );

  const setBias = useCallback(
    (bias: Bias) => {
      writeTrade(tradeId, (prev) => ({ ...prev, bias }));
    },
    [tradeId],
  );

  const toggleBias = useCallback(() => {
    writeTrade(tradeId, (prev) => ({
      ...prev,
      bias: prev.bias === "bullish" ? "bearish" : "bullish",
    }));
  }, [tradeId]);

  const setWave = useCallback(
    (wave: Wave) => {
      writeTrade(tradeId, (prev) => ({ ...prev, wave }));
    },
    [tradeId],
  );

  const patchConfluence = useCallback(
    (id: string, patch: Partial<Omit<Confluence, "id">>) => {
      writeTrade(
        tradeId,
        (prev) => ({
          ...prev,
          confluences: prev.confluences.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        }),
        { syncChecklist: isStructurePatch(patch) },
      );
    },
    [tradeId],
  );

  const setTfBias = useCallback(
    (id: string, timeframe: Timeframe, bias: TfSide) => {
      writeTrade(tradeId, (prev) => ({
        ...prev,
        confluences: prev.confluences.map((item) =>
          item.id === id
            ? {
                ...item,
                biasByTf: {
                  ...createTfBias("bullish"),
                  ...item.biasByTf,
                  [timeframe]: bias,
                },
              }
            : item,
        ),
      }));
    },
    [tradeId],
  );

  const setTfZone = useCallback(
    (id: string, timeframe: Timeframe, play: ZonePlay) => {
      writeTrade(tradeId, (prev) => ({
        ...prev,
        confluences: prev.confluences.map((item) =>
          item.id === id
            ? {
                ...item,
                zoneByTf: {
                  ...createTfZone("reaction"),
                  ...item.zoneByTf,
                  [timeframe]: play,
                },
              }
            : item,
        ),
      }));
    },
    [tradeId],
  );

  const addConfluence = useCallback(
    (input: { name: string; category: Category; weight: number }) => {
      const name = input.name.trim();
      if (!name) return;
      const weight = Math.min(100, Math.max(1, Math.round(input.weight)));
      writeTrade(
        tradeId,
        (prev) => ({
          ...prev,
          confluences: [
            ...prev.confluences,
            {
              id: crypto.randomUUID(),
              name,
              category: input.category,
              zoneByTf: createTfZone("reaction"),
              active: false,
              candleConfirmed: false,
              ...(input.category === "News / Events"
                ? newsFields(weight)
                : {
                    weight,
                    biasByTf: createTfBias(prev.bias),
                    newsTone: "good" as const,
                    sentiment: 50,
                  }),
            },
          ],
        }),
        { syncChecklist: true },
      );
    },
    [tradeId],
  );

  const removeConfluence = useCallback(
    (id: string) => {
      writeTrade(
        tradeId,
        (prev) => ({
          ...prev,
          confluences: prev.confluences.filter((item) => item.id !== id),
        }),
        { syncChecklist: true },
      );
    },
    [tradeId],
  );

  const patchCalculator = useCallback(
    (patch: Partial<CalculatorInput>) => {
      writeTrade(tradeId, (prev) => ({
        ...prev,
        calculator: {
          ...(prev.calculator ?? createDefaultCalculator()),
          ...patch,
        },
      }));
    },
    [tradeId],
  );

  const resetTimeframes = useCallback(() => {
    writeTrade(tradeId, (prev) => ({
      ...prev,
      confluences: prev.confluences.map((item) => ({
        ...item,
        biasByTf: createTfBias(prev.bias),
      })),
    }));
  }, [tradeId]);

  const restoreChecklist = useCallback(() => {
    writeTrade(tradeId, (prev) => ({
      ...prev,
      confluences: createBlankConfluences(getDeskSnapshot().checklist),
    }));
  }, [tradeId]);

  const clearRecents = useCallback(() => {
    writeRecents([]);
  }, []);

  const wipeSession = useCallback(() => {
    const fresh = createDefaultBoard(getDeskSnapshot().checklist);
    writeTrade(tradeId, (prev) => ({
      ...prev,
      ticker: fresh.ticker,
      bias: fresh.bias,
      wave: fresh.wave,
      confluences: fresh.confluences,
      calculator: createDefaultCalculator(),
    }));
  }, [tradeId]);

  return {
    hydrated,
    trade,
    recentTickers: desk.recentTickers,
    result,
    setTicker,
    setBias,
    toggleBias,
    setWave,
    patchConfluence,
    patchCalculator,
    setTfBias,
    setTfZone,
    addConfluence,
    removeConfluence,
    resetTimeframes,
    restoreChecklist,
    clearRecents,
    wipeSession,
  };
}
