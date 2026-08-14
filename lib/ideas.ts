import { dateKey } from "./calendar";
import { queueCloudPush } from "./supabase/queue";

const IDEAS_KEY = "striker-ideas-v2";
const PREV_IDEAS_KEYS = ["striker-ideas-v1"];

export type Idea = {
  id: string;
  ticker: string;
  note: string;
  createdAt: number;
  plannedFor: string;
};

function coerceIdea(item: unknown): Idea | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.ticker !== "string" ||
    typeof raw.note !== "string" ||
    typeof raw.createdAt !== "number"
  ) {
    return null;
  }
  const plannedFor =
    typeof raw.plannedFor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.plannedFor)
      ? raw.plannedFor
      : dateKey(new Date(raw.createdAt));
  return {
    id: raw.id,
    ticker: raw.ticker,
    note: raw.note,
    createdAt: raw.createdAt,
    plannedFor,
  };
}

function readList(raw: string | null): Idea[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    const idea = coerceIdea(item);
    return idea ? [idea] : [];
  });
}

export function loadIdeas(): Idea[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(IDEAS_KEY);
    if (raw != null) return readList(raw);
    for (const key of PREV_IDEAS_KEYS) {
      const migrated = readList(window.localStorage.getItem(key));
      if (migrated.length > 0) {
        saveIdeas(migrated);
        return migrated;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export const IDEAS_EVENT = "striker-ideas";

export function saveIdeas(ideas: Idea[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas));
  window.dispatchEvent(new Event(IDEAS_EVENT));
  queueCloudPush();
}

export function removeIdeasByTicker(ticker: string) {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return;
  saveIdeas(loadIdeas().filter((idea) => idea.ticker !== symbol));
}

export function clearIdeas() {
  if (typeof window === "undefined") return;
  saveIdeas([]);
  for (const key of PREV_IDEAS_KEYS) {
    window.localStorage.removeItem(key);
  }
}
