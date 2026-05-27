import { createFileRoute } from "@tanstack/react-router";
import LaunchPanel from "@/components/LaunchPanel";
import RedditFeed from "@/components/RedditFeed";

export const Route = createFileRoute("/home")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="relative min-h-screen bg-black">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-orange-500/5 blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/50 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Powered by Orynth
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight leading-tight mb-4">
            Launch Your Token
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Turn any Reddit post into a tradable creator coin on Solana. You pay the launch costs and trading fees go to the creator.
          </p>
        </div>

        {/* Launch widget */}
        <div className="mb-20">
          <LaunchPanel />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-xs text-white/25 uppercase tracking-widest">Launched Tokens</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Feed */}
        <RedditFeed />
      </div>
    </div>
  );
}
