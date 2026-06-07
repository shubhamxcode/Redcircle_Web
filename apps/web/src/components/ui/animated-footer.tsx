"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { TwitterIcon, GithubIcon, Copy, Check } from "lucide-react";

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
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-400 hover:border-white/20 hover:text-white transition-all"
    >
      <span className="font-mono">{CA.slice(0, 6)}…{CA.slice(-4)}</span>
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function AnimatedFooter() {
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the band renders crisp without gaps on some devices
    if (bandRef.current) bandRef.current.style.transform = "translateZ(0)";
  }, []);

  return (
    <footer className="relative w-full bg-black text-white pt-28 pb-16 px-6 overflow-hidden border-t-2 border-white/40 rounded-t-[3rem]">
      {/* Animated top design band */}
      <div ref={bandRef} className="absolute top-0 left-0 right-0 h-24 overflow-hidden">
        {/* flowing grid highlight */}
        <motion.div
          aria-hidden
          className="absolute-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px)",
            backgroundSize: "200% 100%, 100% 200%",
          }}
          animate={{ backgroundPositionX: ["0%", "-100%"], backgroundPositionY: ["0%", "100%"] }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
        {/* diagonal streaks */}
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(35deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 18px)",
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPositionX: ["100%", "0%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        />
        {/* soft aurora blobs */}
        <motion.div
          aria-hidden
          className="absolute -top-16 left-1/4 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.40), transparent 70%)" }}
          animate={{ x: [ -120, 120, -120 ] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -top-20 right-1/4 h-56 w-56 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(236,72,153,0.35), transparent 70%)" }}
          animate={{ x: [ 160, -160, 160 ] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* thin glow divider */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      {/* Subtle moving grid across the whole footer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.7) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.7) 0 1px, transparent 1px 40px)",
            backgroundSize: "100% 200%, 200% 100%",
          }}
          animate={{ backgroundPositionY: ["0%", "100%"], backgroundPositionX: ["0%", "100%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Large watermark text in the back */}
      <div className="pointer-events-none select-none absolute left-1/2 -translate-x-1/2 bottom-8 md:bottom-12 z-[1]">
        <div className="text-white/5 font-extrabold uppercase tracking-tight text-6xl md:text-[10rem] leading-none font-satoshi">
          REDCIRCLE
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <MotionCol title="Platform" links={[
            { label: "Feed", href: "/home" },
            { label: "Leaderboard", href: "/leaderboard" },
          ]} delay={0.05} />
          <MotionCol title="Legal" links={[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
          ]} delay={0.1} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-4 font-satoshi">Follow</h3>
            <div className="flex items-center gap-5 text-neutral-400">
              <a className="hover:text-white transition-colors" href="https://x.com/redcircle_sol" target="_blank" rel="noreferrer" aria-label="X / Twitter"><TwitterIcon className="w-5 h-5" /></a>
              <a className="hover:text-white transition-colors" href="https://t.me/redcircle_sol" target="_blank" rel="noreferrer" aria-label="Telegram">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </a>
              <a className="hover:text-white transition-colors" href="https://github.com/redcircle-lol" target="_blank" rel="noreferrer" aria-label="GitHub"><GithubIcon className="w-5 h-5" /></a>
            </div>
          </motion.div>
        </div>

        {/* bottom row */}
        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 text-neutral-500 text-sm">
          <span>© {new Date().getFullYear()} RedCircle. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-600">CA:</span>
            <CopyCA />
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MotionCol({ title, links, delay = 0 }: { title: string; links: { label: string; href: string }[]; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-4 font-satoshi">{title}</h3>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="text-neutral-300 hover:text-white transition-colors">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}


