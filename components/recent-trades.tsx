"use client";

import { ClosedBookSection } from "@/components/closed-book";
import { MobileNav } from "@/components/side-nav";

export function RecentTradesPage() {
  return (
    <div className="desk-glow relative min-h-screen">
      <div className="desk-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-white/8 bg-black/30 px-4 py-3 backdrop-blur-md lg:hidden">
          <MobileNav />
        </header>

        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 p-4 pb-10">
          <div>
            <h2 className="text-5xl font-black tracking-tight sm:text-6xl">
              Recent Trades
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Closed tickets from the desk — side, band, score, and R:R after
              you close them out.
            </p>
          </div>
          <ClosedBookSection />
        </main>
      </div>
    </div>
  );
}
