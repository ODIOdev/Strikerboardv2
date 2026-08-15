"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  getAuthSnapshot,
  getServerAuthSnapshot,
  subscribeAuth,
} from "@/lib/auth";
import { useHydrated } from "@/hooks/use-hydrated";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  const onLogin = pathname === "/login";

  useEffect(() => {
    if (!hydrated) return;
    if (!session && !onLogin) router.replace("/login");
    if (session && onLogin) router.replace("/");
  }, [hydrated, session, onLogin, router]);

  if (!hydrated) {
    return (
      <div className="desk-glow flex min-h-screen items-center justify-center">
        <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
          OPENING DESK
        </p>
      </div>
    );
  }

  if (!session && !onLogin) return null;
  if (session && onLogin) return null;
  return children;
}
