"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PortoConnectButton } from "@/components/porto-connect-button";
import { UsernameNudgeModal } from "@/components/username-nudge-modal";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // Handle post-authentication flow
  useEffect(() => {
    if (session?.user && !session.user.isAnonymous) {
      // User is authenticated with wallet - check if they need to set username
      if (!session.user.username) {
        setShowUsernameModal(true);
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, router]);

  const handleUsernameComplete = () => {
    setShowUsernameModal(false);
    router.push("/dashboard");
  };

  return (
    <div className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <div className="w-full space-y-6 rounded-lg border p-8">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in with your Ethereum wallet to continue
          </p>
        </div>

        <div className="flex justify-center">
          <PortoConnectButton />
        </div>
      </div>

      <UsernameNudgeModal
        onComplete={handleUsernameComplete}
        open={showUsernameModal}
      />
    </div>
  );
}
