"use client";

import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";

const REFERRAL_CODE_KEY = "referral_code";

function Particle({
  delay,
  x,
  size,
}: {
  delay: number;
  x: number;
  size: number;
}) {
  return (
    <motion.div
      animate={{
        y: ["0vh", "100vh"],
        rotate: [0, 360],
        opacity: [0, 1, 1, 0],
      }}
      className="pointer-events-none absolute"
      initial={{ y: "-10vh", x: `${x}vw`, opacity: 0 }}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg,
          oklch(0.85 0.15 85 / ${0.6 + Math.random() * 0.4}),
          oklch(0.75 0.18 55 / ${0.4 + Math.random() * 0.3})
        )`,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        boxShadow: "0 0 10px oklch(0.85 0.15 85 / 0.5)",
      }}
      transition={{
        duration: 4 + Math.random() * 3,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
    />
  );
}

function FloatingOrb({
  x,
  y,
  size,
  hue,
}: {
  x: string;
  y: string;
  size: number;
  hue: number;
}) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      className="pointer-events-none absolute rounded-full blur-3xl"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: `oklch(0.55 0.15 ${hue} / 0.4)`,
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    />
  );
}

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code?.toUpperCase();

  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: Math.random() * 5,
        x: Math.random() * 100,
        size: 4 + Math.random() * 8,
      })),
    []
  );

  useEffect(() => {
    if (code) {
      localStorage.setItem(REFERRAL_CODE_KEY, code);
    }
  }, [code]);

  const handleContinue = () => {
    router.push("/dashboard");
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.20 0.08 280 / 0.5), transparent),
          radial-gradient(ellipse 60% 40% at 80% 80%, oklch(0.25 0.10 55 / 0.3), transparent),
          oklch(0.06 0.02 270)
        `,
      }}
    >
      <FloatingOrb hue={85} size={400} x="10%" y="20%" />
      <FloatingOrb hue={55} size={300} x="70%" y="60%" />
      <FloatingOrb hue={280} size={250} x="80%" y="10%" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <Particle delay={p.delay} key={p.id} size={p.size} x={p.x} />
        ))}
      </div>

      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 mx-4 max-w-md text-center"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.6, type: "spring", damping: 20 }}
      >
        <div
          className="relative overflow-hidden rounded-3xl p-8 md:p-10"
          style={{
            background: "oklch(0.12 0.03 280 / 0.6)",
            backdropFilter: "blur(40px)",
            border: "1px solid oklch(0.85 0.15 85 / 0.2)",
            boxShadow: `
              0 0 80px oklch(0.85 0.15 85 / 0.15),
              0 25px 50px oklch(0 0 0 / 0.4),
              inset 0 1px 0 oklch(1 0 0 / 0.1)
            `,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, oklch(0.85 0.15 85 / 0.1), transparent 50%)",
            }}
          />

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center"
            initial={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.85 0.15 85), oklch(0.70 0.18 55))",
                boxShadow: `
                  0 0 40px oklch(0.85 0.15 85 / 0.5),
                  0 0 80px oklch(0.85 0.15 85 / 0.3)
                `,
              }}
            />
            <Sparkles
              className="relative h-10 w-10 text-black"
              strokeWidth={1.5}
            />
          </motion.div>

          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-3 font-bold font-heading text-4xl tracking-tight md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.95 0.02 85), oklch(0.85 0.15 55))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 40px oklch(0.85 0.15 85 / 0.3)",
            }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            You&apos;re Invited
          </motion.h1>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-6 text-lg"
            initial={{ opacity: 0, y: 20 }}
            style={{ color: "oklch(0.75 0.03 280)" }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Join the future of prediction markets
          </motion.p>

          {code && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="relative mb-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5"
              initial={{ opacity: 0, y: 20 }}
              style={{
                background: "oklch(0.15 0.05 85 / 0.5)",
                border: "1px solid oklch(0.85 0.15 85 / 0.3)",
                boxShadow: "0 0 20px oklch(0.85 0.15 85 / 0.1)",
              }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <span
                className="font-medium text-sm uppercase tracking-wider"
                style={{ color: "oklch(0.70 0.08 85)" }}
              >
                Invite Code
              </span>
              <span
                className="font-bold font-mono tracking-widest"
                style={{ color: "oklch(0.90 0.12 85)" }}
              >
                {code}
              </span>
            </motion.div>
          )}

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button
              className="relative h-12 px-8 font-semibold text-base"
              onClick={handleContinue}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.85 0.15 85), oklch(0.70 0.18 55))",
                color: "oklch(0.10 0.02 85)",
                boxShadow: `
                  0 0 30px oklch(0.85 0.15 85 / 0.4),
                  0 4px 15px oklch(0 0 0 / 0.3)
                `,
              }}
            >
              Enter yoda.fun
            </Button>
          </motion.div>
        </div>

        <motion.div
          animate={{ scaleX: 1, opacity: 1 }}
          className="mx-auto mt-8 h-px w-32"
          initial={{ scaleX: 0, opacity: 0 }}
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.85 0.15 85 / 0.5), transparent)",
          }}
          transition={{ delay: 0.7, duration: 0.6 }}
        />
      </motion.div>
    </div>
  );
}
