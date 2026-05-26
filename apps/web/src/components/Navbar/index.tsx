import { Link } from "@tanstack/react-router";

export default function Navbar() {
	return (
		<header className="fixed top-0 left-0 right-0 z-[60]">
			<div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-b border-white/10" />
			<div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center">
					<Link
						to="/home"
						className="flex shrink-0 items-center gap-2 z-50 font-extrabold text-lg sm:text-xl tracking-tight text-white"
					>
						<img src="/logo.png" alt="Redcircle" className="h-8 w-auto" />
						<span>Redcircle</span>
					</Link>
				</div>
			</div>
		</header>
	);
}

// WAITLIST MODE — nav links, sign in, and wallet button commented out
// Restore by reverting this file from git