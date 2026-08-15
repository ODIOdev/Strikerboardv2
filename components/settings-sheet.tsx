"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SettingsSheetProps = {
  recentCount: number;
  onReset: () => void;
  onRestore: () => void;
  onClearRecents: () => void;
  onWipe: () => void;
  onDelete: () => void;
};

export function SettingsSheet({
  recentCount,
  onReset,
  onRestore,
  onClearRecents,
  onWipe,
  onDelete,
}: SettingsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Open settings"
          className="border-white/10 bg-black/40"
        >
          <Settings className="size-4" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="border-white/8 bg-[#0c0e14] sm:max-w-md"
      >
        <SheetHeader className="border-b border-white/8">
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            DESK
          </p>
          <SheetTitle className="text-lg">Settings</SheetTitle>
          <SheetDescription>
            L/S timeframes score the board. Range stays at 0. One selected timeframe is the full score.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4">
          <section className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="font-mono text-[10px] tracking-[0.28em] text-gold">
              SCORE BANDS
            </p>
            <ul className="mt-2 space-y-1.5 font-mono text-xs text-muted-foreground">
              <li>700+ A</li>
              <li>525–699 B</li>
              <li>Below 525 C</li>
            </ul>
          </section>

          <section className="space-y-2">
            <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
              BOARD
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start border-white/10"
              onClick={onReset}
            >
              Reset TF bias
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start border-white/10"
              onClick={onRestore}
            >
              Reset checklist
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start border-white/10"
              disabled={recentCount === 0}
              onClick={onClearRecents}
            >
              Clear recent tickers
            </Button>
          </section>
        </div>

        <div className="mt-auto space-y-2 border-t border-white/8 p-4">
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/10"
            onClick={onWipe}
          >
            Reset this trade
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={onDelete}
          >
            Delete this trade
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
