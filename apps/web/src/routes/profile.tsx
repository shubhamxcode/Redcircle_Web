import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import ProfilePanel from "@/components/ProfilePanel";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/signin" search={{ redirect: "/profile" }} />;
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 pt-32 pb-20 sm:px-6 lg:px-8">
      <ProfilePanel />
    </div>
  );
}
