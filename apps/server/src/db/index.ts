import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ?? "";

// Neon and Supabase poolers both require TLS; only local Postgres doesn't.
// Disable SSL only for localhost-style connections, otherwise enable it.
const isLocal = /@(localhost|127\.0\.0\.1|::1|host\.docker\.internal)(:|\/)/i.test(
  connectionString,
);
const sslDisabled = /\bsslmode=disable\b/i.test(connectionString);
const requiresSsl = !isLocal && !sslDisabled;

const pool = new Pool({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool);

// Export all schemas
export * from "./schema/users";
export * from "./schema/posts";
export * from "./schema/holdings";
export * from "./schema/transactions";
export * from "./schema/price-history";
export * from "./schema/waitlist";
export * from "./schema/launches";
