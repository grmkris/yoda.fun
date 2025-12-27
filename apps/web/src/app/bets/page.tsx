import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { betHistoryQueryKey } from "@/hooks/bet-history-query-key";
import { serverAuthClient } from "@/lib/auth-client.server";
import { client } from "@/utils/orpc";
import { BetsHistory } from "./bets-history";

export default async function BetsPage() {
  const session = await serverAuthClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  const queryClient = new QueryClient();
  const defaultInput = { status: undefined, limit: 20, offset: 0 };

  await queryClient.prefetchQuery({
    queryKey: betHistoryQueryKey(defaultInput),
    queryFn: () => client.bet.history(defaultInput),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto p-4 pb-8">
        <BetsHistory />
      </div>
    </HydrationBoundary>
  );
}
