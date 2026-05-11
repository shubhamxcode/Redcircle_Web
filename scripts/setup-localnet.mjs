#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const protocolDir = path.resolve(repoRoot, "../redcircle-protocol");
const serverEnvPath = path.join(repoRoot, "apps/server/.env");
const webEnvPath = path.join(repoRoot, "apps/web/.env.local");
const rootEnvPath = path.join(repoRoot, ".env");
const localRpcUrl = "http://127.0.0.1:8899";
const deployKeypairPath = path.join(
  protocolDir,
  "target/deploy/redcircle_protocol-keypair.json"
);

const args = parseArgs(process.argv.slice(2));
const shouldDeploy = !args["skip-deploy"];
const shouldInit = !args["skip-init"];
const keypairPath = path.resolve(
  expandHome(
    args.keypair ||
      process.env.SOLANA_KEYPAIR ||
      process.env.ANCHOR_WALLET ||
      "~/.config/solana/id.json"
  )
);

const requireFromProtocolSdk = createRequire(
  path.join(protocolDir, "sdk/package.json")
);
const web3 = requireFromProtocolSdk("@solana/web3.js");
const protocolSdk = () => requireFromProtocolSdk("./dist/index.js");

main().catch((error) => {
  console.error("\nsetup-localnet failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  assertFile(keypairPath, `Solana keypair not found: ${keypairPath}`);
  assertDir(protocolDir, `Protocol repo not found: ${protocolDir}`);

  const authority = loadKeypair(keypairPath);
  const authorityBase58 = encodeBase58(authority.secretKey);
  const authorityPubkey = authority.publicKey.toBase58();

  console.log("RedCircle localnet setup");
  console.log(`Authority: ${authorityPubkey}`);
  console.log(`Keypair:   ${keypairPath}`);

  const connection = new web3.Connection(localRpcUrl, "confirmed");
  await assertLocalValidator(connection);

  let programId = args.programId || getDeployProgramId() || getSdkProgramId();

  if (shouldDeploy) {
    if (!getDeployProgramId()) {
      console.log("\nNo deploy keypair found yet. Running anchor build once to create it.");
      run("anchor", ["build"], protocolDir);
    }

    programId = getDeployProgramId() || programId;
    console.log(`\nSyncing local program id: ${programId}`);
    run("anchor", ["keys", "sync"], protocolDir);
    syncSdkProgramId(programId);

    console.log("\nBuilding protocol...");
    run("anchor", ["build"], protocolDir);

    console.log("\nDeploying protocol to localnet...");
    run("anchor", ["deploy", "--provider.cluster", "localnet"], protocolDir);

    console.log("\nRebuilding protocol SDK...");
    syncSdkProgramId(programId);
    run("npm", ["run", "build", "--prefix", "sdk"], protocolDir);
  } else {
    console.log("\nSkipping Anchor deploy because --skip-deploy was provided.");
    syncSdkProgramId(programId);
    run("npm", ["run", "build", "--prefix", "sdk"], protocolDir);
  }

  await airdropIfNeeded(connection, authority.publicKey);

  const treasury = new web3.PublicKey(args.treasury || authorityPubkey);
  const curator = new web3.PublicKey(args.curator || treasury.toBase58());

  writeEnvFiles({
    authorityBase58,
    programId,
    treasury: treasury.toBase58(),
    curator: curator.toBase58(),
  });

  if (shouldInit) {
    await initializeProtocol({
      connection,
      authority,
      programId: new web3.PublicKey(programId),
      treasury,
    });
  } else {
    console.log("\nSkipping config initialization because --skip-init was provided.");
  }

  console.log("\nDone.");
  console.log("Start the app with:");
  console.log("  pnpm --filter server dev");
  console.log("  pnpm --filter web dev");
  console.log("\nThen tokenize posts from the UI against localnet.");
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

function expandHome(value) {
  return value.startsWith("~") ? path.join(os.homedir(), value.slice(1)) : value;
}

function assertFile(filePath, message) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(message);
  }
}

function assertDir(dirPath, message) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(message);
  }
}

function loadKeypair(filePath) {
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(filePath, "utf8")));
  return web3.Keypair.fromSecretKey(secret);
}

async function assertLocalValidator(connection) {
  try {
    const version = await connection.getVersion();
    console.log(`Local validator: ${version["solana-core"]}`);
  } catch {
    throw new Error(
      `No local validator found at ${localRpcUrl}. Start one first:\n  solana-test-validator --reset`
    );
  }
}

async function airdropIfNeeded(connection, pubkey) {
  const balance = await connection.getBalance(pubkey);
  if (balance >= 2 * web3.LAMPORTS_PER_SOL) {
    console.log(`\nAuthority balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);
    return;
  }

  console.log("\nAirdropping 5 local SOL to authority...");
  const signature = await connection.requestAirdrop(pubkey, 5 * web3.LAMPORTS_PER_SOL);
  const blockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...blockhash }, "confirmed");
  const nextBalance = await connection.getBalance(pubkey);
  console.log(`Authority balance: ${nextBalance / web3.LAMPORTS_PER_SOL} SOL`);
}

function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ANCHOR_PROVIDER_URL: localRpcUrl,
    },
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(" ")}`);
  }
}

function getDeployProgramId() {
  if (!fs.existsSync(deployKeypairPath)) return null;
  return loadKeypair(deployKeypairPath).publicKey.toBase58();
}

function getSdkProgramId() {
  try {
    const { PROGRAM_ID } = protocolSdk();
    return PROGRAM_ID.toBase58();
  } catch {
    return "8vdyo4hfP1ZjmnnEuGrqhHNupt2ZjZ7LmfRtU4kCXS5L";
  }
}

function syncSdkProgramId(programId) {
  replaceIfExists(path.join(protocolDir, "sdk/src/constants.ts"), [
    [
      /export const PROGRAM_ID = new PublicKey\(\s*"[^"]+"\s*\);/s,
      `export const PROGRAM_ID = new PublicKey(\n  "${programId}"\n);`,
    ],
  ]);
  replaceIfExists(path.join(protocolDir, "sdk/src/idl.ts"), [
    [/address: "[^"]+"/, `address: "${programId}"`],
  ]);
  replaceJsonAddress(path.join(protocolDir, "target/idl/redcircle_protocol.json"), programId);
}

function replaceIfExists(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, content);
}

function replaceJsonAddress(filePath, programId) {
  if (!fs.existsSync(filePath)) return;
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  json.address = programId;
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

function writeEnvFiles({ authorityBase58, programId, treasury, curator }) {
  const commonServerEnv = {
    SOLANA_RPC_URL: localRpcUrl,
    SOLANA_AUTHORITY_PRIVATE_KEY: authorityBase58,
    REDCIRCLE_PROGRAM_ID: programId,
    REDCIRCLE_TREASURY_PUBLIC_KEY: treasury,
    REDCIRCLE_DEFAULT_CURATOR_PUBLIC_KEY: curator,
    FRONTEND_URL: "http://localhost:3001",
    PORT: "3000",
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
  };

  upsertEnv(rootEnvPath, commonServerEnv, { preserveExisting: ["DATABASE_URL", "JWT_SECRET"] });
  upsertEnv(serverEnvPath, commonServerEnv, { preserveExisting: ["DATABASE_URL", "JWT_SECRET"] });
  upsertEnv(webEnvPath, {
    VITE_SOLANA_RPC_URL: localRpcUrl,
    VITE_SOLANA_NETWORK: "devnet",
    VITE_API_URL: "http://localhost:3000",
  });

  console.log("\nWrote localnet env files:");
  console.log(`  ${path.relative(repoRoot, rootEnvPath)}`);
  console.log(`  ${path.relative(repoRoot, serverEnvPath)}`);
  console.log(`  ${path.relative(repoRoot, webEnvPath)}`);

  const rootEnv = readEnv(rootEnvPath);
  if (!rootEnv.DATABASE_URL) {
    console.warn("\nDATABASE_URL is still missing. Set it before starting the server.");
  }
}

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return index === -1 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function upsertEnv(filePath, values, opts = {}) {
  const preserve = new Set(opts.preserveExisting || []);
  const existing = readEnv(filePath);
  const merged = { ...existing };
  for (const [key, value] of Object.entries(values)) {
    if (preserve.has(key) && existing[key]) continue;
    merged[key] = value;
  }

  const lines = Object.entries(merged).map(([key, value]) => `${key}=${value}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

async function initializeProtocol({ connection, authority, programId, treasury }) {
  const { RedCircleClient } = protocolSdk();
  const provider = {
    connection,
    wallet: {
      publicKey: authority.publicKey,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    },
    opts: {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    },
  };
  const client = new RedCircleClient(provider, { programId });

  try {
    const config = await client.fetchConfig();
    console.log(`\nRedCircle config already initialized: ${client.getConfigPda().toBase58()}`);
    console.log(`Admin:    ${config.admin.toBase58()}`);
    console.log(`Treasury: ${config.treasury.toBase58()}`);
    return;
  } catch {
    // Missing config account is expected on a fresh local validator.
  }

  console.log("\nInitializing RedCircle config...");
  const ix = await client.initialize(authority.publicKey, treasury);
  const tx = await client.buildTransaction(authority.publicKey, [ix], {
    computeUnitLimit: 400_000,
  });
  tx.sign([authority]);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  const blockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...blockhash }, "confirmed");
  console.log(`Initialized config: ${client.getConfigPda().toBase58()}`);
  console.log(`Signature: ${signature}`);
}

function encodeBase58(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      const value = digits[i] * 256 + carry;
      digits[i] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let output = "";
  for (const byte of bytes) {
    if (byte !== 0) break;
    output += alphabet[0];
  }
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    output += alphabet[digits[i]];
  }
  return output;
}
