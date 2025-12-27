import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { serverAuthClient } from "@/lib/auth-client.server";
import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const session = await serverAuthClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div>
      <Dashboard />
    </div>
  );
}
