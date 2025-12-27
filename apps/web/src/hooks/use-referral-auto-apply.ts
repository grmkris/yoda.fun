"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/session-provider";
import { useApplyReferralCode } from "./use-rewards";

const REFERRAL_CODE_KEY = "referral_code";

export function useReferralAutoApply() {
  const { data: session } = useSession();
  const applyMutation = useApplyReferralCode();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) {
      return;
    }
    if (!session?.user) {
      return;
    }
    if (applyMutation.isPending) {
      return;
    }

    const storedCode = localStorage.getItem(REFERRAL_CODE_KEY);
    if (!storedCode) {
      return;
    }

    hasAttempted.current = true;
    localStorage.removeItem(REFERRAL_CODE_KEY);

    applyMutation.mutate(storedCode);
  }, [session, applyMutation.isPending]);
}
