import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, LogOut, UserRound } from "lucide-react";

const navLinks = [
  { label: "Feed", to: "/home" },
  { label: "Leaderboard", to: "/leaderboard" },
];

function Avatar({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-white/10`}>
        <UserRound className="w-4 h-4 text-white/50" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[60]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-b border-white/10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">

          {/* Logo */}
          <Link
            to="/home"
            className="flex shrink-0 items-center gap-2 font-extrabold text-lg tracking-tight text-white"
          >
            <img src="/logo.png" alt="Redcircle" className="h-8 w-auto" />
            <span className="hidden xs:inline sm:inline">Redcircle</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-white/70 hover:text-white transition-colors"
                activeProps={{ className: "text-sm text-white font-semibold" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Desktop: full user profile */}
            {isAuthenticated && user ? (
              <>
                {/* Avatar always visible */}
                <Avatar
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border-2 border-white/20 object-cover flex-shrink-0"
                />
                {/* Username + logout only on desktop */}
                <span className="hidden md:inline text-white text-sm font-medium truncate max-w-[120px]">
                  {user.username}
                </span>
                <button
                  onClick={logout}
                  className="hidden md:flex px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium transition-all whitespace-nowrap"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/signin"
                search={{ redirect: undefined }}
                className="hidden md:flex px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all"
              >
                Sign In
              </Link>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 px-4 py-3 space-y-1">
          {/* User info on mobile */}
          {isAuthenticated && user && (
            <div className="flex items-center justify-between px-3 py-3 mb-2 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Avatar src={user.avatarUrl} alt={user.username}
                  className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                <span className="text-sm font-medium text-white">{user.username}</span>
              </div>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}

          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="flex items-center h-11 px-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              activeProps={{ className: "flex items-center h-11 px-3 rounded-xl text-sm text-white font-semibold bg-white/8" }}
            >
              {link.label}
            </Link>
          ))}

          {!isAuthenticated && (
            <Link
              to="/signin"
              search={{ redirect: undefined }}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center h-11 mt-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
