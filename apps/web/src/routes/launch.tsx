import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import LaunchPanel from "@/components/LaunchPanel";

export const Route = createFileRoute("/launch")({
  component: LaunchPage,
});

function LaunchPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/signin", search: { redirect: "/launch" } });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center px-6 py-20 pt-32 pb-24">
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
