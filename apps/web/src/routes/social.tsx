import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import InfoModal from "@/components/InfoModal";

export const Route = createFileRoute("/social")({
  component: SocialPage,
});

const links = [
  {
    label: "Reddit",
    handle: "u/Redcircle0",
    href: "https://www.reddit.com/user/Redcircle0/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
    bg: "bg-white/[0.06] hover:bg-white/[0.10]",
    border: "border-white/10 hover:border-white/20",
  },
  {
    label: "X (Twitter)",
    handle: "@redcircle_sol",
    href: "https://x.com/redcircle_sol",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    bg: "bg-white/[0.06] hover:bg-white/[0.10]",
    border: "border-white/10 hover:border-white/20",
  },
  {
    label: "Telegram",
    handle: "@redcircle_sol",
    href: "https://t.me/redcircle_sol",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    bg: "bg-white/[0.06] hover:bg-white/[0.10]",
    border: "border-white/10 hover:border-white/20",
  },
  {
    label: "GitHub",
    handle: "redcircle-lol",
    href: "https://github.com/redcircle-lol",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    bg: "bg-white/[0.06] hover:bg-white/[0.10]",
    border: "border-white/10 hover:border-white/20",
  },
];

function SocialPage() {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="RedCircle" className="w-16 h-16 rounded-2xl" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-tight">RedCircle</h1>
            <p className="text-sm text-white/40 mt-0.5">Tokenize viral Reddit posts on Solana</p>
          </div>
        </div>

        {/* Links */}
        <div className="w-full flex flex-col gap-3">
          {links.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className={`flex items-center gap-4 w-full rounded-2xl border px-5 py-4 text-white transition-all ${link.bg} ${link.border}`}
            >
              <span className="text-white/70">{link.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{link.label}</p>
                <p className="text-xs text-white/40">{link.handle}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/20 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </motion.a>
          ))}
        </div>

        <button
          onClick={() => setInfoOpen(true)}
          className="text-xs text-white/20 hover:text-white/50 transition-colors underline underline-offset-2"
        >
          What is RedCircle?
        </button>
      </motion.div>
    </div>
  );
}
