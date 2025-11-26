import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { BetsHistory } from "./bets-history";

export default async function BetsPage() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl">My Bets</h1>
        <p className="text-muted-foreground">Track your predictions and winnings</p>
      </div>
      <BetsHistory />
    </div>
  );
}
