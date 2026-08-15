import {
  DEFAULT_CONFLUENCES,
  LAUNCH_PRESET_ID,
  LAUNCH_PRESET_NAME,
  sameChecklistTemplate,
  toChecklistTemplate,
} from "./default-checklist";
import type { ChecklistPreset } from "./checklist-presets";
import type { Confluence } from "./types";

export const LAUNCH_CSV_PATH = "/checklists/456.csv";

const BAKED_CSV = `list,listId,print,category,weight,createdAt
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,Major Zones,Key Levels / Zones,75,2026-08-15T16:35:58.478Z
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,Break of Structure (BOS),Price Structure,40,2026-08-15T16:35:58.478Z
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,Change of Character (ChocH),Price Structure,30,2026-08-15T16:35:58.478Z
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,Hidden Divergence,Momentum,60,2026-08-15T16:35:58.478Z
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,Events,News / Events,50,2026-08-15T16:35:58.478Z
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,HTF BIAS,Market Bias,60,2026-08-15T16:35:58.478Z
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,Order Block,Order Flow,50,2026-08-15T16:35:58.478Z
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,EMA,Trend / Entry,20,2026-08-15T16:35:58.478Z
MNT EDG,35c21a3a-26f5-48d1-aa40-e0e91bd54262,Reg Divergence,Momentum,40,2026-08-15T16:35:58.478Z
`;

function fallbackItems() {
  return toChecklistTemplate(DEFAULT_CONFLUENCES);
}

function fallbackPreset(items: Confluence[]): ChecklistPreset {
  return {
    id: LAUNCH_PRESET_ID,
    name: LAUNCH_PRESET_NAME,
    items,
    createdAt: Date.parse("2026-08-15T16:35:58.478Z") || Date.now(),
  };
}

async function readLaunchCsv() {
  if (typeof window === "undefined") return BAKED_CSV;
  try {
    const response = await fetch(LAUNCH_CSV_PATH, { cache: "no-store" });
    if (!response.ok) return BAKED_CSV;
    const text = await response.text();
    return text.includes("Major Zones") ? text : BAKED_CSV;
  } catch {
    return BAKED_CSV;
  }
}

export async function applyLaunchSeed() {
  if (typeof window === "undefined") return false;
  const [{ csvToChecklists }, deskStore, presets] = await Promise.all([
    import("./csv"),
    import("./desk-store"),
    import("./checklist-presets"),
  ]);

  const parsed = csvToChecklists(await readLaunchCsv());
  const source = parsed.presets[0];
  const items = toChecklistTemplate(source?.items?.length ? source.items : fallbackItems());
  if (!items.length) return false;

  const preset = {
    ...fallbackPreset(items),
    id: source?.id || LAUNCH_PRESET_ID,
    name: source?.name || LAUNCH_PRESET_NAME,
    createdAt: source?.createdAt || fallbackPreset(items).createdAt,
  };

  let changed = false;
  const current = presets.getChecklistPresets();
  const existing = current.find(
    (item) =>
      item.id === preset.id ||
      item.name.toLowerCase() === preset.name.toLowerCase(),
  );
  if (!existing || !sameChecklistTemplate(existing.items, items)) {
    presets.mergeChecklistPresets([preset]);
    changed = true;
  }

  const desk = deskStore.getDeskSnapshot();
  if (!sameChecklistTemplate(desk.checklist, items)) {
    deskStore.writeDesk({ ...desk, checklist: items });
    changed = true;
  }

  return changed;
}
