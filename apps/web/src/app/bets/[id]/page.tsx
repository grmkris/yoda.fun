import type { BetId } from "@yoda.fun/shared/typeid";
import { notFound } from "next/navigation";
import { BetDetail } from "./bet-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `Bet ${id.slice(0, 8)}... | Yoda.fun`,
    description: "View your bet details on Yoda.fun",
  };
}

export default async function BetDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id?.startsWith("bet_")) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 pb-8">
      <BetDetail betId={id as BetId} />
    </div>
  );
}
