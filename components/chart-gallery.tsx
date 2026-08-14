"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CHARTS_EVENT,
  MAX_CHARTS,
  compressChartFile,
  deleteTradeChart,
  loadTradeCharts,
  saveTradeChart,
  type TradeChart,
} from "@/lib/trade-charts";
import { cn } from "@/lib/utils";

type ChartGalleryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeId: string;
  ticker: string;
};

export function ChartGallery({
  open,
  onOpenChange,
  tradeId,
  ticker,
}: ChartGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [charts, setCharts] = useState<TradeChart[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState<TradeChart | null>(null);

  useEffect(() => {
    if (!open) {
      setActive(null);
      setError("");
      setHover(false);
      return;
    }
    function refresh() {
      void loadTradeCharts(tradeId).then(setCharts);
    }
    refresh();
    window.addEventListener(CHARTS_EVENT, refresh);
    return () => window.removeEventListener(CHARTS_EVENT, refresh);
  }, [open, tradeId]);

  async function ingest(files: FileList | File[]) {
    const images = [...files].filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Drop a screenshot or photo.");
      return;
    }
    const room = MAX_CHARTS - charts.length;
    if (room <= 0) {
      setError(`Gallery holds ${MAX_CHARTS} charts.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const file of images.slice(0, room)) {
        const next = await compressChartFile(file);
        await saveTradeChart({
          id: crypto.randomUUID(),
          tradeId,
          createdAt: Date.now(),
          name: next.name,
          dataUrl: next.dataUrl,
        });
      }
    } catch {
      setError("Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files) void ingest(files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setHover(false);
    void ingest(event.dataTransfer.files);
  }

  async function remove(id: string) {
    await deleteTradeChart(id);
    if (active?.id === id) setActive(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,44rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            CHARTS
          </p>
          <DialogTitle className="font-mono text-xl font-bold tracking-[0.16em]">
            {ticker || "UNTITLED"}
          </DialogTitle>
          <DialogDescription>
            Upload screenshots and open the gallery for this ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-label="Upload chart screenshot"
            onChange={onPick}
          />
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setHover(true);
            }}
            onDragLeave={() => setHover(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition",
              hover
                ? "border-gold/60 bg-gold/10"
                : "border-white/15 bg-black/30",
            )}
          >
            <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
              {busy ? "UPLOADING…" : "DROP SCREENSHOT OR PHOTO"}
            </p>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="font-mono tracking-widest"
            >
              UPLOAD PHOTO
            </Button>
          </div>
          {error ? (
            <p className="font-mono text-[10px] tracking-widest text-[#ff3b5c]">
              {error}
            </p>
          ) : null}

          {active ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-mono text-[10px] tracking-widest text-muted-foreground">
                  {active.name}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActive(null)}
                    className="rounded-md px-2 py-1 font-mono text-[10px] tracking-widest text-muted-foreground transition hover:text-foreground"
                  >
                    GALLERY
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(active.id)}
                    className="rounded-md px-2 py-1 font-mono text-[10px] tracking-widest text-muted-foreground transition hover:text-destructive"
                  >
                    DELETE
                  </button>
                </div>
              </div>
              <img
                src={active.dataUrl}
                alt={active.name}
                className="max-h-[min(52vh,28rem)] w-full rounded-xl border border-white/8 bg-black object-contain"
              />
            </div>
          ) : (
            <section className="space-y-2">
              <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
                GALLERY · {charts.length}
              </p>
              {charts.length === 0 ? (
                <p className="rounded-xl border border-white/8 bg-black/25 px-3 py-8 text-center text-sm text-muted-foreground">
                  No charts yet. Upload a screenshot to start the gallery.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {charts.map((chart) => (
                    <li key={chart.id}>
                      <button
                        type="button"
                        onClick={() => setActive(chart)}
                        className="group relative block w-full overflow-hidden rounded-xl border border-white/8 bg-black/40 transition hover:border-gold/40"
                      >
                        <img
                          src={chart.dataUrl}
                          alt={chart.name}
                          className="aspect-video w-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-2 py-1 font-mono text-[9px] tracking-widest text-muted-foreground">
                          {chart.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
