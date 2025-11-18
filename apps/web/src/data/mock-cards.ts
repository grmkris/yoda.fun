export type GameCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  tags: string[];
};

export const mockGameCards: GameCard[] = [
  {
    id: "1",
    title: "Cosmic Raiders",
    description:
      "Epic space battle game with NFT rewards. Compete with players worldwide and earn unique collectibles.",
    image: "https://picsum.photos/seed/game1/400/600",
    category: "Action",
    tags: ["PvP", "NFT", "Free-to-Play"],
  },
  {
    id: "2",
    title: "DeFi Legends",
    description:
      "Strategic card game where you build your deck and compete for crypto prizes in tournaments.",
    image: "https://picsum.photos/seed/game2/400/600",
    category: "Strategy",
    tags: ["Card Game", "DeFi", "Tournaments"],
  },
  {
    id: "3",
    title: "Blockchain Racers",
    description:
      "Fast-paced racing game with customizable NFT vehicles. Race, upgrade, and dominate the tracks.",
    image: "https://picsum.photos/seed/game3/400/600",
    category: "Racing",
    tags: ["Racing", "NFT", "Multiplayer"],
  },
  {
    id: "4",
    title: "Metaverse Kingdom",
    description:
      "Build your empire in the metaverse. Trade resources, form alliances, and conquer territories.",
    image: "https://picsum.photos/seed/game4/400/600",
    category: "MMORPG",
    tags: ["MMO", "Strategy", "Social"],
  },
  {
    id: "5",
    title: "Crypto Fighters",
    description:
      "Train your fighters, unlock special moves, and compete in the ultimate Web3 fighting championship.",
    image: "https://picsum.photos/seed/game5/400/600",
    category: "Fighting",
    tags: ["PvP", "NFT", "Esports"],
  },
  {
    id: "6",
    title: "Galaxy Miners",
    description:
      "Explore distant planets, mine resources, and trade with other players in this space adventure.",
    image: "https://picsum.photos/seed/game6/400/600",
    category: "Adventure",
    tags: ["Mining", "Trading", "Exploration"],
  },
];
