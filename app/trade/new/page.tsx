"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createTrade } from "@/lib/desk-store";
import { useHydrated } from "@/hooks/use-hydrated";

function OpeningTrade() {
  return (
    <div className="desk-glow relative min-h-screen">
      <div className="desk-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative flex min-h-screen items-center justify-center">
        <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
          OPENING NEW TRADE
        </p>
      </div>
    </div>
  );
}

function NewTradeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    const ticker = searchParams.get("ticker") ?? undefined;
    const trade = createTrade(ticker);
    router.replace(`/trade/${trade.id}`);
  }, [hydrated, router, searchParams]);

  return <OpeningTrade />;
}

export default function NewTradePage() {
  return (
    <Suspense fallback={<OpeningTrade />}>
      <NewTradeRedirect />
    </Suspense>
  );
}
