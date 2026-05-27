import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignInPage } from "../components/ui/sign-in";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getApiUrl } from "../lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/signin")({
  component: SignIn,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    };
  },
});

function SignIn() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { redirect } = Route.useSearch();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
        navigate({ to: redirect || "/" });
    }
  }, [isAuthenticated, navigate, redirect]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userStr = params.get("user");
    const error = params.get("error");

    if (error) {
      console.error("❌ Authentication error:", error);

      // Show user-friendly error messages
      const errorMessages: { [key: string]: string } = {
        auth_failed: "Reddit authentication failed. This usually means:\n\n• The users table doesn't exist (run: pnpm db:push)\n• Database connection failed (check DATABASE_URL)\n\nCheck the backend terminal for detailed error logs.",
        no_user: "Reddit authentication succeeded but no user was returned. Check backend logs.",
        session_failed: "Failed to create session. Please try again.",
        server_error: "Server error occurred. Please try again.",
      };

      const message = errorMessages[error] || `Unknown error: ${error}`;
      toast.error("Authentication error", {
        description: `${message}\n\nCheck your backend terminal for detailed error logs.`,
      });

      // Clean up URL
      window.history.replaceState({}, document.title, "/signin");
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));

        console.log("🔐 OAuth callback received - logging in user:", user.username);
        // Use auth context to log in
        login(token, user);

        console.log("✅ Login successful, redirecting to dashboard...");

        // Clean up URL immediately to prevent double processing
        window.history.replaceState({}, document.title, "/signin");

        // Redirect to dashboard - increased timeout to ensure localStorage is updated
          setTimeout(() => {
            navigate({ to: redirect || "/" });
        }, 300);
      } catch (err) {
        console.error("❌ Error parsing user data:", err);
        toast.error("Failed to complete sign in", {
          description: "We couldn't parse the user data from Reddit. Please try again.",
        });
      }
    }
  }, [login, navigate, redirect]);

  const startRedditSignIn = () => {
    console.log("🔴 Reddit sign-in button clicked!");

    const apiUrl = getApiUrl();
    console.log("🔴 Backend URL:", apiUrl);
    console.log("🔴 Redirecting to:", `${apiUrl}/auth/reddit`);

    window.location.href = `${apiUrl}/auth/reddit`;
  };

  return (
    <SignInPage
      title={
        <span className="font-light tracking-wider">
          Welcome to <span className="font-bold font-satoshi">Redcircle</span>
        </span>
      }
      description={
        redirect
          ? "Please sign in to access this feature"
          : "Access your account and start trading tokenized engagement"
      }
      heroImageSrc="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop"
      testimonials={[
        {
          avatarSrc: "https://pbs.twimg.com/profile_images/1939628385925496832/OEeL3rR1_400x400.jpg",
          name: "Utkarsh",
          handle: "@twtutkarsh",
          text: "RedCircle transformed how I monetize my content. The tokenization process is seamless!",
        },
        {
          avatarSrc: "https://pbs.twimg.com/profile_images/1974081302182645760/ZkML0_32_400x400.jpg",
          name: "Sam",
          handle: "@BlueCircle0",
          text: "Best trading platform for content creators. The UI is incredibly intuitive.",
        },
        {
          avatarSrc: "https://pbs.twimg.com/profile_images/1881399718585999360/QEQGPBu1_400x400.jpg",
          name: "Atharva",
          handle: "@atharvaSachan",
          text: "I've been using RedCircle for 6 months. The rewards system is phenomenal!",
        },
      ]}
      onRedditSignIn={startRedditSignIn}
    />
  );
}
