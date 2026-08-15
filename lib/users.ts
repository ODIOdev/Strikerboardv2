import { createEmptyDesk } from "./default-checklist";
import { getDeskSnapshot, replaceDesk } from "./desk-store";
import { loadIdeas, saveIdeas, type Idea } from "./ideas";
import {
  getProfileSnapshot,
  resetProfile,
  saveProfile,
  type DeskProfile,
} from "./profile";
import type { DeskState } from "./types";

import { queueCloudPush } from "./supabase/queue";

const USERS_KEY = "striker-users-v1";

export type DeskUser = {
  id: string;
  profile: DeskProfile;
  desk: DeskState;
  ideas: Idea[];
  updatedAt: number;
};

export type UsersState = {
  currentId: string;
  users: DeskUser[];
};

const EMPTY_PROFILE: DeskProfile = { name: "", handle: "" };
const EMPTY_USERS: UsersState = { currentId: "", users: [] };

const listeners = new Set<() => void>();
let snapshot: UsersState = EMPTY_USERS;
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

function cloneDesk(desk: DeskState): DeskState {
  return JSON.parse(JSON.stringify(desk)) as DeskState;
}

function cloneIdeas(ideas: Idea[]): Idea[] {
  return JSON.parse(JSON.stringify(ideas)) as Idea[];
}

function labelOf(user: DeskUser) {
  return user.profile.name.trim() || "Untitled";
}

function captureLive(): Omit<DeskUser, "id"> {
  return {
    profile: { ...getProfileSnapshot() },
    desk: cloneDesk(getDeskSnapshot()),
    ideas: cloneIdeas(loadIdeas()),
    updatedAt: Date.now(),
  };
}

function applyLive(user: DeskUser) {
  replaceDesk(cloneDesk(user.desk));
  saveIdeas(cloneIdeas(user.ideas));
  if (user.profile.name || user.profile.handle) {
    saveProfile(user.profile);
  } else {
    resetProfile();
  }
}

function writeUsers(next: UsersState) {
  snapshot = next;
  loaded = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(next));
  }
  queueCloudPush();
  emit();
}

export function peekUsers(): UsersState {
  if (loaded) return snapshot;
  return readUsers() ?? EMPTY_USERS;
}

export function replaceUsersState(next: UsersState) {
  writeUsers(next.users.length > 0 ? next : EMPTY_USERS);
}

function readUsers(): UsersState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UsersState>;
    if (!Array.isArray(parsed.users) || typeof parsed.currentId !== "string") {
      return null;
    }
    const users = parsed.users.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      if (typeof item.id !== "string") return [];
      const profile = item.profile ?? EMPTY_PROFILE;
      return [
        {
          id: item.id,
          profile: {
            name: typeof profile.name === "string" ? profile.name : "",
            handle: typeof profile.handle === "string" ? profile.handle : "",
          },
          desk: item.desk ?? createEmptyDesk(),
          ideas: Array.isArray(item.ideas) ? item.ideas : [],
          updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
        },
      ];
    });
    const currentId =
      users.some((user) => user.id === parsed.currentId)
        ? parsed.currentId
        : users[0]?.id ?? "";
    return { currentId, users };
  } catch {
    return null;
  }
}

function ensureUsers(): UsersState {
  if (loaded) return snapshot;
  const stored = readUsers();
  if (stored && stored.users.length > 0) {
    snapshot = stored;
    loaded = true;
    persistCurrentUser();
    return snapshot;
  }
  const seeded: DeskUser = {
    id: crypto.randomUUID(),
    ...captureLive(),
  };
  writeUsers({ currentId: seeded.id, users: [seeded] });
  return snapshot;
}

export function subscribeUsers(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUsersSnapshot(): UsersState {
  if (typeof window === "undefined") return EMPTY_USERS;
  return ensureUsers();
}

export function getServerUsersSnapshot(): UsersState {
  return EMPTY_USERS;
}

export function persistCurrentUser() {
  const state = ensureUsers();
  if (!state.currentId) {
    const seeded: DeskUser = {
      id: crypto.randomUUID(),
      ...captureLive(),
    };
    writeUsers({ currentId: seeded.id, users: [seeded] });
    return;
  }
  const live = captureLive();
  writeUsers({
    ...state,
    users: state.users.map((user) =>
      user.id === state.currentId ? { ...user, ...live } : user,
    ),
  });
}

export function createUser() {
  persistCurrentUser();
  const next: DeskUser = {
    id: crypto.randomUUID(),
    profile: { ...EMPTY_PROFILE },
    desk: createEmptyDesk(),
    ideas: [],
    updatedAt: Date.now(),
  };
  writeUsers({
    currentId: next.id,
    users: [...snapshot.users, next],
  });
  applyLive(next);
  return next;
}

export function loadUser(id: string) {
  persistCurrentUser();
  const user = snapshot.users.find((item) => item.id === id);
  if (!user || user.id === snapshot.currentId) return user ?? null;
  writeUsers({ ...snapshot, currentId: id });
  applyLive(user);
  return user;
}

export function resetUsers() {
  snapshot = EMPTY_USERS;
  loaded = true;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(USERS_KEY);
  }
  emit();
}

export function userLabel(user: DeskUser) {
  const handle = user.profile.handle.trim().replace(/^@+/, "").split("@")[0] ?? "";
  if (!handle) return labelOf(user);
  const tag = handle === "admin" ? handle : `@${handle}`;
  return `${labelOf(user)} · ${tag}`;
}
