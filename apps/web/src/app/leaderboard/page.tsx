import Leaderboard from "./leaderboard";

export const metadata = {
  title: "Leaderboard | Yoda.fun",
  description: "See the top predictors on Yoda.fun",
};

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-4">
      <Leaderboard />
    </div>
  );
}
