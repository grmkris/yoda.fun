import type { Metadata } from "next";
import { InvitePage } from "./invite-page";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  return {
    title: "You're Invited | yoda.fun",
    description: "Bet on real-world outcomes with AI-generated markets.",
    openGraph: {
      title: "You're Invited to yoda.fun",
      description: "Bet on real-world outcomes with AI-generated markets.",
      images: [`/api/og/invite/${upperCode}`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "You're Invited to yoda.fun",
      description: "Bet on real-world outcomes with AI-generated markets.",
      images: [`/api/og/invite/${upperCode}`],
    },
  };
}

export default async function InviteRoute({ params }: Props) {
  const { code } = await params;
  return <InvitePage code={code} />;
}
