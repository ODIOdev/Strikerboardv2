export type AuthRole = "admin" | "user";
export type AuthProvider = "local" | "google" | "apple";

export type AuthSession = {
  username: string;
  name: string;
  role: AuthRole;
  provider: AuthProvider;
  email: string;
};

export type AuthAccount = {
  username: string;
  password: string;
  name: string;
  email: string;
  provider: AuthProvider;
  createdAt: number;
  verifiedAt: number | null;
};

export type AuthStart =
  | { ok: true; session: AuthSession }
  | { ok: true; needsCode: true; email: string; localCode?: string }
  | { ok: false; error: string };

export const AUTH_EVENT = "striker-auth";
export const ADMIN_USER = "admin";
export const ADMIN_PASSWORD = "12345678";

const SESSION_KEY = "striker-session-v1";
const ACCOUNTS_KEY = "striker-accounts-v1";
const PENDING_KEY = "striker-auth-pending-v1";
const REMEMBER_EMAIL_KEY = "striker-auth-email-v1";
const CODE_MS = 10 * 60 * 1000;

type PendingAuth = {
  mode: "login" | "setup" | "reset";
  username: string;
  password: string;
  name: string;
  email: string;
  localCode: string;
  remember: boolean;
  expiresAt: number;
};

const listeners = new Set<() => void>();
let snapshot: AuthSession | null = null;
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "").split("@")[0] ?? "";
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function makeCode() {
  return "000000";
}

function sessionStore(remember: boolean) {
  return remember ? window.localStorage : window.sessionStorage;
}

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ??
      window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (typeof parsed.username !== "string" || !parsed.username) return null;
    return {
      username: parsed.username,
      name: typeof parsed.name === "string" ? parsed.name : parsed.username,
      role: parsed.role === "admin" ? "admin" : "user",
      provider:
        parsed.provider === "google" || parsed.provider === "apple"
          ? parsed.provider
          : "local",
      email: typeof parsed.email === "string" ? parsed.email : "",
    };
  } catch {
    return null;
  }
}

function readAccounts(): AuthAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Partial<AuthAccount>;
      if (typeof row.username !== "string" || typeof row.password !== "string") {
        return [];
      }
      return [
        {
          username: row.username.trim().toLowerCase(),
          password: row.password,
          name: typeof row.name === "string" ? row.name : row.username,
          email: typeof row.email === "string" ? normalizeEmail(row.email) : "",
          provider:
            row.provider === "google" || row.provider === "apple"
              ? row.provider
              : "local",
          createdAt:
            typeof row.createdAt === "number" ? row.createdAt : Date.now(),
          verifiedAt:
            typeof row.verifiedAt === "number" ? row.verifiedAt : null,
        },
      ];
    });
  } catch {
    return [];
  }
}

function writeAccounts(accounts: AuthAccount[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function writeSession(next: AuthSession | null, remember = true) {
  snapshot = next;
  loaded = true;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    if (next) {
      sessionStore(remember).setItem(SESSION_KEY, JSON.stringify(next));
      if (remember && next.email) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, next.email);
      }
    }
  }
  emit();
}

export function rememberedEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
}

function ensure() {
  if (loaded) return snapshot;
  snapshot = readSession();
  loaded = true;
  return snapshot;
}

function readPending(): PendingAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAuth;
    if (!parsed?.email || !parsed.localCode || !parsed.expiresAt) return null;
    if (parsed.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return { ...parsed, remember: parsed.remember !== false };
  } catch {
    return null;
  }
}

function writePending(next: PendingAuth | null) {
  if (typeof window === "undefined") return;
  if (next) window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
  else window.sessionStorage.removeItem(PENDING_KEY);
}

function sessionFromAccount(account: AuthAccount): AuthSession {
  return {
    username: account.username,
    name: account.name,
    role: account.username === ADMIN_USER ? "admin" : "user",
    provider: account.provider,
    email: account.email,
  };
}

function finishPending(pending: PendingAuth) {
  const accounts = readAccounts();
  if (pending.mode === "setup") {
    const account: AuthAccount = {
      username: pending.username,
      password: pending.password,
      name: pending.name,
      email: pending.email,
      provider: "local",
      createdAt: Date.now(),
      verifiedAt: Date.now(),
    };
    writeAccounts([
      ...accounts.filter((item) => item.username !== pending.username),
      account,
    ]);
    writePending(null);
    const session = sessionFromAccount(account);
    writeSession(session, pending.remember);
    return session;
  }

  const account = accounts.find(
    (item) =>
      item.username === pending.username ||
      (item.email && item.email === pending.email),
  );
  if (!account) {
    writePending(null);
    return null;
  }
  if (pending.mode === "login" && account.password !== pending.password) {
    writePending(null);
    return null;
  }
  const next: AuthAccount = {
    ...account,
    password:
      pending.mode === "reset" && pending.password
        ? pending.password
        : account.password,
    email: pending.email || account.email,
    verifiedAt: Date.now(),
  };
  writeAccounts(
    accounts.map((item) => (item.username === next.username ? next : item)),
  );
  writePending(null);
  const session = sessionFromAccount(next);
  writeSession(session, pending.remember);
  return session;
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthSnapshot(): AuthSession | null {
  return ensure();
}

export function getServerAuthSnapshot(): AuthSession | null {
  return null;
}

export async function startLocalAuth(input: {
  mode: "login" | "setup";
  username: string;
  password: string;
  name?: string;
  email: string;
  remember?: boolean;
}): Promise<AuthStart> {
  const user = normalizeUsername(input.username);
  const password = input.password;
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || user;
  const remember = input.remember !== false;

  if (!password) return { ok: false, error: "Enter a password." };

  if (
    input.mode === "login" &&
    normalizeUsername(input.email) === ADMIN_USER &&
    password === ADMIN_PASSWORD
  ) {
    const session: AuthSession = {
      username: ADMIN_USER,
      name: "Admin",
      role: "admin",
      provider: "local",
      email: "",
    };
    writeSession(session, remember);
    return { ok: true, session };
  }

  if (!validEmail(email)) {
    return { ok: false, error: "Enter a valid email." };
  }

  const accounts = readAccounts();

  if (input.mode === "setup") {
    if (!user) return { ok: false, error: "Enter a user." };
    if (password.length < 6) {
      return { ok: false, error: "Password needs 6+ characters." };
    }
    if (user === ADMIN_USER) return { ok: false, error: "That user is reserved." };
    if (accounts.some((item) => item.username === user)) {
      return { ok: false, error: "User already exists." };
    }
    if (accounts.some((item) => item.email && item.email === email)) {
      return { ok: false, error: "Email already in use." };
    }
  } else {
    const account = accounts.find((item) => item.email === email);
    if (!account || account.password !== password) {
      return { ok: false, error: "Wrong email or password." };
    }
    if (account.verifiedAt) {
      const session = sessionFromAccount(account);
      writeSession(session, remember);
      return { ok: true, session };
    }
  }

  const pendingUser =
    input.mode === "setup"
      ? user
      : (accounts.find((item) => item.email === email)?.username ?? user);
  const localCode = makeCode();
  writePending({
    mode: input.mode,
    username: pendingUser,
    password,
    name,
    email,
    localCode,
    remember,
    expiresAt: Date.now() + CODE_MS,
  });
  return {
    ok: true,
    needsCode: true,
    email,
    localCode,
  };
}

export async function confirmEmailCode(
  code: string,
): Promise<
  | { ok: true; session: AuthSession }
  | { ok: true; resetReady: true }
  | { ok: false; error: string }
> {
  const pending = readPending();
  if (!pending) return { ok: false, error: "Code expired. Request a new one." };
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return { ok: false, error: "Enter the 6-digit code." };

  if (token !== pending.localCode) {
    return { ok: false, error: "Wrong or expired code." };
  }

  if (pending.mode === "reset") {
    writePending({ ...pending, localCode: token });
    return { ok: true, resetReady: true };
  }

  const session = finishPending(pending);
  if (!session) return { ok: false, error: "Could not open this desk." };
  return { ok: true, session };
}

export async function resendEmailCode(): Promise<
  | { ok: true; email: string; localCode?: string }
  | { ok: false; error: string }
> {
  const pending = readPending();
  if (!pending) return { ok: false, error: "Code expired. Start again." };
  const localCode = makeCode();
  writePending({
    ...pending,
    localCode,
    expiresAt: Date.now() + CODE_MS,
  });
  return {
    ok: true,
    email: pending.email,
    localCode,
  };
}

export async function startPasswordReset(
  emailValue: string,
  remember = true,
): Promise<AuthStart> {
  if (normalizeUsername(emailValue) === ADMIN_USER) {
    return { ok: false, error: "Master admin uses the desk password." };
  }
  const email = normalizeEmail(emailValue);
  if (!validEmail(email)) return { ok: false, error: "Enter the email on the desk." };
  const account = readAccounts().find((item) => item.email === email);
  if (!account) return { ok: false, error: "No desk for that email." };

  const localCode = makeCode();
  writePending({
    mode: "reset",
    username: account.username,
    password: "",
    name: account.name,
    email,
    localCode,
    remember,
    expiresAt: Date.now() + CODE_MS,
  });
  return {
    ok: true,
    needsCode: true,
    email,
    localCode,
  };
}

export function completePasswordReset(
  password: string,
): { ok: true; session: AuthSession } | { ok: false; error: string } {
  const pending = readPending();
  if (!pending || pending.mode !== "reset") {
    return { ok: false, error: "Reset expired. Start again." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password needs 6+ characters." };
  }
  const session = finishPending({ ...pending, password });
  if (!session) return { ok: false, error: "Could not reset this desk." };
  return { ok: true, session };
}

export function continueWithProvider(
  provider: "google" | "apple",
  remember = true,
): AuthSession {
  const username = `${provider}.desk`;
  const accounts = readAccounts();
  let account = accounts.find((item) => item.provider === provider);
  if (!account) {
    account = {
      username,
      password: "",
      name: provider === "google" ? "Google" : "Apple",
      email: "",
      provider,
      createdAt: Date.now(),
      verifiedAt: Date.now(),
    };
    writeAccounts([...accounts, account]);
  }
  const session = sessionFromAccount(account);
  writeSession(session, remember);
  return session;
}

export function logout() {
  writeSession(null);
}
