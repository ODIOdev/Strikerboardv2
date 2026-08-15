"use client";

import { useRef, useState } from "react";
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
import { deskToCsv, csvToDesk, checklistsToCsv, csvToChecklists, downloadCsv, isChecklistCsv, type CsvImportResult, type CsvListImportResult } from "@/lib/csv";
import { getChecklistPresets, mergeChecklistPresets } from "@/lib/checklist-presets";
import { getDeskSnapshot, writeRecents } from "@/lib/desk-store";
import { erasePlatform } from "@/lib/erase";
import { useDesk } from "@/hooks/use-desk";

type HomeSettingsProps = {
  nav?: boolean;
  utility?: boolean;
};

export function HomeSettings({ nav = false, utility = false }: HomeSettingsProps) {
  const { recentTickers, importCsvBook } = useDesk();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvNote, setCsvNote] = useState("");
  const [pendingCsv, setPendingCsv] = useState<{
    name: string;
    text: string;
    kind: "book" | "lists";
    preview: CsvImportResult | CsvListImportResult;
  } | null>(null);
  const [eraseArmed, setEraseArmed] = useState(false);

  function createCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    const lists = getChecklistPresets();
    downloadCsv(`striker-book-${stamp}.csv`, deskToCsv(getDeskSnapshot()));
    if (lists.length > 0) {
      window.setTimeout(() => {
        downloadCsv(`striker-lists-${stamp}.csv`, checklistsToCsv(lists));
      }, 250);
      setCsvNote("CSV downloaded for the book and saved lists. Upload on live to load them.");
      return;
    }
    setCsvNote("CSV downloaded. Fill rows in Excel, then import.");
  }

  async function onPickCsv(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    if (isChecklistCsv(text)) {
      const preview = csvToChecklists(text);
      setPendingCsv({ name: file.name, text, kind: "lists", preview });
      setCsvNote(
        preview.presets.length === 0
          ? preview.skipped
            ? `${preview.skipped} row${preview.skipped === 1 ? "" : "s"} skipped.`
            : "No saved lists found in that CSV."
          : `Ready: ${preview.presets.length} saved list${preview.presets.length === 1 ? "" : "s"}.`,
      );
    } else {
      const preview = csvToDesk(text);
      setPendingCsv({ name: file.name, text, kind: "book", preview });
      const added = preview.trades.length + preview.closedTrades.length;
      setCsvNote(
        added === 0
          ? preview.skipped
            ? `${preview.skipped} row${preview.skipped === 1 ? "" : "s"} skipped. Need a ticker.`
            : "No trades found in that CSV."
          : `Ready: ${preview.trades.length} open · ${preview.closedTrades.length} closed${
              preview.skipped ? ` · ${preview.skipped} skipped` : ""
            }.`,
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function loadCsv() {
    if (!pendingCsv) return;
    if (pendingCsv.kind === "lists") {
      const result = csvToChecklists(pendingCsv.text);
      mergeChecklistPresets(result.presets);
      setCsvNote(
        result.presets.length === 0
          ? "No saved lists found in that CSV."
          : `Loaded ${result.presets.length} saved list${result.presets.length === 1 ? "" : "s"}.`,
      );
      setPendingCsv(null);
      return;
    }
    const result = importCsvBook(pendingCsv.text);
    const added = result.trades.length + result.closedTrades.length;
    setCsvNote(
      added === 0
        ? result.skipped
          ? `${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped. Need a ticker.`
          : "No trades found in that CSV."
        : `Loaded ${result.trades.length} open · ${result.closedTrades.length} closed.`,
    );
    setPendingCsv(null);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {utility ? (
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
          >
            <Settings className="size-3.5 shrink-0 opacity-80" />
            Settings
          </button>
        ) : nav ? (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-white/25 hover:text-foreground"
          >
            <Settings className="size-3.5" />
            Settings
          </button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Open settings"
            className="border-white/10 bg-black/40"
          >
            <Settings className="size-4" />
          </Button>
        )}
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
            Scoring, grades, and book utilities.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4">
          <section className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="font-mono text-[10px] tracking-[0.28em] text-gold">
              SCORE BANDS
            </p>
            <ul className="mt-2 space-y-1.5 font-mono text-xs text-muted-foreground">
              <li>700+ Prime · Grade A</li>
              <li>525–699 Valid · Grade B</li>
              <li>Below 525 Watch · Grade C</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="font-mono text-[10px] tracking-[0.28em] text-gold">
              BOARD
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>Check a print to activate it on the score.</li>
              <li>Structure rows can confirm a new candle for +25%.</li>
              <li>Zones use reaction 50 / breakout 75 per timeframe.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="font-mono text-[10px] tracking-[0.28em] text-gold">
              CSV BOOK
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a CSV of the desk and saved lists, then upload and load it
              back on the live site.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/10 font-mono text-[10px] tracking-widest"
                onClick={createCsv}
              >
                Create CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 font-mono text-[10px] tracking-widest"
                onClick={() => fileRef.current?.click()}
              >
                Upload CSV
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => void onPickCsv(event.target.files?.[0])}
            />
            {pendingCsv ? (
              <div className="mt-3 space-y-2 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
                <p className="truncate font-mono text-[10px] tracking-widest text-gold">
                  {pendingCsv.name}
                </p>
                <Button
                  type="button"
                  className="w-full font-mono text-[10px] tracking-widest"
                  onClick={loadCsv}
                >
                  Load CSV
                </Button>
              </div>
            ) : null}
            {csvNote ? (
              <p className="mt-2 font-mono text-[10px] tracking-widest text-gold">
                {csvNote}
              </p>
            ) : null}
          </section>
        </div>

        <div className="mt-auto space-y-2 border-t border-white/8 p-4">
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/10"
            disabled={recentTickers.length === 0}
            onClick={() => writeRecents([])}
          >
            Clear recent tickers
          </Button>
          {eraseArmed ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/10 font-mono text-[10px] tracking-widest"
                onClick={() => setEraseArmed(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="font-mono text-[10px] tracking-widest"
                onClick={() => {
                  erasePlatform();
                  window.location.assign("/");
                }}
              >
                Confirm erase
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="destructive"
              className="w-full font-mono text-[10px] tracking-widest"
              onClick={() => setEraseArmed(true)}
            >
              Erase platform
            </Button>
          )}
          {eraseArmed ? (
            <p className="font-mono text-[10px] tracking-widest text-[#ff3b5c]">
              Wipes trades, calendar, CSV book, and profile on this browser.
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
