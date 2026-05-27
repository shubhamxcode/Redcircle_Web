import { createFileRoute } from "@tanstack/react-router";
import RedditFeed from "@/components/RedditFeed";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});

function FeedPage() {
  return (
    <div className="relative flex min-h-screen flex-col pt-16 sm:pt-16 md:pt-16 pb-4 sm:pb-6 md:pb-16">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8">
        <RedditFeed />
      </div>
    </div>
  );
}

