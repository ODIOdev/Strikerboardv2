import type { Metadata } from "next";
import { StrikerDesk } from "@/components/striker-desk";

export const metadata: Metadata = {
  title: "Trade · Striker-Board",
};

export default async function TradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StrikerDesk tradeId={id} />;
}
