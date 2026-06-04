import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet, ChevronDown, Copy, LogOut, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WalletButton() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const address = publicKey?.toBase58() ?? "";
  const short   = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDisconnect = () => {
    setOpen(false);
    disconnect().catch(() => {});
  };

  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium transition-all whitespace-nowrap"
      >
        <Wallet className="w-3.5 h-3.5 text-white/60" />
        Connect Wallet
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all whitespace-nowrap",
          "bg-white/10 hover:bg-white/15 border-white/20 text-white",
        )}
      >
        {/* Green connected dot */}
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
        {short}
        <ChevronDown className={cn("w-3 h-3 text-white/50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[#111] border border-white/10 shadow-xl overflow-hidden z-50">
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy address"}
          </button>
          <div className="border-t border-white/8" />
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
