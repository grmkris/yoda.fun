import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { serverAuthClient } from "@/lib/auth-client.server";
import ProfileSettings from "./profile-settings";

export const metadata = {
  title: "Profile Settings | Yoda.fun",
  description: "Edit your profile settings",
};

export default async function ProfileSettingsPage() {
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
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 font-bold text-3xl">Profile Settings</h1>
      <ProfileSettings />
    </div>
  );
}
