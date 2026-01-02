import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { MarketId } from "@yoda.fun/shared/typeid";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marketQueryKey } from "@/hooks/market-query-key";
import { serverClient } from "@/utils/orpc.server";
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

  const marketId = parsed.data;
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: marketQueryKey(marketId),
    queryFn: () => serverClient.market.get({ marketId }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto p-4 pb-8">
        <MarketDetail marketId={marketId} />
      </div>
    </HydrationBoundary>
  );
}
