import { MarketId } from "@yoda.fun/shared/typeid";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketDetail } from "./market-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Market | yoda.fun",
    openGraph: {
      images: [`/api/og/market/${id}`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/api/og/market/${id}`],
    },
  };
}

export default async function MarketPage({ params }: Props) {
  const { id } = await params;

  const parsed = MarketId.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 pb-8">
      <MarketDetail marketId={parsed.data} />
    </div>
  );
}
