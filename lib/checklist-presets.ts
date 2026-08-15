import { toChecklistTemplate } from "./default-checklist";
import { queueCloudPush } from "./supabase/queue";
import type { Confluence } from "./types";
import { createTfBias, createTfZone, resolveCategory } from "./types";

const PRESETS_KEY = "striker-checklists-v1";

export type ChecklistPreset = {
  id: string;
  name: string;
  items: Confluence[];
  createdAt: number;
};

const listeners = new Set<() => void>();
let snapshot: ChecklistPreset[] = [];
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

function coerceItem(value: unknown): Confluence | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const category = resolveCategory(raw.category);
  if (typeof raw.name !== "string" || !raw.name.trim() || !category) return null;
  const weight =
    typeof raw.weight === "number" && Number.isFinite(raw.weight)
      ? Math.min(100, Math.max(1, Math.round(raw.weight)))
      : 8;
  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    name: raw.name.trim(),
    category,
    weight,
    active: false,
    candleConfirmed: false,
    biasByTf: createTfBias(),
    zoneByTf: createTfZone(),
  };
}

function coercePreset(value: unknown): ChecklistPreset | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  if (!Array.isArray(raw.items)) return null;
  const items = toChecklistTemplate(
    raw.items.flatMap((item) => {
      const next = coerceItem(item);
      return next ? [next] : [];
    }),
  );
  if (items.length === 0) return null;
  return {
    id: raw.id,
    name: raw.name.trim() || "Untitled",
    items,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now(),
  };
}

function readPresets(): ChecklistPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const next = coercePreset(item);
      return next ? [next] : [];
    });
  } catch {
    return [];
  }
}

function writePresets(next: ChecklistPreset[]) {
  snapshot = next;
  loaded = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  }
  queueCloudPush();
  emit();
}

export function subscribeChecklistPresets(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getChecklistPresets(): ChecklistPreset[] {
  if (!loaded) {
    snapshot = readPresets();
    loaded = true;
  }
  return snapshot;
}

export function getServerChecklistPresets(): ChecklistPreset[] {
  return [];
}

export function replaceChecklistPresets(next: ChecklistPreset[]) {
  writePresets(
    next.flatMap((item) => {
      const preset = coercePreset(item);
      return preset ? [preset] : [];
    }),
  );
}

export function saveChecklistPreset(name: string, items: Confluence[]) {
  const label = name.trim() || `List ${getChecklistPresets().length + 1}`;
  const template = toChecklistTemplate(items);
  if (template.length === 0) return null;
  const current = getChecklistPresets();
  const existing = current.find(
    (preset) => preset.name.toLowerCase() === label.toLowerCase(),
  );
  const preset: ChecklistPreset = {
    id: existing?.id ?? crypto.randomUUID(),
    name: label,
    items: template,
    createdAt: Date.now(),
  };
  writePresets(
    existing
      ? current.map((item) => (item.id === existing.id ? preset : item))
      : [preset, ...current],
  );
  return preset;
}

export function deleteChecklistPreset(id: string) {
  writePresets(getChecklistPresets().filter((preset) => preset.id !== id));
}

export function clearChecklistPresets() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PRESETS_KEY);
  }
  snapshot = [];
  loaded = true;
  queueCloudPush();
  emit();
}
