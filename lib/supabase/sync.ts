import {
  getDeskSnapshot,
  replaceDesk,
} from "@/lib/desk-store";
import { loadIdeas, saveIdeas, type Idea } from "@/lib/ideas";
import {
  getChecklistPresets,
  replaceChecklistPresets,
  type ChecklistPreset,
} from "@/lib/checklist-presets";
import {
  getProfileSnapshot,
  resetProfile,
  saveProfile,
  type DeskProfile,
} from "@/lib/profile";
import { getSupabase } from "@/lib/supabase/client";
import type { DeskState } from "@/lib/types";
import { deskPrintCount } from "@/lib/default-checklist";
import { peekUsers, replaceUsersState, type UsersState } from "@/lib/users";

const BOOK_ID = "striker-board";
const TABLE = "striker_state";
const STAMP_KEY = "striker-cloud-updated-at";

export type CloudBook = {
  updatedAt: number;
  desk: DeskState;
  ideas: Idea[];
  checklists?: ChecklistPreset[];
  profile: DeskProfile;
  users: UsersState;
};

let applying = false;
let timer: number | null = null;
let hydrating = false;

function localStamp() {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(STAMP_KEY) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function touchStamp(at = Date.now()) {
  if (typeof window === "undefined") return at;
  window.localStorage.setItem(STAMP_KEY, String(at));
  return at;
}

function capture(): CloudBook {
  return {
    updatedAt: localStamp() || Date.now(),
    desk: getDeskSnapshot(),
    ideas: loadIdeas(),
    checklists: getChecklistPresets(),
    profile: getProfileSnapshot(),
    users: peekUsers(),
  };
}

function apply(book: CloudBook) {
  applying = true;
  try {
    touchStamp(book.updatedAt);
    replaceDesk(book.desk);
    saveIdeas(book.ideas);
    if (Array.isArray(book.checklists)) {
      replaceChecklistPresets(book.checklists);
    }
    if (book.profile.name || book.profile.handle) {
      saveProfile(book.profile);
    } else {
      resetProfile();
    }
    replaceUsersState(book.users);
  } finally {
    applying = false;
  }
}

export function scheduleCloudPush() {
  if (applying || hydrating || typeof window === "undefined") return;
  if (!getSupabase()) return;
  touchStamp();
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void pushCloud();
  }, 600);
}

export async function pushCloud() {
  const supabase = getSupabase();
  if (!supabase || applying || typeof window === "undefined") return;
  const payload = capture();
  const { error } = await supabase.from(TABLE).upsert({
    id: BOOK_ID,
    payload,
    updated_at: new Date(payload.updatedAt).toISOString(),
  });
  if (error) console.warn("Supabase push failed", error.message);
}

export async function pullCloud(): Promise<CloudBook | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("payload, updated_at")
    .eq("id", BOOK_ID)
    .maybeSingle();
  if (error) {
    console.warn("Supabase pull failed", error.message);
    return null;
  }
  if (!data?.payload || typeof data.payload !== "object") return null;
  const raw = data.payload as Partial<CloudBook>;
  if (!raw.desk || typeof raw.desk !== "object") return null;
  return {
    updatedAt:
      typeof raw.updatedAt === "number"
        ? raw.updatedAt
        : Date.parse(String(data.updated_at ?? "")) || 0,
    desk: raw.desk,
    ideas: Array.isArray(raw.ideas) ? raw.ideas : [],
    checklists: Array.isArray(raw.checklists) ? raw.checklists : undefined,
    profile: raw.profile ?? { name: "", handle: "" },
    users: raw.users ?? { currentId: "", users: [] },
  };
}

export async function hydrateFromCloud() {
  if (hydrating || typeof window === "undefined") return;
  const { applyLaunchSeed } = await import("../launch-seed");
  if (!getSupabase()) {
    await applyLaunchSeed();
    return;
  }
  hydrating = true;
  try {
    await applyLaunchSeed();
    const remote = await pullCloud();
    const local = capture();
    if (!remote) {
      await pushCloud();
      return;
    }
    const remoteCount = deskPrintCount(remote.desk);
    const localCount = deskPrintCount(local.desk);
    if (remoteCount > 0 && localCount === 0) {
      apply(remote);
    } else if (localCount > 0 && remoteCount === 0) {
      touchStamp();
      await pushCloud();
    } else if (remote.updatedAt > local.updatedAt) {
      apply(remote);
    } else if (local.updatedAt >= remote.updatedAt) {
      await pushCloud();
    }
    const repaired = await applyLaunchSeed();
    if (repaired) {
      touchStamp();
      await pushCloud();
    }
  } finally {
    hydrating = false;
  }
}

export async function eraseCloud() {
  const supabase = getSupabase();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STAMP_KEY);
  }
  if (!supabase) return;
  await supabase.from(TABLE).delete().eq("id", BOOK_ID);
}
