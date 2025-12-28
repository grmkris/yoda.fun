import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { serverAuthClient } from "@/lib/auth-client.server";
import { ProfilePage } from "./profile-page";

export default async function Page() {
  const session = await serverAuthClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <ProfilePage />;
}
