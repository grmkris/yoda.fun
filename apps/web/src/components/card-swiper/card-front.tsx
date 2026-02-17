"use client";

import { Calendar, Clock } from "lucide-react";
import Image from "next/image";
import { Countdown } from "@/components/countdown";
import type { StackMarket } from "@/lib/orpc-types";

export type MarketCard = StackMarket;

interface CardFrontProps {
  card: MarketCard;
}

export function CardFront({ card }: CardFrontProps) {
  return (
    <div className="relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-3xl">
      {/* Ethereal border glow */}
      <div
        className="absolute -inset-[1px] rounded-3xl opacity-60"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.65 0.25 290 / 50%), oklch(0.70 0.15 200 / 30%), oklch(0.65 0.25 290 / 50%))",
        }}
      />

      {/* Main card container with glassmorphism */}
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-card/95 shadow-2xl backdrop-blur-sm">
        {/* Card Image */}
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <Image
            alt={card.title}
            className="h-full w-full object-cover"
            fill
            loading="eager"
            src={
              card.imageUrl || `https://picsum.photos/seed/${card.id}/400/600`
            }
          />
          {/* Cosmic gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, oklch(0.08 0.02 270 / 95%) 0%, oklch(0.08 0.02 270 / 60%) 30%, oklch(0.12 0.03 290 / 20%) 60%, transparent 100%)",
            }}
          />
          {/* Subtle nebula overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse at 30% 70%, oklch(0.65 0.25 290 / 20%) 0%, transparent 50%)",
            }}
          />
        </div>

        {/* Card Content */}
        <div className="absolute right-0 bottom-0 left-0 p-6">
          {/* Top badges row */}
          {card.category ? (
            <div className="mb-4">
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-heading font-medium text-xs backdrop-blur-md"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.25 290 / 25%), oklch(0.70 0.15 200 / 15%))",
                  border: "1px solid oklch(1 0 0 / 15%)",
                  color: "oklch(0.92 0.02 280)",
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: "oklch(0.70 0.15 200)" }}
                />
                {card.category}
              </div>
            </div>
          ) : null}

          {/* Title */}
          <h3
            className="mb-2 font-bold font-heading text-2xl leading-tight"
            style={{ color: "oklch(0.98 0.01 280)" }}
          >
            {card.title}
          </h3>

          {/* Description */}
          <p
            className="mb-3 line-clamp-2 text-sm leading-relaxed"
            style={{ color: "oklch(0.85 0.02 280)" }}
          >
            {card.description}
          </p>

          {/* Countdown Pills */}
          <div className="mb-3 flex items-center gap-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-md"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.25 290 / 20%), oklch(0.70 0.15 200 / 12%))",
                border: "1px solid oklch(1 0 0 / 12%)",
              }}
            >
              <Clock
                className="h-3 w-3"
                style={{ color: "oklch(0.75 0.12 200)" }}
              />
              <Countdown targetDate={card.votingEndsAt} variant="compact" />
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-md"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.25 290 / 20%), oklch(0.70 0.15 200 / 12%))",
                border: "1px solid oklch(1 0 0 / 12%)",
              }}
            >
              <Calendar
                className="h-3 w-3"
                style={{ color: "oklch(0.75 0.12 290)" }}
              />
              <Countdown
                targetDate={card.resolutionDeadline}
                variant="compact"
              />
            </div>
          </div>

          {/* Tags */}
          {(card.tags?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              {card.tags?.slice(0, 3).map((tag) => (
                <span
                  className="rounded-full px-3 py-1 text-xs backdrop-blur-sm"
                  key={tag}
                  style={{
                    background: "oklch(1 0 0 / 8%)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    color: "oklch(0.80 0.03 280)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
