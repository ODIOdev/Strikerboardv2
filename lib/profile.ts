import { queueCloudPush } from "./supabase/queue";

export type DeskProfile = {
  name: string;
  handle: string;
};

const PROFILE_KEY = "striker-profile-v1";
const EMPTY: DeskProfile = { name: "", handle: "" };

const listeners = new Set<() => void>();
let snapshot: DeskProfile = EMPTY;
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

function readProfile(): DeskProfile {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DeskProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      handle: typeof parsed.handle === "string" ? parsed.handle : "",
    };
  } catch {
    return EMPTY;
  }
}

export function subscribeProfile(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProfileSnapshot(): DeskProfile {
  if (!loaded) {
    snapshot = readProfile();
    loaded = true;
  }
  return snapshot;
}

export function getServerProfileSnapshot(): DeskProfile {
  return EMPTY;
}

export function loadProfile(): DeskProfile {
  return getProfileSnapshot();
}

export function saveProfile(profile: DeskProfile): DeskProfile {
  const next: DeskProfile = {
    name: profile.name.trim(),
    handle: profile.handle.trim().replace(/^@/, ""),
  };
  snapshot = next;
  loaded = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }
  queueCloudPush();
  emit();
  return next;
}

export function resetProfile() {
  snapshot = EMPTY;
  loaded = true;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PROFILE_KEY);
  }
  queueCloudPush();
  emit();
}
