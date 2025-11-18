import Image from "next/image";
import type { GameCard as GameCardType } from "@/data/mock-cards";

type GameCardProps = {
  card: GameCardType;
};

export function GameCard({ card }: GameCardProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-xl">
      {/* Card Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <Image
          alt={card.title}
          className="h-full w-full object-cover"
          fill
          src={card.image}
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Card Content */}
      <div className="absolute right-0 bottom-0 left-0 p-6 text-white">
        {/* Category Badge */}
        <div className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 font-medium text-xs backdrop-blur-sm">
          {card.category}
        </div>

        {/* Title */}
        <h3 className="mb-2 font-bold text-2xl leading-tight">{card.title}</h3>

        {/* Description */}
        <p className="mb-4 text-sm text-white/90 leading-relaxed">
          {card.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <span
              className="rounded-md bg-white/10 px-2 py-1 text-xs backdrop-blur-sm"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
