import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client.server";
import { ProfilePage } from "./profile-page";

export default async function Page() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <ProfilePage />;
}
