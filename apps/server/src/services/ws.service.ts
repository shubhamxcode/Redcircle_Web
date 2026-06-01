import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

// ─── Launch broadcast payload ─────────────────────────────────────────────────
// Everything a downstream consumer (e.g. the auto-buy Telegram bot) needs to
// notify users and execute a Meteora DBC buy without any extra API calls.

export interface LaunchBroadcast {
  type: "launch.confirmed";
  launchId: string;
  orynthLaunchId: string | null;
  // ── Buy-critical fields ──
  mintAddress: string;            // base token mint
  poolAddress: string | null;    // Meteora DBC pool — swap target
  // ── Display / notification fields ──
  tokenName: string;
  tokenSymbol: string;
  tokenImageUrl: string | null;
  sourcePlatform: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  creatorUsername: string | null;
  launchSignature: string | null;
  launchedAt: string;            // ISO timestamp
}

let wss: WebSocketServer | null = null;

// Attaches a WebSocket server to the existing HTTP server at `path`.
// If WS_AUTH_TOKEN is set, clients must connect with `?token=<TOKEN>`.
export function initLaunchWebSocket(server: Server, path = "/ws/launches"): WebSocketServer {
  wss = new WebSocketServer({ server, path });

  wss.on("connection", (socket, req) => {
    const expected = process.env.WS_AUTH_TOKEN;
    if (expected) {
      const url = new URL(req.url ?? "", "http://localhost");
      if (url.searchParams.get("token") !== expected) {
        socket.close(1008, "Unauthorized");
        return;
      }
    }

    socket.send(JSON.stringify({ type: "connected", ts: Date.now() }));
    socket.on("error", (err) => console.warn("[ws] client error:", err.message));
  });

  console.log(`📡 Launch WebSocket listening at ${path}`);
  return wss;
}

// Fan-out a confirmed launch to every connected client.
export function broadcastLaunch(payload: LaunchBroadcast): void {
  if (!wss) return;
  const msg = JSON.stringify(payload);
  let sent = 0;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
      sent++;
    }
  }
  console.log(`📡 [ws] broadcast launch ${payload.tokenSymbol} (${payload.mintAddress}) → ${sent} client(s)`);
}
