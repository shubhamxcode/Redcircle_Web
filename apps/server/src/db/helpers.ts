import { eq, and, or, like } from "drizzle-orm";
import { db } from "./index";
import { posts } from "./index";

/**
 * Resolves a token/post by multiple ID formats:
 *   1. Exact tokenSlug  (e.g. "breast-9548a7")
 *   2. Legacy format    (e.g. "BREAST-66Bk71") — symbol + 6-char mint prefix
 *   3. UUID / exact mint address / exact symbol
 *
 * Uses strict equality / case-sensitive LIKE — never ilike on mint addresses,
 * since mint addresses are case-sensitive base58 and financial endpoints must
 * not match ambiguous prefixes.
 */
export async function resolvePostById(tokenId: string) {
  // 1. Exact slug match
  const [bySlug] = await db
    .select()
    .from(posts)
    .where(eq(posts.tokenSlug, tokenId))
    .limit(1);
  if (bySlug) return bySlug;

  // 2. Legacy {SYMBOL}-{6charMintPrefix} format
  const dash = tokenId.lastIndexOf("-");
  if (dash > 0) {
    const sym       = tokenId.slice(0, dash).toUpperCase();
    const shortMint = tokenId.slice(dash + 1);
    if (shortMint.length === 6) {
      const [byLegacy] = await db
        .select()
        .from(posts)
        .where(
          and(
            like(posts.tokenSymbol,      sym),
            like(posts.tokenMintAddress, `${shortMint}%`),
          ),
        )
        .limit(1);
      if (byLegacy) return byLegacy;
    }
  }

  // 3. UUID / exact mint address / exact symbol
  const [byOther] = await db
    .select()
    .from(posts)
    .where(
      or(
        eq(posts.id,               tokenId),
        eq(posts.tokenMintAddress, tokenId),
        eq(posts.tokenSymbol,      tokenId.toUpperCase()),
      ),
    )
    .limit(1);
  return byOther ?? null;
}
