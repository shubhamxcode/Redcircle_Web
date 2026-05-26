"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiUrl } from "@/lib/auth";

const RedditIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
		className="w-full h-full text-[#FF4500]"
	>
		<path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
	</svg>
);

const BankIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className="w-full h-full text-[#14F195]"
	>
		<line x1="3" x2="21" y1="22" y2="22" />
		<line x1="6" x2="6" y1="18" y2="11" />
		<line x1="10" x2="10" y1="18" y2="11" />
		<line x1="14" x2="14" y1="18" y2="11" />
		<line x1="18" x2="18" y1="18" y2="11" />
		<polygon points="12 2 20 7 4 7" />
	</svg>
);

function ShootingStars() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			{Array.from({ length: 15 }).map((_, i) => (
				<motion.div
					key={i}
					className="absolute h-0.5 bg-gradient-to-r from-transparent via-neutral-500 to-transparent dark:via-white w-20 md:w-32"
					initial={{
						x: Math.random() * 100 + "%",
						y: Math.random() * 100 + "%",
						rotate: -45,
						opacity: 0,
					}}
					animate={{
						x: [null, `calc(${Math.random() * 100}% - 1000px)`],
						y: [null, `calc(${Math.random() * 100}% + 1000px)`],
						opacity: [0, 1, 0],
					}}
					transition={{
						duration: Math.random() * 5 + 3,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
						delay: Math.random() * 5,
					}}
				/>
			))}
		</div>
	);
}

function AnimatedGrid() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-20">
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
		</div>
	);
}

function AnimatedBackground() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,69,0,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,69,0,0.05),transparent_50%)]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,241,149,0.1),transparent_40%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(20,241,149,0.05),transparent_40%)]" />
			<AnimatedGrid />
			<ShootingStars />
			<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-50 dark:from-neutral-950 to-transparent pointer-events-none" />
		</div>
	);
}

// Pure CSS confetti — no canvas-confetti needed
const CONFETTI_COLORS = [
	"#FF4500", "#14F195", "#FFD700", "#FF6B6B",
	"#4ECDC4", "#ff9a00", "#00f2fe", "#a855f7", "#f43f5e",
];

function ConfettiRain() {
	const [visible, setVisible] = useState(true);
	const [pieces] = useState(() =>
		Array.from({ length: 80 }, (_, i) => ({
			id: i,
			left: Math.random() * 100,
			delay: Math.random() * 2.5,
			duration: 2.5 + Math.random() * 2.5,
			size: 6 + Math.random() * 8,
			color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
			drift: -40 + Math.random() * 80,
			isCircle: Math.random() > 0.5,
		}))
	);

	useEffect(() => {
		const timer = setTimeout(() => setVisible(false), 7000);
		return () => clearTimeout(timer);
	}, []);

	if (!visible) return null;

	return (
		<>
			<style>{`
				@keyframes confetti-fall {
					0% {
						transform: translateY(-20px) translateX(0px) rotateZ(0deg) rotateX(0deg);
						opacity: 1;
					}
					15% {
						opacity: 1;
					}
					100% {
						transform: translateY(110vh) translateX(var(--confetti-drift)) rotateZ(720deg) rotateX(360deg);
						opacity: 0;
					}
				}
			`}</style>
			<div
				style={{
					position: "fixed",
					inset: 0,
					pointerEvents: "none",
					zIndex: 99999,
					overflow: "hidden",
				}}
				aria-hidden="true"
			>
				{pieces.map((p) => (
					<div
						key={p.id}
						style={{
							position: "absolute",
							top: -20,
							left: `${p.left}%`,
							width: p.size,
							height: p.isCircle ? p.size : p.size * 1.5,
							backgroundColor: p.color,
							borderRadius: p.isCircle ? "50%" : "2px",
							["--confetti-drift" as string]: `${p.drift}px`,
							animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
						}}
					/>
				))}
			</div>
		</>
	);
}

export function BackgroundPaths({
	title = "Background Paths",
	subtitle,
}: {
	title?: string;
	subtitle?: string;
}) {
	const words = title.split(" ");
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [showConfetti, setShowConfetti] = useState(false);

	// -- Commented out: Start Trading Now navigation --
	// const navigate = useNavigate();
	// const handleStartTrading = () => {
	// 	navigate({ to: "/launch" });
	// };

	const handleWaitlistSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage("");

		if (!email.trim()) {
			setErrorMessage("Please enter your email address");
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			setErrorMessage("Please enter a valid email address");
			return;
		}

		setIsSubmitting(true);

		try {
			const apiUrl = getApiUrl();
			const response = await fetch(`${apiUrl}/api/waitlist`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim() }),
			});

			const data = await response.json();

			if (response.status === 201) {
				setIsSuccess(true);
				setShowConfetti(true);
			} else if (response.status === 409) {
				setErrorMessage("You're already on the waitlist! 🎉");
			} else {
				setErrorMessage(data.message || "Something went wrong. Please try again.");
			}
		} catch {
			setErrorMessage("Network error. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-neutral-50 dark:bg-black :bg-orange-500/30">
			<div className="absolute inset-0 h-full w-full">
				<AnimatedBackground />
			</div>

			{/* Confetti Rain — rendered via portal-like fixed positioning */}
			{showConfetti && <ConfettiRain />}

			<div className="relative z-10 container mx-auto px-4 md:px-6 text-center flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-10">
				{/* Animated Logo Integration */}
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 1, ease: "easeOut" }}
					className="mb-8 relative flex items-center justify-center gap-12 md:gap-24"
				>
					{/* Central Glow */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-r from-orange-500/20 to-green-500/20 blur-3xl rounded-full pointer-events-none" />

					{/* Reddit Icon */}
					<motion.div
						animate={{ y: [-15, 15, -15], rotate: [-2, 2, -2] }}
						transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
						className="relative group"
					>
						<div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-full group-hover:bg-orange-500/50 transition-all duration-500" />
						<div className="w-20 h-20 md:w-32 md:h-32 dark:bg-black/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 z-10 relative">
							<img src="/logo.png" alt="Redcircle" className="w-full h-full object-cover" />
						</div>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
							className="absolute inset-[-20%] border border-orange-500/20 rounded-full border-dashed"
						/>
					</motion.div>

					{/* Floating Dollars Animation */}
					<div className="absolute inset-0 pointer-events-none">
						{[0, 1, 2, 3, 4].map((i) => (
							<motion.div
								key={i}
								className="absolute top-1/2 left-1/2 flex items-center justify-center"
								initial={{ x: -100, y: 0, opacity: 0, scale: 0.5 }}
								animate={{
									x: [null, 100],
									y: [null, i % 2 === 0 ? -20 : 20],
									opacity: [0, 1, 0],
									scale: [0.5, 1, 0.5],
									rotate: [0, 180],
								}}
								transition={{
									duration: 2,
									repeat: Number.POSITIVE_INFINITY,
									delay: i * 0.4,
									ease: "easeInOut",
								}}
							>
								<span className="text-green-400 dark:text-green-300 font-bold text-xl md:text-2xl drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
									$
								</span>
							</motion.div>
						))}
					</div>

					{/* Solana Icon */}
					<motion.div
						animate={{ y: [15, -15, 15], rotate: [2, -2, 2] }}
						transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.5 }}
						className="relative group"
					>
						<div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full group-hover:bg-green-500/50 transition-all duration-500" />
						<div className="w-20 h-20 md:w-32 md:h-32 bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-3xl shadow-2xl p-5 border border-white/20 dark:border-white/10 z-10 relative flex items-center justify-center">
							<BankIcon />
						</div>
						<motion.div
							animate={{ rotate: -360 }}
							transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
							className="absolute inset-[-20%] border border-green-500/20 rounded-full border-dashed"
						/>
					</motion.div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
					className="max-w-5xl mx-auto relative z-20"
				>
					<h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-4 tracking-tighter font-satoshi text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-500 leading-tight">
						{words.map((word, wordIndex) => (
							<span key={wordIndex} className="inline-block mr-4 last:mr-0">
								{word.split("").map((letter, letterIndex) => (
									<motion.span
										key={`${wordIndex}-${letterIndex}`}
										initial={{ y: 100, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										transition={{
											delay: wordIndex * 0.1 + letterIndex * 0.03 + 0.5,
											type: "spring",
											stiffness: 150,
											damping: 25,
										}}
										className="inline-block"
									>
										{letter}
									</motion.span>
								))}
							</span>
						))}
					</h1>

					{subtitle && (
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.8, duration: 0.8 }}
							className="text-lg md:text-2xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-3xl mx-auto font-light leading-relaxed tracking-tight"
						>
							{subtitle}
						</motion.p>
					)}

					{/* Waitlist Email Form */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1.1, duration: 0.8 }}
						className="w-full max-w-lg mx-auto"
					>
						<AnimatePresence mode="wait">
							{isSuccess ? (
								<motion.div
									key="success"
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
									className="flex flex-col items-center gap-3"
								>
									<div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
										<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
										You're on the list! 🎉
									</h3>
									<p className="text-neutral-500 dark:text-neutral-400 text-sm">
										We'll notify you when we launch. Stay tuned!
									</p>
								</motion.div>
							) : (
								<motion.form
									key="form"
									initial={{ opacity: 1 }}
									exit={{ opacity: 0, y: -20 }}
									onSubmit={handleWaitlistSubmit}
									className="flex flex-col items-center gap-4"
								>
									<p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">
										Join the Waitlist
									</p>

									<div className="flex w-full gap-1 sm:gap-2 items-center bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-full border border-neutral-200 dark:border-white/15 shadow-xl shadow-black/5 dark:shadow-black/20 p-1 sm:p-1.5 transition-all duration-300 focus-within:border-orange-400 dark:focus-within:border-orange-500 focus-within:shadow-orange-500/10">
										<input
											id="waitlist-email"
											type="email"
											value={email}
											onChange={(e) => {
												setEmail(e.target.value);
												setErrorMessage("");
											}}
											placeholder="Enter your email"
											className="flex-1 min-w-0 bg-transparent border-none outline-none px-3 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
											disabled={isSubmitting}
											autoComplete="email"
										/>
										<button
											type="submit"
											disabled={isSubmitting}
											className="shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-[10px] sm:text-sm font-semibold
												bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600
												text-white transition-all duration-300
												hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30
												disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
												cursor-pointer whitespace-nowrap"
										>
											{isSubmitting ? (
												<span className="flex items-center gap-2">
													<svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
														<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
													</svg>
													Joining...
												</span>
											) : (
												"Join Now"
											)}
										</button>
									</div>

									<AnimatePresence>
										{errorMessage && (
											<motion.p
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10 }}
												className="text-sm text-red-500 dark:text-red-400"
											>
												{errorMessage}
											</motion.p>
										)}
									</AnimatePresence>
								</motion.form>
							)}
						</AnimatePresence>
					</motion.div>

					{/* -- Commented out: Start Trading Now button --
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1.1, duration: 0.8 }}
						className="inline-block"
					>
						<Button
							size="lg"
							className="rounded-full px-8 py-6 text-lg font-medium 
                            bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 
                            text-white dark:text-black transition-all duration-300 
                            hover:scale-105 hover:shadow-lg hover:shadow-neutral-500/20 cursor-pointer"
							onClick={handleStartTrading}
						>
							Start Trading Now
						</Button>
					</motion.div>
					*/}
				</motion.div>
			</div>
		</div>
	);
}
