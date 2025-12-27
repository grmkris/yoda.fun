import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { serverAuthClient } from "@/lib/auth-client.server";
import { RewardsPage } from "./rewards-page";

export default async function RewardsRoute() {
  const session = await serverAuthClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <RewardsPage />;
}
