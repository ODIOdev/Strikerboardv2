"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BiasHud } from "@/components/bias-hud";
import { ConfluenceBoard } from "@/components/confluence-board";
import { ScoreOrb } from "@/components/score-orb";
import { ScoreRadar } from "@/components/score-radar";
import { TickerBar } from "@/components/ticker-bar";
import { TradeCalculator } from "@/components/trade-calculator";
import { TradeTicket } from "@/components/trade-ticket";
import { StrikeWindow } from "@/components/strike-window";
import { Button } from "@/components/ui/button";
import { useBoard } from "@/hooks/use-board";
import { closeTrade } from "@/lib/desk-store";
import { removeIdeasByTicker } from "@/lib/ideas";

type StrikerDeskProps = {
  tradeId: string;
};

export function StrikerDesk({ tradeId }: StrikerDeskProps) {
  const router = useRouter();
  const board = useBoard(tradeId);
  const { trade, result, hydrated } = board;

  if (!hydrated) {
    return (
      <div className="desk-glow relative min-h-screen">
        <div className="desk-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex min-h-screen items-center justify-center">
          <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
            OPENING DESK
          </p>
        </div>
      </div>
    );
  }

  if (!trade || !result) {
    return (
      <div className="desk-glow relative min-h-screen">
        <div className="desk-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
            TRADE
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Not on the desk</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            This trade is gone or never existed in this browser.
          </p>
          <Button asChild>
            <Link href="/">Back to trades</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-bias={
        result.overall.winning === "even"
          ? trade.bias
          : result.overall.winning
      }
      className="desk-glow relative min-h-screen"
    >
      <div className="desk-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative flex min-h-screen flex-col">
        <TickerBar />

        <main className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-1 flex-col gap-3 overflow-x-hidden p-3 pb-6">
          <TradeCalculator
            tradeId={tradeId}
            ticker={trade.ticker}
            value={trade.calculator}
            onChange={board.patchCalculator}
            onTicker={board.setTicker}
          />
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
            <BiasHud
              overall={result.overall}
              grade={result.grade}
              earned={result.earned}
              startedAt={trade.createdAt}
              ticker={trade.ticker}
              calculator={trade.calculator}
              onTicker={board.setTicker}
              onClose={(exitPrice) => {
                closeTrade(tradeId, exitPrice);
                if (trade.ticker) removeIdeasByTicker(trade.ticker);
                router.replace("/");
              }}
            />
            <StrikeWindow result={result} />
            <ScoreOrb
              score={result.score}
              grade={result.grade}
              winning={result.overall.winning}
              earned={result.earned}
              max={result.max}
            />
          </div>

          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
            <ConfluenceBoard
              result={result}
              confluences={trade.confluences}
              onTfBias={board.setTfBias}
              onTfZone={board.setTfZone}
              onPatch={board.patchConfluence}
              onAdd={board.addConfluence}
              onRemove={board.removeConfluence}
              onRestore={board.restoreChecklist}
              onLoadList={board.loadChecklist}
            />
            <div className="flex min-w-0 flex-col gap-3">
              <TradeTicket
                ticker={trade.ticker}
                winning={result.overall.winning}
                score={result.score}
                band={result.band}
                hint={result.hint}
              />
              <ScoreRadar result={result} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
