"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCheckUsername,
  useSetUsername,
  useUploadAvatar,
} from "@/hooks/use-profile";
import { authClient } from "@/lib/auth-client";

type WizardStep = "welcome" | "avatar" | "username" | "complete";

const STEPS: WizardStep[] = ["welcome", "avatar", "username", "complete"];

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

function getDotBackground(isComplete: boolean, isActive: boolean): string {
  if (isComplete) {
    return "oklch(0.72 0.18 175)";
  }
  if (isActive) {
    return "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))";
  }
  return "oklch(0.30 0.04 280)";
}

function getInputBorderColor(
  isError: boolean,
  isAvailable: boolean,
  isValidFormat: boolean
): string {
  if (isError) {
    return "oklch(0.68 0.20 25 / 60%)";
  }
  if (isAvailable && isValidFormat) {
    return "oklch(0.72 0.18 175 / 60%)";
  }
  return "oklch(0.65 0.25 290 / 30%)";
}

function getStatusColor(isError: boolean, isSuccess: boolean): string {
  if (isError) {
    return "oklch(0.68 0.20 25)";
  }
  if (isSuccess) {
    return "oklch(0.72 0.18 175)";
  }
  return "oklch(0.60 0.04 280)";
}

function StatusIcon({
  isFetching,
  isSuccess,
  isError,
}: {
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
}) {
  if (isFetching) {
    return (
      <Loader2
        className="h-4 w-4 animate-spin"
        style={{ color: "oklch(0.65 0.25 290)" }}
      />
    );
  }
  if (isSuccess) {
    return (
      <CheckCircle2
        className="h-4 w-4"
        style={{ color: "oklch(0.72 0.18 175)" }}
      />
    );
  }
  if (isError) {
    return <X className="h-4 w-4" style={{ color: "oklch(0.68 0.20 25)" }} />;
  }
  return null;
}

function AvatarPlaceholder({ isUploading }: { isUploading: boolean }) {
  if (isUploading) {
    return (
      <Loader2
        className="h-10 w-10 animate-spin"
        style={{ color: "oklch(0.65 0.25 290)" }}
      />
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <Upload className="h-8 w-8" style={{ color: "oklch(0.65 0.25 290)" }} />
      <span
        className="font-medium text-xs"
        style={{ color: "oklch(0.60 0.04 280)" }}
      >
        Click to upload
      </span>
    </div>
  );
}

interface WizardData {
  name: string;
  avatarBase64: string | null;
  username: string;
}

function ProgressDots({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-3">
      {STEPS.slice(0, 3).map((step, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;

        return (
          <motion.div
            animate={{
              scale: isActive ? 1.2 : 1,
              opacity: isComplete || isActive ? 1 : 0.4,
            }}
            className="relative"
            key={step}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: getDotBackground(isComplete, isActive),
                boxShadow: isActive
                  ? "0 0 12px oklch(0.72 0.18 175 / 60%)"
                  : "none",
              }}
            />
            {isComplete && (
              <motion.div
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
              >
                <Check
                  className="h-2 w-2"
                  style={{ color: "oklch(0.10 0.03 280)" }}
                />
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function WelcomeStep({
  data,
  onUpdate,
  onNext,
}: {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}) {
  const [localName, setLocalName] = useState(data.name);

  const handleContinue = () => {
    onUpdate({ name: localName.trim() || "Anonymous" });
    onNext();
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
      exit={{ opacity: 0, y: -20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="space-y-3 text-center">
        <motion.div
          animate={{ scale: 1, rotate: 0 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          initial={{ scale: 0.5, rotate: -10 }}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
            boxShadow: "0 0 40px oklch(0.65 0.25 290 / 40%)",
          }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Sparkles className="h-8 w-8 text-white" />
        </motion.div>
        <h2
          className="font-bold font-heading text-3xl tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.95 0.02 280), oklch(0.72 0.18 175))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Welcome, Padawan
        </h2>
        <p className="text-base" style={{ color: "oklch(0.65 0.04 280)" }}>
          Predict the future. Earn rewards. Join the fun.
        </p>
      </div>

      <div className="space-y-3">
        <label
          className="block font-medium text-sm"
          htmlFor="name"
          style={{ color: "oklch(0.80 0.02 280)" }}
        >
          What should we call you?
        </label>
        <Input
          autoFocus
          className="h-12 text-center font-medium text-lg"
          id="name"
          maxLength={50}
          onChange={(e) => setLocalName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          placeholder="Enter your name"
          style={{
            background: "oklch(0.08 0.02 270 / 80%)",
            borderColor: "oklch(0.65 0.25 290 / 30%)",
          }}
          value={localName}
        />
      </div>

      <Button
        className="h-12 w-full font-semibold text-base"
        onClick={handleContinue}
        style={{
          background:
            "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
          boxShadow: "0 4px 20px oklch(0.65 0.25 290 / 30%)",
        }}
      >
        Continue
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </motion.div>
  );
}

function AvatarStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(data.avatarBase64);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1];
        setPreview(result);
        onUpdate({ avatarBase64: base64 });
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setPreview(null);
    onUpdate({ avatarBase64: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
      exit={{ opacity: 0, y: -20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="space-y-3 text-center">
        <h2
          className="font-bold font-heading text-3xl tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.95 0.02 280), oklch(0.72 0.18 175))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Show Your Face
        </h2>
        <p className="text-base" style={{ color: "oklch(0.65 0.04 280)" }}>
          Add a profile picture (optional)
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <input
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          ref={fileInputRef}
          type="file"
        />
        <motion.button
          className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: preview
              ? undefined
              : "linear-gradient(135deg, oklch(0.72 0.18 175 / 20%), oklch(0.65 0.25 290 / 20%))",
            border: "2px dashed oklch(0.65 0.25 290 / 40%)",
            cursor: "pointer",
          }}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {preview ? (
            <Image
              alt="Avatar preview"
              className="h-full w-full object-cover"
              height={128}
              src={preview}
              width={128}
            />
          ) : (
            <AvatarPlaceholder isUploading={isUploading} />
          )}
        </motion.button>

        {preview && (
          <motion.button
            animate={{ opacity: 1 }}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm"
            initial={{ opacity: 0 }}
            onClick={clearAvatar}
            style={{
              background: "oklch(0.68 0.20 25 / 15%)",
              color: "oklch(0.68 0.20 25)",
            }}
            type="button"
          >
            <X className="h-4 w-4" />
            Remove
          </motion.button>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          className="h-12 flex-1"
          onClick={onBack}
          style={{
            background: "oklch(0.20 0.04 280)",
            borderColor: "oklch(0.65 0.25 290 / 30%)",
          }}
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button
          className="h-12 flex-1 font-semibold"
          onClick={onNext}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
            boxShadow: "0 4px 20px oklch(0.65 0.25 290 / 30%)",
          }}
        >
          {preview ? "Continue" : "Skip"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}

function UsernameStep({
  data,
  onUpdate,
  onNext,
  onBack,
  isSaving,
}: {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
}) {
  const [localUsername, setLocalUsername] = useState(data.username);
  const [debouncedUsername, setDebouncedUsername] = useState(data.username);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(localUsername);
    }, 300);
    return () => clearTimeout(timer);
  }, [localUsername]);

  const { data: availabilityData, isFetching } =
    useCheckUsername(debouncedUsername);

  const isValidFormat =
    localUsername.length >= 3 &&
    localUsername.length <= 20 &&
    USERNAME_PATTERN.test(localUsername);

  const isAvailable = availabilityData?.available ?? false;
  const canProceed = isValidFormat && isAvailable && !isFetching;

  const handleUsernameChange = (value: string) => {
    const cleaned = value.startsWith("@") ? value.slice(1) : value;
    setLocalUsername(cleaned);
    onUpdate({ username: cleaned });
  };

  const getStatusMessage = () => {
    if (localUsername.length === 0) {
      return null;
    }
    if (localUsername.length < 3) {
      return "At least 3 characters";
    }
    if (localUsername.length > 20) {
      return "Max 20 characters";
    }
    if (!USERNAME_PATTERN.test(localUsername)) {
      return "Only letters, numbers, underscores";
    }
    if (isFetching) {
      return "Checking...";
    }
    if (!isAvailable) {
      return "Username taken";
    }
    return "Available!";
  };

  const statusMessage = getStatusMessage();
  const isError =
    statusMessage &&
    !["Checking...", "Available!", null].includes(statusMessage);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
      exit={{ opacity: 0, y: -20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="space-y-3 text-center">
        <h2
          className="font-bold font-heading text-3xl tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.95 0.02 280), oklch(0.72 0.18 175))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Claim Your Identity
        </h2>
        <p className="text-base" style={{ color: "oklch(0.65 0.04 280)" }}>
          Choose a unique username
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-semibold text-lg"
            style={{ color: "oklch(0.50 0.04 280)" }}
          >
            @
          </span>
          <Input
            autoFocus
            className="h-12 pl-9 font-medium text-lg"
            maxLength={20}
            onChange={(e) => handleUsernameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canProceed && onNext()}
            placeholder="username"
            style={{
              background: "oklch(0.08 0.02 270 / 80%)",
              borderColor: getInputBorderColor(
                !!isError,
                isAvailable,
                isValidFormat
              ),
            }}
            value={localUsername}
          />
        </div>

        {statusMessage && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm"
            initial={{ opacity: 0, y: -5 }}
          >
            <StatusIcon
              isError={!!isError}
              isFetching={isFetching}
              isSuccess={statusMessage === "Available!"}
            />
            <span
              style={{
                color: getStatusColor(
                  !!isError,
                  statusMessage === "Available!"
                ),
              }}
            >
              {statusMessage}
            </span>
          </motion.div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          className="h-12 flex-1"
          disabled={isSaving}
          onClick={onBack}
          style={{
            background: "oklch(0.20 0.04 280)",
            borderColor: "oklch(0.65 0.25 290 / 30%)",
          }}
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button
          className="h-12 flex-1 font-semibold"
          disabled={!canProceed || isSaving}
          onClick={onNext}
          style={{
            background: canProceed
              ? "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))"
              : "oklch(0.30 0.04 280)",
            boxShadow: canProceed
              ? "0 4px 20px oklch(0.65 0.25 290 / 30%)"
              : "none",
            opacity: canProceed ? 1 : 0.5,
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Finish
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function CompleteStep({ username }: { username: string }) {
  const router = useRouter();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
      exit={{ opacity: 0, y: -20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="space-y-4 text-center">
        <motion.div
          animate={{ scale: 1 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
          initial={{ scale: 0 }}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.80 0.16 90))",
            boxShadow: "0 0 60px oklch(0.72 0.18 175 / 50%)",
          }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        >
          <Check className="h-10 w-10 text-white" />
        </motion.div>

        <motion.h2
          animate={{ opacity: 1, y: 0 }}
          className="font-bold font-heading text-3xl tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.95 0.02 280), oklch(0.80 0.16 90))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          transition={{ delay: 0.2 }}
        >
          You're Ready!
        </motion.h2>

        <motion.p
          animate={{ opacity: 1 }}
          className="text-base"
          initial={{ opacity: 0 }}
          style={{ color: "oklch(0.65 0.04 280)" }}
          transition={{ delay: 0.3 }}
        >
          Welcome to the game, @{username}
        </motion.p>
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 rounded-xl p-4"
        initial={{ opacity: 0, y: 10 }}
        style={{
          background: "oklch(0.08 0.02 270 / 60%)",
          border: "1px solid oklch(0.72 0.18 175 / 20%)",
        }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <span style={{ color: "oklch(0.60 0.04 280)" }}>
            Starting balance
          </span>
          <span
            className="font-bold font-heading text-xl"
            style={{ color: "oklch(0.80 0.16 90)" }}
          >
            1,000 pts
          </span>
        </div>
        <p className="text-sm" style={{ color: "oklch(0.50 0.04 280)" }}>
          Use your points to predict outcomes and climb the leaderboard
        </p>
      </motion.div>

      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          className="h-12 w-full font-semibold text-base"
          onClick={() => router.push("/")}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
            boxShadow: "0 4px 20px oklch(0.65 0.25 290 / 30%)",
          }}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Start Predicting
        </Button>
      </motion.div>
    </motion.div>
  );
}

export function SetupWizard() {
  const { data: session } = authClient.useSession();
  const uploadAvatar = useUploadAvatar();
  const setUsername = useSetUsername();

  const [step, setStep] = useState<WizardStep>("welcome");
  const [data, setData] = useState<WizardData>({
    name: session?.user?.name ?? "",
    avatarBase64: null,
    username: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
    }
  }, [step]);

  const goBack = useCallback(() => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  }, [step]);

  const handleUsernameSubmit = async () => {
    setIsSaving(true);
    try {
      if (data.name && data.name !== session?.user?.name) {
        await authClient.updateUser({ name: data.name });
      }
      if (data.avatarBase64) {
        uploadAvatar.mutate(data.avatarBase64);
      }
      await setUsername.mutateAsync(data.username);
      goNext();
    } catch {
      // Error handled by mutation hooks
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-3xl p-8"
        initial={{ opacity: 0, y: 20 }}
        style={{
          background: "oklch(0.10 0.03 280 / 80%)",
          backdropFilter: "blur(20px)",
          border: "1px solid oklch(0.65 0.25 290 / 25%)",
          boxShadow:
            "0 0 80px oklch(0.65 0.25 290 / 15%), 0 20px 40px oklch(0 0 0 / 30%)",
        }}
        transition={{ duration: 0.5 }}
      >
        {step !== "complete" && (
          <div className="mb-8">
            <ProgressDots currentStep={step} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <WelcomeStep
              data={data}
              key="welcome"
              onNext={goNext}
              onUpdate={updateData}
            />
          )}
          {step === "avatar" && (
            <AvatarStep
              data={data}
              key="avatar"
              onBack={goBack}
              onNext={goNext}
              onUpdate={updateData}
            />
          )}
          {step === "username" && (
            <UsernameStep
              data={data}
              isSaving={isSaving}
              key="username"
              onBack={goBack}
              onNext={handleUsernameSubmit}
              onUpdate={updateData}
            />
          )}
          {step === "complete" && (
            <CompleteStep key="complete" username={data.username} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
