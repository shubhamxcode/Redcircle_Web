import { useState } from "react";
import { cn } from "@/lib/utils";

type MarketTradePanelProps = {
  tokenSymbol?: string;
  className?: string;
};

export default function MarketTradePanel({ tokenSymbol = "TOKEN", className }: MarketTradePanelProps) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  return (
    <aside className={cn("rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-xl", className)}>
      <div className="mb-4 grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setSide("buy")}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
            side === "buy" ? "bg-green-500/20 text-green-300" : "text-white/60 hover:text-white",
          )}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide("sell")}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
            side === "sell" ? "bg-red-500/20 text-red-300" : "text-white/60 hover:text-white",
          )}
        >
          Sell
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <div className="text-xs text-white/50">{tokenSymbol}</div>
        <label className="block text-xs font-medium text-white/70">Amount (SOL)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      <div className="mb-4 grid grid-cols-5 gap-2">
        {["0.01", "0.1", "1", "5", "Max"].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset === "Max" ? "10" : preset)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">
        Connect wallet to trade
      </div>

      <button
        type="button"
        className={cn(
          "w-full rounded-lg px-3 py-2 text-sm font-semibold",
          side === "buy"
            ? "bg-green-500/30 text-green-200"
            : "bg-red-500/30 text-red-200",
        )}
      >
        Login Required
      </button>
    </aside>
  );
}
