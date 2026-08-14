"use client";

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queueCloudHydrate } from "@/lib/supabase/queue";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    queueCloudHydrate();
  }, []);

  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>;
}
