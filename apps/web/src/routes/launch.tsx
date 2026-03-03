import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import LaunchPanel from "@/components/LaunchPanel";

const RedditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#FF4500">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

export const Route = createFileRoute("/launch")({
  component: LaunchPage,
});

function LaunchPage() {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }

  // Not authenticated — show sign-in prompt matching project theme
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-black flex items-center justify-center px-6">
        {/* Subtle ambient glow matching project style */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#FF4500]/5 blur-[120px]" />
        </div>

        <div className="w-full max-w-sm flex flex-col gap-8 text-center">
          {/* Reddit wordmark / brand area */}
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Redcircle</p>
            <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight">
              Launch a Token
            </h1>
            <p className="text-white/40 text-sm sm:text-base leading-relaxed">
              Tokenize any Reddit post on the Solana blockchain and join the new social token economy.
            </p>
          </div>

          {/* CTA button — matches sign-in page style */}
          <div className="flex flex-col gap-3">
            <Link
              to="/signin"
              search={{ redirect: "/launch" }}
              className="w-full flex items-center justify-center gap-3 border-2 border-[#FF4500] rounded-2xl py-4 hover:bg-[#FF4500]/10 transition-all group cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <RedditIcon />
              <span className="font-semibold text-base text-white">Continue with Reddit</span>
            </Link>
            <p className="text-xs text-white/20">
              A Redcircle account is created automatically on sign in
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated — show full launch panel
  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center px-6 py-20 pt-32 pb-24">
        {/* Background gradient effects */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="w-full">
          <LaunchPanel />
        </div>
      </div>
  );
}

