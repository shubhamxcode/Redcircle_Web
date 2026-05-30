import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import LaunchPanel from "@/components/LaunchPanel";
import RedditFeed from "@/components/RedditFeed";
import { AnimatedFooter } from "@/components/ui/animated-footer";
import { Copy, Check } from "lucide-react";

const CA = "BUCUTDnUZteDkMDWyqYtavDhvAFEFVn9YKD3jj6qvory";

function CopyCA() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-4 py-1.5 text-xs text-white/50 hover:text-white/80 transition-all backdrop-blur-sm"
    >
      <span className="text-white/30 uppercase tracking-widest text-[9px] font-semibold">CA</span>
      <span className="font-mono text-white/60">{CA.slice(0, 6)}…{CA.slice(-4)}</span>
      {copied
        ? <Check className="w-3 h-3 text-emerald-400" />
        : <Copy className="w-3 h-3 text-white/30" />}
    </button>
  );
}

export const Route = createFileRoute("/home")({
  component: HomeComponent,
});

function HomeComponent() {
  const initialUrl = sessionStorage.getItem("hotLaunchUrl") || undefined;
  if (initialUrl) sessionStorage.removeItem("hotLaunchUrl");

  return (
    <div className="relative min-h-screen bg-black">
      {/* Dot-grid background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-blob-drift absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-[#E8431C]/5 blur-[100px]" />
        <div className="animate-blob-drift2 absolute top-1/3 -right-40 h-[400px] w-[500px] rounded-full bg-[#E8431C]/3 blur-[120px]" />
        <div className="animate-blob-drift absolute bottom-0 -left-40 h-[350px] w-[450px] rounded-full bg-[#E8431C]/3 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-6 sm:pt-10 pb-8">
        {/* Hero */}
        <div className="mb-8 sm:mb-12 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8431C]/20 bg-[#E8431C]/8 px-3 sm:px-4 py-1.5 text-xs text-[#E8431C]/80 mb-5 sm:mb-7 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8431C] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E8431C]" />
            </span>
            Powered by Orynth
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-4 sm:mb-5">
            <span className="text-white">Turn Reddit Posts Into</span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #E8431C 0%, #FF5535 50%, #FFA500 100%)",
              }}
            >
              Tradable Tokens
            </span>
          </h1>

          <p className="text-white/40 text-sm sm:text-base md:text-lg max-w-sm sm:max-w-xl mx-auto px-2 leading-relaxed mb-5">
            Paste any Reddit post, launch a Solana market, and let people trade
            the attention around it.
          </p>

          <CopyCA />
        </div>

        {/* Launch widget */}
        <div className="mb-12 sm:mb-20">
          <LaunchPanel initialUrl={initialUrl || undefined} />
        </div>

        <div className="mb-8 sm:mb-10" />

        {/* Feed */}
        <RedditFeed />
      </div>

      <AnimatedFooter />
    </div>
  );
}
