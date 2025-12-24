import { notFound } from "next/navigation";
import UserProfile from "./user-profile";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return {
    title: `@${username} | Yoda.fun`,
    description: `View ${username}'s predictions and stats on Yoda.fun`,
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;

  if (!username) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserProfile username={username} />
    </div>
  );
}
