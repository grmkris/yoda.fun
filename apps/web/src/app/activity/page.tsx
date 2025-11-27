import ActivityFeed from "./activity-feed";

export const metadata = {
  title: "Activity | Yoda.fun",
  description: "See what's happening on Yoda.fun",
};

export default function ActivityPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 font-bold text-3xl">Activity Feed</h1>
      <ActivityFeed />
    </div>
  );
}
