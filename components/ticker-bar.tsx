"use client";

import { MobileNav } from "@/components/side-nav";

export function TickerBar() {
  return (
    <header className="flex items-center gap-3 border-b border-white/8 bg-black/30 px-4 py-3 backdrop-blur-md lg:hidden">
      <MobileNav />
    </header>
  );
}
