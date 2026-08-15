"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  completePasswordReset,
  confirmEmailCode,
  rememberedUsername,
  resendEmailCode,
  startLocalAuth,
  startPasswordReset,
} from "@/lib/auth";
import { saveProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

type Mode = "login" | "setup";

export function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<"form" | "code" | "reset">("form");
  const [codePurpose, setCodePurpose] = useState<"login" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = rememberedUsername();
    if (saved) {
      setUsername(saved);
      setRemember(true);
    }
  }, []);

  function enter(session: { name: string; username: string }) {
    if (session.name) {
      saveProfile({
        name: session.name,
        handle: session.username.replace(/^@+/, "").split("@")[0] ?? session.username,
      });
    }
    router.replace("/");
  }

  const passwordsMatch =
    mode === "setup" && password.length > 0 && password === confirm;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "setup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const result = await startLocalAuth({
      mode,
      username,
      password,
      name,
      remember,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if ("needsCode" in result) {
      setSentTo(result.username);
      setLocalCode(result.localCode ?? "000000");
      setCode("000000");
      setCodePurpose("login");
      setStep("code");
      return;
    }
    enter(result.session);
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await confirmEmailCode(code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if ("resetReady" in result) {
      setPassword("");
      setConfirm("");
      setStep("reset");
      return;
    }
    enter(result.session);
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const result = completePasswordReset(password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    enter(result.session);
  }

  async function forgot() {
    setError("");
    setBusy(true);
    const result = await startPasswordReset(username, remember);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if ("needsCode" in result) {
      setSentTo(result.username);
      setLocalCode(result.localCode ?? "000000");
      setCode("000000");
      setCodePurpose("reset");
      setStep("code");
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    const result = await resendEmailCode();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSentTo(result.username);
    setLocalCode(result.localCode ?? "000000");
    setCode("000000");
  }

  return (
    <div className="desk-glow relative min-h-screen">
      <div className="desk-grid pointer-events-none absolute inset-0 opacity-50" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <img
          src="/logo.webp"
          alt="DeskStriker"
          width={1863}
          height={256}
          className="mx-auto mb-8 block h-auto w-full max-w-sm"
        />
        <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-b from-white/[0.07] via-black/55 to-black/70 p-6 shadow-[0_28px_80px_rgb(0_0_0/0.55)]">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="pointer-events-none absolute -top-24 left-1/2 size-48 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

          {step === "code" ? (
            <CodeStep
              username={sentTo}
              localCode={localCode}
              code={code}
              error={error}
              busy={busy}
              reset={codePurpose === "reset"}
              onCode={setCode}
              onSubmit={submitCode}
              onResend={resend}
              onBack={() => {
                setStep("form");
                setError("");
                setCode("");
                setLocalCode("");
              }}
            />
          ) : step === "reset" ? (
            <ResetStep
              username={sentTo}
              password={password}
              confirm={confirm}
              error={error}
              busy={busy}
              onPassword={setPassword}
              onConfirm={setConfirm}
              onSubmit={submitReset}
              onBack={() => {
                setStep("form");
                setError("");
                setPassword("");
                setConfirm("");
              }}
            />
          ) : (
            <>
              <div className="relative">
                <p className="font-mono text-[10px] tracking-[0.42em] text-gold">
                  ENTER DESK
                </p>
                <h1 className="mt-2 text-[1.65rem] font-semibold tracking-tight">
                  {mode === "login" ? "Open your book" : "Create a desk"}
                </h1>
              </div>

              <div
                role="tablist"
                aria-label="Auth mode"
                className="relative mt-5 grid grid-cols-2 rounded-full border border-white/10 bg-black/60 p-1"
              >
                {(
                  [
                    { id: "login", label: "LOGIN" },
                    { id: "setup", label: "SET UP" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === item.id}
                    onClick={() => {
                      setMode(item.id);
                      setError("");
                      setConfirm("");
                    }}
                    className={cn(
                      "rounded-full px-3 py-2 font-mono text-[10px] tracking-widest transition",
                      mode === item.id
                        ? "bg-gold text-primary-foreground shadow-[0_0_20px_rgb(244_196_48/0.25)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="relative mt-5 space-y-3.5">
                {mode === "setup" ? (
                  <Field label="NAME">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Desk name"
                      autoComplete="name"
                      className="h-11 border-white/10 bg-black/50 px-3"
                    />
                  </Field>
                ) : null}
                <Field label="USER">
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="desk"
                    autoComplete="username"
                    className="h-11 border-white/10 bg-black/50 px-3 font-mono"
                  />
                </Field>
                <Field label="PASSWORD">
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete={
                      mode === "setup" ? "new-password" : "current-password"
                    }
                    className="h-11 border-white/10 bg-black/50 px-3 font-mono"
                  />
                </Field>
                {mode === "login" ? (
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                        className="size-3.5 accent-[var(--gold)]"
                      />
                      <span className="font-mono text-[10px] tracking-widest">
                        REMEMBER ME
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={forgot}
                      disabled={busy}
                      className="font-mono text-[10px] tracking-widest text-gold transition hover:text-foreground disabled:opacity-50"
                    >
                      FORGOT PASSWORD
                    </button>
                  </div>
                ) : null}
                {mode === "setup" ? (
                  <Field label="CONFIRM">
                    <div className="relative">
                      <Input
                        type="password"
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={
                          confirm.length > 0 && !passwordsMatch
                            ? true
                            : undefined
                        }
                        className={cn(
                          "h-11 border-white/10 bg-black/50 px-3 pr-11 font-mono",
                          passwordsMatch &&
                            "border-[#b6ff3b]/50 focus-visible:border-[#b6ff3b]",
                        )}
                      />
                      {passwordsMatch ? (
                        <span
                          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#b6ff3b]"
                          aria-label="Passwords match"
                        >
                          <CheckMark />
                        </span>
                      ) : null}
                    </div>
                  </Field>
                ) : null}
                {error ? (
                  <p className="font-mono text-[10px] tracking-widest text-[#ff3b5c]">
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={busy || (mode === "setup" && !passwordsMatch)}
                  className="h-11 w-full bg-gold font-mono text-[11px] tracking-[0.28em] text-primary-foreground hover:bg-gold/90"
                >
                  {mode === "login" ? "CONTINUE" : "SEND CODE"}
                </Button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function CodeStep({
  username,
  localCode,
  code,
  error,
  busy,
  reset,
  onCode,
  onSubmit,
  onResend,
  onBack,
}: {
  username: string;
  localCode: string;
  code: string;
  error: string;
  busy: boolean;
  reset?: boolean;
  onCode: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <div className="relative">
      <p className="font-mono text-[10px] tracking-[0.42em] text-gold">
        {reset ? "RESET PASSWORD" : "FIRST LOGIN"}
      </p>
      <h1 className="mt-2 text-[1.65rem] font-semibold tracking-tight">
        Enter your code
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Demo mode — use code 000000 for{" "}
        <span className="text-foreground">{username}</span>.
      </p>

      {localCode ? (
        <p className="mt-3 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 font-mono text-[11px] tracking-[0.28em] text-gold">
          DESK CODE {localCode}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
        <Field label="CODE">
          <Input
            value={code}
            onChange={(event) =>
              onCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-12 border-white/10 bg-black/50 px-3 text-center font-mono text-xl tracking-[0.4em]"
          />
        </Field>
        {error ? (
          <p className="font-mono text-[10px] tracking-widest text-[#ff3b5c]">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={busy || code.length !== 6}
          className="h-11 w-full bg-gold font-mono text-[11px] tracking-[0.28em] text-primary-foreground hover:bg-gold/90"
        >
          VERIFY
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-[10px] tracking-widest text-muted-foreground transition hover:text-foreground"
        >
          BACK
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onResend}
          className="font-mono text-[10px] tracking-widest text-gold transition hover:text-foreground disabled:opacity-50"
        >
          RESEND CODE
        </button>
      </div>
    </div>
  );
}

function ResetStep({
  username,
  password,
  confirm,
  error,
  busy,
  onPassword,
  onConfirm,
  onSubmit,
  onBack,
}: {
  username: string;
  password: string;
  confirm: string;
  error: string;
  busy: boolean;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
}) {
  const match = password.length > 0 && password === confirm;
  return (
    <div className="relative">
      <p className="font-mono text-[10px] tracking-[0.42em] text-gold">
        RESET PASSWORD
      </p>
      <h1 className="mt-2 text-[1.65rem] font-semibold tracking-tight">
        New password
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Set a new password for{" "}
        <span className="text-foreground">{username}</span>.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
        <Field label="PASSWORD">
          <Input
            type="password"
            value={password}
            onChange={(event) => onPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="h-11 border-white/10 bg-black/50 px-3 font-mono"
          />
        </Field>
        <Field label="CONFIRM">
          <div className="relative">
            <Input
              type="password"
              value={confirm}
              onChange={(event) => onConfirm(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={cn(
                "h-11 border-white/10 bg-black/50 px-3 pr-11 font-mono",
                match && "border-[#b6ff3b]/50 focus-visible:border-[#b6ff3b]",
              )}
            />
            {match ? (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#b6ff3b]">
                <CheckMark />
              </span>
            ) : null}
          </div>
        </Field>
        {error ? (
          <p className="font-mono text-[10px] tracking-widest text-[#ff3b5c]">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={busy || !match}
          className="h-11 w-full bg-gold font-mono text-[11px] tracking-[0.28em] text-primary-foreground hover:bg-gold/90"
        >
          SAVE PASSWORD
        </Button>
      </form>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground transition hover:text-foreground"
      >
        BACK
      </button>
    </div>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.6 8.2 6.8 10.4 11.4 5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
