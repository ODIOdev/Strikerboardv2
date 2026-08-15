"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CircleUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getProfileSnapshot,
  getServerProfileSnapshot,
  saveProfile,
  subscribeProfile,
} from "@/lib/profile";
import {
  getAuthSnapshot,
  getServerAuthSnapshot,
  logout,
  subscribeAuth,
} from "@/lib/auth";
import {
  createUser,
  getServerUsersSnapshot,
  getUsersSnapshot,
  loadUser,
  persistCurrentUser,
  subscribeUsers,
  userLabel,
} from "@/lib/users";

type ProfileSheetProps = {
  utility?: boolean;
};

export function ProfileSheet({ utility = false }: ProfileSheetProps) {
  const profile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getServerProfileSnapshot,
  );
  const users = useSyncExternalStore(
    subscribeUsers,
    getUsersSnapshot,
    getServerUsersSnapshot,
  );
  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [saved, setSaved] = useState(false);
  const [showLoad, setShowLoad] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(profile.name);
    setHandle(profile.handle);
  }, [open, profile.name, profile.handle]);

  function submit(event: FormEvent) {
    event.preventDefault();
    saveProfile({ name, handle });
    persistCurrentUser();
    setSaved(true);
  }

  const label = profile.name || "Profile";
  const rawHandle = profile.handle.replace(/^@+/, "").split("@")[0] ?? "";
  const tag = rawHandle
    ? session?.role === "admin" || rawHandle === "admin"
      ? rawHandle
      : `@${rawHandle}`
    : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSaved(false);
          setShowLoad(false);
        }
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          className={
            utility
              ? "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
              : "flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-white/25 hover:text-foreground"
          }
        >
          <CircleUser className="size-3.5 shrink-0 opacity-80" />
          <span className="min-w-0 truncate">
            {label}
            {tag ? (
              <>
                <span className="text-white/25"> · </span>
                <span className="font-mono text-sm tracking-wide text-gold">
                  {tag}
                </span>
              </>
            ) : null}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="border-white/8 bg-[#0c0e14] sm:max-w-md"
      >
        <SheetHeader className="border-b border-white/8">
          <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
            DESK
          </p>
          <SheetTitle className="text-lg">Profile</SheetTitle>
          <SheetDescription>
            Local desk identity. Stays in this browser.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex flex-col gap-4 px-4">
          <label className="space-y-1.5">
            <span className="font-mono text-[10px] tracking-[0.28em] text-gold">
              NAME
            </span>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              placeholder="Desk name"
              autoComplete="name"
              className="border-gold/40 bg-gold/10 caret-gold selection:bg-gold/30 selection:text-foreground focus-visible:border-gold focus-visible:ring-gold/40"
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-mono text-[10px] tracking-[0.28em] text-gold">
              HANDLE
            </span>
            <Input
              value={handle}
              onChange={(event) => {
                setHandle(event.target.value);
                setSaved(false);
              }}
              placeholder="trader"
              autoComplete="username"
              className="border-gold/40 bg-gold/10 font-mono caret-gold selection:bg-gold/30 selection:text-foreground focus-visible:border-gold focus-visible:ring-gold/40"
            />
          </label>
          <Button type="submit" className="font-mono tracking-widest">
            {saved ? "SAVED" : "SAVE"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/10 font-mono text-[10px] tracking-widest"
              onClick={() => {
                createUser();
                setName("");
                setHandle("");
                setSaved(false);
                setShowLoad(false);
              }}
            >
              New user
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 font-mono text-[10px] tracking-widest"
              onClick={() => setShowLoad((prev) => !prev)}
            >
              Load user
            </Button>
          </div>
          {showLoad ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/8 bg-black/30 p-1">
              {users.users.length === 0 ? (
                <li className="px-2 py-2 font-mono text-[10px] tracking-widest text-muted-foreground">
                  NO SAVED DESKS
                </li>
              ) : (
                users.users.map((user) => {
                  const current = user.id === users.currentId;
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        disabled={current}
                        onClick={() => {
                          loadUser(user.id);
                          setSaved(false);
                          setShowLoad(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                          current
                            ? "bg-gold/15 text-gold"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate">{userLabel(user)}</span>
                        {current ? (
                          <span className="shrink-0 font-mono text-[9px] tracking-widest">
                            LIVE
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="border-white/10 font-mono text-[10px] tracking-widest"
            onClick={() => {
              logout();
              setOpen(false);
              router.replace("/login");
            }}
          >
            SIGN OUT
          </Button>
          {session?.role === "admin" ? (
            <p className="font-mono text-[10px] tracking-widest text-gold">
              MASTER ADMIN
            </p>
          ) : null}
        </form>
      </SheetContent>
    </Sheet>
  );
}
