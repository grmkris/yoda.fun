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
    <div className="container mx-auto p-4 pb-8">
      <BetsHistory />
    </div>
  );
}
