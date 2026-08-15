"use client";

import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
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
  saveChecklistPreset,
  subscribeChecklistPresets,
  type ChecklistPreset,
} from "@/lib/checklist-presets";
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
              Saved checklists. Load one onto this trade, or delete it.
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
        </DialogContent>
      </Dialog>
    </>
  );
}
