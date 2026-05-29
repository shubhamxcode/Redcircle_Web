import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { getApiUrl } from "@/lib/auth";
import { Copy, Check, RefreshCw, Zap, ExternalLink, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

interface Launch {
  id: string;
  status: string;
  tokenName: string;
  tokenSymbol: string;
  mintAddress?: string;
  poolAddress?: string;
  creatorUsername?: string;
  payerWalletAddress: string;
  launchSignature?: string;
  orynthLaunchId?: string;
  errorMessage?: string;
  launchedAt?: string;
  createdAt: string;
}

interface PoolEarning {
  launchId?: string;
  poolAddress: string;
  mintAddress?: string;
  symbol?: string;
  name?: string;
  claimableLamports: string;
  claimedLamports: string;
  claimableUsdc: string;
  claimedUsdc: string;
  totalUsdc: string;
  isMigrated: boolean;
  supported: boolean;
}

interface ClaimRow {
  id: string;
  claimBatchId: string;
  poolAddress: string;
  orynthClaimId?: string;
  status: string;
  amountSol?: string;
  signature?: string;
  errorMessage?: string;
  createdAt: string;
}

const adminHeaders = (secret: string) => ({
  "Content-Type": "application/json",
  "x-admin-secret": secret,
});

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 inline-flex items-center text-zinc-400 hover:text-white transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

const STATUS_COLORS: Record<string, string> = {
  confirmed:               "bg-green-900 text-green-300",
  failed:                  "bg-red-900 text-red-300",
  confirming:              "bg-blue-900 text-blue-300",
  submitting:              "bg-blue-900/60 text-blue-300",
  awaiting_payer_signature: "bg-yellow-900 text-yellow-300",
  preparing:               "bg-zinc-800 text-zinc-400",
};

export default function AdminPage() {
  const [secret, setSecret] = useState(() => {
    // Clear any previously persisted secret from old localStorage-based auth
    localStorage.removeItem("rc_admin_secret");
    return "";
  });
  const [authed, setAuthed] = useState(false);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [earningsMap, setEarningsMap] = useState<Record<string, PoolEarning>>({});
  const [totalClaimableUsdc, setTotalClaimableUsdc] = useState("0");
  const [totalClaimedUsdc, setTotalClaimedUsdc] = useState("0");
  const [claimHistory, setClaimHistory] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const apiUrl = getApiUrl();

  const fetchAll = useCallback(async (s = secret) => {
    setLoading(true);
    setError("");
    try {
      const [launchRes, earningsRes, claimsRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/launches`, { headers: adminHeaders(s) }),
        fetch(`${apiUrl}/api/admin/earnings`, { headers: adminHeaders(s) }),
        fetch(`${apiUrl}/api/admin/claims`, { headers: adminHeaders(s) }),
      ]);

      if (launchRes.status === 401) { setAuthed(false); setError("Invalid admin secret"); return; }

      const [launchData, earningsData, claimsData] = await Promise.all([
        launchRes.json(), earningsRes.json(), claimsRes.json(),
      ]);

      setLaunches(launchData.launches ?? []);

      if (earningsData.success && earningsData.earnings?.length) {
        const map: Record<string, PoolEarning> = {};
        for (const e of earningsData.earnings) map[e.poolAddress] = e;
        setEarningsMap(map);
        setTotalClaimableUsdc(earningsData.totalClaimableUsdc ?? "0");
        setTotalClaimedUsdc(earningsData.totalClaimedUsdc ?? "0");
      } else {
        setEarningsMap({});
        setTotalClaimableUsdc("0");
        setTotalClaimedUsdc("0");
      }

      setClaimHistory(claimsData.claims ?? []);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, secret]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchAll(secret);
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/api/admin/sync`, { method: "POST", headers: adminHeaders(secret) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Sync failed");
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleClaimAll = async () => {
    if (!confirm("Claim all earnings? This will broadcast a Solana transaction.")) return;
    setClaiming(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/api/admin/claims`, {
        method: "POST", headers: adminHeaders(secret), body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Claim failed");
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────────
  const confirmed = launches.filter((l) => l.status === "confirmed");
  const pending   = launches.filter((l) => !["confirmed", "failed"].includes(l.status));
  const failed    = launches.filter((l) => l.status === "failed");

  // ── Filtered table ───────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = launches.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (q) {
      return (
        l.tokenName.toLowerCase().includes(q) ||
        l.tokenSymbol.toLowerCase().includes(q) ||
        (l.creatorUsername ?? "").toLowerCase().includes(q) ||
        (l.mintAddress ?? "").toLowerCase().includes(q) ||
        (l.poolAddress ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 w-80 flex flex-col gap-4">
          <h1 className="text-white font-bold text-xl">Admin Access</h1>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Orynth-launched tokens & partner earnings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing || loading}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50">
            <RotateCcw size={14} className={syncing ? "animate-spin" : ""} />
            Sync Orynth
          </button>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-6 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Total",     value: launches.length,           color: "text-white" },
          { label: "Confirmed", value: confirmed.length,          color: "text-green-400" },
          { label: "Pending",   value: pending.length,            color: "text-yellow-400" },
          { label: "Failed",    value: failed.length,             color: "text-red-400" },
          { label: "Pools",     value: confirmed.filter(l => l.poolAddress).length, color: "text-blue-400" },
          { label: "Claimable (USDC)", value: `$${parseFloat(totalClaimableUsdc).toFixed(2)}`, color: "text-[#E8431C]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Partner Earnings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">Partner Earnings</h2>
            <p className="text-zinc-400 text-sm">Claimable from Orynth across all pools</p>
          </div>
          <button onClick={handleClaimAll} disabled={claiming || parseFloat(totalClaimableUsdc) === 0}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2 text-sm font-semibold transition-colors">
            <Zap size={14} />
            {claiming ? "Claiming…" : "Claim All"}
          </button>
        </div>

        {/* Summary row */}
        <div className="flex gap-6 mb-4 text-sm">
          <div>
            <span className="text-zinc-500">Claimable</span>
            <span className="ml-2 text-green-400 font-mono font-semibold">${parseFloat(totalClaimableUsdc).toFixed(4)} USDC</span>
          </div>
          <div>
            <span className="text-zinc-500">Claimed</span>
            <span className="ml-2 text-zinc-300 font-mono">${parseFloat(totalClaimedUsdc).toFixed(4)} USDC</span>
          </div>
        </div>

        {Object.keys(earningsMap).length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 font-medium">Token</th>
                  <th className="text-left py-2 font-medium">Pool</th>
                  <th className="text-right py-2 font-medium">Claimable (USDC)</th>
                  <th className="text-right py-2 font-medium">Claimed (USDC)</th>
                  <th className="text-right py-2 font-medium">Total (USDC)</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(earningsMap).map((e) => {
                  const claimable = parseFloat(e.claimableUsdc || "0") > 0;
                  return (
                    <tr key={e.poolAddress} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="py-2 pr-3">
                        <div className="flex flex-col">
                          <span className="text-white text-xs font-medium">{e.name ?? "—"}</span>
                          <span className="text-zinc-500 text-xs">{e.symbol}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-zinc-300">
                        {shortAddr(e.poolAddress)}<CopyButton value={e.poolAddress} />
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        <span className={claimable ? "text-green-400" : "text-zinc-500"}>
                          ${parseFloat(e.claimableUsdc || "0").toFixed(4)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-zinc-400">
                        ${parseFloat(e.claimedUsdc || "0").toFixed(4)}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-zinc-300">
                        ${parseFloat(e.totalUsdc || "0").toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">{loading ? "Loading…" : "No earnings data"}</p>
        )}
      </div>

      {/* Launches table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-white font-semibold">All Launches ({filtered.length})</h2>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search token, creator, mint, pool…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-orange-500 w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-orange-500"
            >
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="confirming">Confirming</option>
              <option value="submitting">Submitting</option>
              <option value="awaiting_payer_signature">Awaiting signature</option>
              <option value="preparing">Preparing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800 text-xs uppercase tracking-wide">
                <th className="text-left py-2 font-medium">Token</th>
                <th className="text-left py-2 font-medium">Creator</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Mint</th>
                <th className="text-left py-2 font-medium">Pool</th>
                <th className="text-left py-2 font-medium">Launch Sig</th>
                <th className="text-right py-2 font-medium">Claimable (USDC)</th>
                <th className="text-left py-2 font-medium">Launched</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-zinc-500">{loading ? "Loading…" : "No launches"}</td></tr>
              )}
              {filtered.map((l) => {
                const earning = l.poolAddress ? earningsMap[l.poolAddress] : undefined;
                return (
                  <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    {/* Token */}
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        {l.mintAddress ? (
                          <Link to="/token/$tokenId" params={{ tokenId: l.mintAddress }}
                            className="text-white font-medium hover:text-[#E8431C] transition-colors">
                            {l.tokenName}
                          </Link>
                        ) : (
                          <span className="text-white font-medium">{l.tokenName}</span>
                        )}
                        <span className="text-zinc-500 text-xs">{l.tokenSymbol}</span>
                      </div>
                    </td>
                    {/* Creator */}
                    <td className="py-2 pr-3 text-zinc-300 text-xs">{l.creatorUsername ?? "—"}</td>
                    {/* Status */}
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                        {l.status.replace(/_/g, " ")}
                      </span>
                      {l.errorMessage && (
                        <span className="ml-1 text-red-400 text-xs cursor-help" title={l.errorMessage}>⚠</span>
                      )}
                    </td>
                    {/* Mint */}
                    <td className="py-2 pr-3 font-mono text-xs text-zinc-300">
                      {l.mintAddress ? (
                        <span className="flex items-center gap-0.5">
                          {shortAddr(l.mintAddress)}
                          <CopyButton value={l.mintAddress} />
                          <a href={`https://solscan.io/token/${l.mintAddress}`} target="_blank" rel="noreferrer"
                            className="text-zinc-500 hover:text-blue-400 transition-colors">
                            <ExternalLink size={10} />
                          </a>
                        </span>
                      ) : "—"}
                    </td>
                    {/* Pool */}
                    <td className="py-2 pr-3 font-mono text-xs text-zinc-300">
                      {l.poolAddress ? (
                        <span className="flex items-center gap-0.5">
                          {shortAddr(l.poolAddress)}
                          <CopyButton value={l.poolAddress} />
                          <a href={`https://solscan.io/account/${l.poolAddress}`} target="_blank" rel="noreferrer"
                            className="text-zinc-500 hover:text-blue-400 transition-colors">
                            <ExternalLink size={10} />
                          </a>
                        </span>
                      ) : "—"}
                    </td>
                    {/* Launch Sig */}
                    <td className="py-2 pr-3 font-mono text-xs text-zinc-300">
                      {l.launchSignature ? (
                        <span className="flex items-center gap-0.5">
                          {shortAddr(l.launchSignature)}
                          <CopyButton value={l.launchSignature} />
                          <a href={`https://solscan.io/tx/${l.launchSignature}`} target="_blank" rel="noreferrer"
                            className="text-zinc-500 hover:text-blue-400 transition-colors">
                            <ExternalLink size={10} />
                          </a>
                        </span>
                      ) : "—"}
                    </td>
                    {/* Claimable earnings */}
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {earning ? (
                        <span className={parseFloat(earning.claimableUsdc || "0") > 0 ? "text-green-400" : "text-zinc-500"}>
                          ${parseFloat(earning.claimableUsdc || "0").toFixed(4)}
                        </span>
                      ) : "—"}
                    </td>
                    {/* Launched */}
                    <td className="py-2 text-zinc-400 text-xs whitespace-nowrap">
                      {l.launchedAt
                        ? new Date(l.launchedAt).toLocaleDateString()
                        : new Date(l.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim History — grouped by batch */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Claim History</h2>
        {(() => {
          // Group rows by claimBatchId, newest first
          const batches = claimHistory.reduce<Record<string, ClaimRow[]>>((acc, c) => {
            (acc[c.claimBatchId] ??= []).push(c);
            return acc;
          }, {});
          const batchIds = Object.keys(batches).sort(
            (a, b) => new Date(batches[b][0].createdAt).getTime() - new Date(batches[a][0].createdAt).getTime()
          );

          if (!batchIds.length) {
            return <p className="text-zinc-500 text-sm">{loading ? "Loading…" : "No claims yet"}</p>;
          }

          return (
            <div className="space-y-3">
              {batchIds.map((batchId) => {
                const rows = batches[batchId];
                const confirmed = rows.filter((r) => r.status === "confirmed");
                const failed    = rows.filter((r) => r.status === "failed");
                const active    = rows.filter((r) => !["failed", "confirmed"].includes(r.status));
                // Batch-level status
                const batchStatus = confirmed.length > 0 ? "confirmed"
                  : active.length > 0 ? active[0].status
                  : "failed";
                const confirmedSum = confirmed.reduce((s, r) => s + parseFloat(r.amountSol ?? "0"), 0);
                const totalUsdc = confirmedSum > 0
                  ? confirmedSum.toFixed(4)
                  : rows.some(r => r.amountSol)
                    ? rows.reduce((s, r) => s + parseFloat(r.amountSol ?? "0"), 0).toFixed(4)
                    : null;
                const date = new Date(rows[0].createdAt);

                return (
                  <div key={batchId} className="border border-zinc-800 rounded-lg overflow-hidden">
                    {/* Batch header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/40">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          batchStatus === "confirmed" ? "bg-green-900 text-green-300"
                          : batchStatus === "failed"  ? "bg-red-900 text-red-300"
                          : "bg-yellow-900 text-yellow-300"
                        }`}>
                          {batchStatus}
                        </span>
                        <span className="font-mono text-xs text-zinc-400">{batchId.slice(0, 8)}…</span>
                        <span className="text-zinc-500 text-xs">
                          {confirmed.length} confirmed · {failed.length} failed · {rows.length} pools
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {totalUsdc && (
                          <span className="font-mono text-xs text-green-400">${totalUsdc} USDC</span>
                        )}
                        <span className="text-zinc-500 text-xs">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    {/* Only show confirmed rows in the detail — skip noise */}
                    {confirmed.length > 0 && (
                      <div className="divide-y divide-zinc-800/50">
                        {confirmed.map((c) => (
                          <div key={c.id} className="flex items-center justify-between px-4 py-2 text-xs">
                            <span className="font-mono text-zinc-300">{shortAddr(c.poolAddress)}<CopyButton value={c.poolAddress} /></span>
                            <span className="font-mono text-green-400">${c.amountSol ? parseFloat(c.amountSol).toFixed(6) : "—"} USDC</span>
                            {c.signature ? (
                              <span className="flex items-center gap-1 font-mono text-zinc-400">
                                {shortAddr(c.signature)}
                                <CopyButton value={c.signature} />
                                <a href={`https://solscan.io/tx/${c.signature}`} target="_blank" rel="noreferrer"
                                  className="text-zinc-500 hover:text-blue-400"><ExternalLink size={10} /></a>
                              </span>
                            ) : <span className="text-zinc-600">no sig</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
        <div className="mt-4 text-zinc-600 text-xs">
          Showing {Object.keys(claimHistory.reduce<Record<string,boolean>>((a,c) => ({...a,[c.claimBatchId]:true}),{})).length} batches · {claimHistory.length} total rows
        </div>
      </div>
    </div>
  );
}
