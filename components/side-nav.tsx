"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { ChevronRight, LayoutGrid, Menu, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ClosedBookPreview } from "@/components/closed-book";
import { useDesk } from "@/hooks/use-desk";
import { HomeSettings } from "@/components/home-settings";
import { ProfileSheet } from "@/components/profile-sheet";
import { cn } from "@/lib/utils";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function RecentIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function RecentTradesButton({
  closeOnNavigate = false,
}: {
  closeOnNavigate?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelHide() {
    if (!hideTimer.current) return;
    clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }

  function showPreview() {
    cancelHide();
    setOpen(true);
  }

  function hidePreview() {
    cancelHide();
    hideTimer.current = setTimeout(() => setOpen(false), 140);
  }

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const link = (
    <NavLink
      href="/recent"
      active={pathname === "/recent"}
      closeOnNavigate={closeOnNavigate}
      onMouseEnter={showPreview}
      onMouseLeave={hidePreview}
      onClick={() => setOpen(false)}
    >
      <RecentIcon className="size-3.5" />
      Recent Trades
    </NavLink>
  );

  if (closeOnNavigate) return link;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>{link}</PopoverAnchor>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        onMouseEnter={showPreview}
        onMouseLeave={hidePreview}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-80 max-h-[28rem] gap-1 overflow-y-auto border-white/10 bg-[#0c0e14] p-2 shadow-xl"
      >
        <ClosedBookPreview />
      </PopoverContent>
    </Popover>
  );
}

function NavLink({
  href,
  active,
  closeOnNavigate,
  className,
  children,
  ...props
}: {
  href: string;
  active?: boolean;
  closeOnNavigate?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  const link = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
        active
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );

  if (!closeOnNavigate) return link;
  return <SheetClose asChild>{link}</SheetClose>;
}

function NavPanel({ closeOnNavigate = false }: { closeOnNavigate?: boolean }) {
  const pathname = usePathname();
  const { hydrated, trades } = useDesk();
  const [bookOpen, setBookOpen] = useState(true);

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-6 p-4">
      <div>
        <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground">
          STRIKER
        </p>
        <p className="mt-1 text-lg font-semibold tracking-tight">Desk</p>
      </div>

      <NavLink
        href="/trade/new"
        closeOnNavigate={closeOnNavigate}
        className="border-transparent bg-gold font-medium text-primary-foreground hover:border-transparent hover:bg-white hover:text-[#16120a]"
      >
        <Plus className="size-3.5" />
        New Trade
      </NavLink>

      <section className="space-y-1.5">
        <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
          NAV
        </p>
        <NavLink href="/" active={pathname === "/"} closeOnNavigate={closeOnNavigate}>
          <LayoutGrid className="size-3.5" />
          Home
        </NavLink>
        <NavLink
          href="/ideas"
          active={pathname === "/ideas"}
          closeOnNavigate={closeOnNavigate}
        >
          <CalendarIcon className="size-3.5" />
          Calendar
        </NavLink>
        <RecentTradesButton closeOnNavigate={closeOnNavigate} />
      </section>

      <section className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        <button
          type="button"
          onClick={() => setBookOpen((prev) => !prev)}
          aria-expanded={bookOpen}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
            ACTIVE TRADES
          </p>
          <ChevronRight
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
              bookOpen ? "rotate-90" : ""
            }`}
          />
        </button>
        {bookOpen ? (
          !hydrated ? (
            <p className="px-1 font-mono text-[10px] tracking-widest text-muted-foreground">
              LOADING
            </p>
          ) : trades.length === 0 ? (
            <p className="px-1 font-mono text-[10px] tracking-widest text-muted-foreground">
              NO TRADES
            </p>
          ) : (
            <ul className="space-y-1">
              {trades.map((trade) => {
                const href = `/trade/${trade.id}`;
                return (
                  <li key={trade.id}>
                    <NavLink
                      href={href}
                      active={pathname === href}
                      closeOnNavigate={closeOnNavigate}
                      className="font-mono tracking-widest"
                    >
                      <Zap className="size-3 shrink-0 fill-current" />
                      <span className="truncate">{trade.ticker || "UNTITLED"}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <p className="px-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            {hydrated ? `${trades.length} OPEN` : "…"}
          </p>
        )}
      </section>

      <section className="shrink-0 space-y-1.5 border-t border-white/8 pt-4">
        <p className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
          ACCOUNT
        </p>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <ProfileSheet utility />
          <div className="h-px bg-white/8" />
          <HomeSettings utility />
        </div>
      </section>
    </nav>
  );
}

export function SideNav() {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/8 bg-black/50 backdrop-blur-md lg:flex">
      <NavPanel />
    </aside>
  );
}

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Open menu"
          className="border-white/10 bg-black/40 lg:hidden"
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="border-white/8 bg-[#0c0e14] p-0 sm:max-w-sm"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <NavPanel closeOnNavigate />
      </SheetContent>
    </Sheet>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
