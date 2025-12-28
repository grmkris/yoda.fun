import Leaderboard from "./leaderboard";

export const metadata = {
  title: "Leaderboard | yoda.fun",
  description:
    "See the top predictors on yoda.fun — who's calling the future right?",
};

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-4">
      <Leaderboard />
    </div>
  );
}
