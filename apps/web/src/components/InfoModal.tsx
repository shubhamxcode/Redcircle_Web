import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InfoModal({ open, onClose }: InfoModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#09090b] shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-7 py-8 text-center space-y-8">
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-[#FF4500] tracking-tight">RedCircle</h2>
                <p className="text-sm text-white/40">The Reddit token economy</p>
              </div>

              {/* What is RedCircle */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#FF4500]">What is RedCircle?</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  RedCircle turns viral Reddit posts into tradeable Solana tokens.
                  The best posts get tokenized, original creators earn USDC, and
                  anyone can trade on Jupiter DEX.
                </p>
              </div>

              {/* How it works */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[#FF4500]">How it works</h3>
                <div className="space-y-2.5 text-sm text-white/70">
                  <p>Browse hot Reddit posts and launch a token with one click</p>
                  <p>Server pays the gas — no SOL needed to launch</p>
                  <p>Token goes live on Solana via a Meteora liquidity pool</p>
                  <p>Trade instantly on Jupiter DEX with real price discovery</p>
                </div>
              </div>

              {/* Fees & Rewards */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[#FF4500]">Fees & Rewards</h3>
                <div className="space-y-2 text-sm text-white/70">
                  <p className="font-bold text-white">2.5% fee on every buy and sell</p>
                  <p>~0.67% to original post creator (claimable as USDC)</p>
                  <p>~0.67% to RedCircle</p>
                  <p>~1.16% to protocol</p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-[#FF4500] hover:bg-[#FF4500]/85 text-white font-bold py-3.5 text-sm transition-all"
              >
                let's go 🔴
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
