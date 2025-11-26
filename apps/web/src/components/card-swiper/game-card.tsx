import type { MarketId } from "@yoda.fun/shared/typeid";
import Image from "next/image";

export type MarketCard = {
  id: MarketId;
  title: string;
  description: string;
  imageUrl: string | null;
  category: string | null;
  tags: string[] | null;
  betAmount: string;
  totalYesVotes: number;
  totalNoVotes: number;
  votingEndsAt: Date;
};

type GameCardProps = {
  card: MarketCard;
};

function formatTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export function GameCard({ card }: GameCardProps) {
  const totalVotes = card.totalYesVotes + card.totalNoVotes;
  const yesPercent =
    totalVotes > 0 ? Math.round((card.totalYesVotes / totalVotes) * 100) : 50;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
      {/* Card Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <Image
          alt={card.title}
          className="h-full w-full object-cover"
          fill
          src={
            card.imageUrl ||
            `https://picsum.photos/seed/${card.id}/400/600`
          }
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Card Content */}
      <div className="absolute right-0 bottom-0 left-0 p-6 text-white">
        {/* Top badges row */}
        <div className="mb-3 flex items-center justify-between">
          {card.category && (
            <div className="inline-block rounded-full bg-white/20 px-3 py-1 font-medium text-xs backdrop-blur-sm">
              {card.category}
            </div>
          )}
          <div className="rounded-full bg-emerald-500/90 px-3 py-1 font-bold text-xs">
            ${card.betAmount}
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-2 font-bold text-xl leading-tight">{card.title}</h3>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-white/90 leading-relaxed">
          {card.description}
        </p>

        {/* Voting stats */}
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs">
            <span>YES {yesPercent}%</span>
            <span>NO {100 - yesPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
          <div className="mt-1 text-center text-xs text-white/70">
            {totalVotes} votes - {formatTimeRemaining(card.votingEndsAt)}
          </div>
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {card.tags.slice(0, 3).map((tag) => (
              <span
                className="rounded-md bg-white/10 px-2 py-1 text-xs backdrop-blur-sm"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
