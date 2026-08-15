"use client";

import { FormEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  deleteChecklistPreset,
  getChecklistPresets,
  getServerChecklistPresets,
  mergeChecklistPresets,
  saveChecklistPreset,
  subscribeChecklistPresets,
  type ChecklistPreset,
} from "@/lib/checklist-presets";
import {
  checklistsToCsv,
  csvToChecklists,
  downloadCsv,
  isChecklistCsv,
} from "@/lib/csv";
import type { Confluence } from "@/lib/types";

type ChecklistPresetsProps = {
  confluences: Confluence[];
  onLoad: (items: Confluence[]) => void;
};

export function ChecklistPresets({
  confluences,
  onLoad,
}: ChecklistPresetsProps) {
  const presets = useSyncExternalStore(
    subscribeChecklistPresets,
    getChecklistPresets,
    getServerChecklistPresets,
  );
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [name, setName] = useState("");
  const [csvNote, setCsvNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const suggested = useMemo(() => {
    const first = confluences[0]?.name?.trim();
    return first ? first : `List ${presets.length + 1}`;
  }, [confluences, presets.length]);

  function openSave() {
    setName(suggested);
    setSaveOpen(true);
  }

  function submitSave(event: FormEvent) {
    event.preventDefault();
    const saved = saveChecklistPreset(name, confluences);
    if (!saved) return;
    setSaveOpen(false);
    setName("");
  }

  function loadPreset(preset: ChecklistPreset) {
    onLoad(preset.items);
    setLoadOpen(false);
  }

  function createCsv() {
    if (presets.length === 0) {
      setCsvNote("No saved lists to export.");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`striker-lists-${stamp}.csv`, checklistsToCsv(presets));
    setCsvNote("CSV downloaded. Upload it on the live desk to load these lists.");
  }

  async function onPickCsv(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    if (!isChecklistCsv(text)) {
      setCsvNote("That CSV is not a saved-list file.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const parsed = csvToChecklists(text);
    if (parsed.presets.length === 0) {
      setCsvNote(
        parsed.skipped
          ? `${parsed.skipped} row${parsed.skipped === 1 ? "" : "s"} skipped.`
          : "No saved lists found in that CSV.",
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    mergeChecklistPresets(parsed.presets);
    setCsvNote(
      `Loaded ${parsed.presets.length} list${parsed.presets.length === 1 ? "" : "s"} from CSV.`,
    );
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={confluences.length === 0}
          onClick={openSave}
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setLoadOpen(true)}
        >
          Load
        </Button>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
              SETTINGS
            </p>
            <DialogTitle>Save list</DialogTitle>
            <DialogDescription>
              Store this checklist in settings. Same name overwrites.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitSave} className="space-y-3 px-4 pb-4">
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name this list"
              aria-label="List name"
            />
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
              {confluences.length} PRINT{confluences.length === 1 ? "" : "S"}
            </p>
            <Button type="submit" className="w-full" disabled={confluences.length === 0}>
              Save to settings
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="flex max-h-[min(88vh,36rem)] max-w-md flex-col overflow-hidden">
          <DialogHeader>
            <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
              SETTINGS
            </p>
            <DialogTitle>Load list</DialogTitle>
            <DialogDescription>
              Saved checklists. Load one onto this trade, export a CSV for the
              live site, or delete it.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/8 p-3">
            {presets.length === 0 ? (
              <p className="px-1 py-8 text-center font-mono text-[10px] tracking-widest text-muted-foreground">
                NO SAVED LISTS
              </p>
            ) : (
              <ul className="space-y-1.5">
                {presets.map((preset) => (
                  <li key={preset.id}>
                    <div className="flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => loadPreset(preset)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/30 px-2.5 py-2 text-left transition hover:border-white/20"
                      >
                        <span className="min-w-0 truncate font-mono text-sm tracking-wide">
                          {preset.name}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground">
                          {preset.items.length} PRINT
                          {preset.items.length === 1 ? "" : "S"}
                        </span>
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${preset.name}`}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteChecklistPreset(preset.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2 border-t border-white/8 px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/10 font-mono text-[10px] tracking-widest"
                disabled={presets.length === 0}
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
            {csvNote ? (
              <p className="font-mono text-[10px] tracking-widest text-gold">
                {csvNote}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
