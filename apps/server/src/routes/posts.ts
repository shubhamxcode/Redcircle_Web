import { Router } from "express";
import { RedditService } from "../services/reddit.service";
import { db } from "../db";
import * as schema from "../db";
import { eq, desc, asc, and, gte, ilike, inArray } from "drizzle-orm";
import { getEarnings } from "../services/orynth.service";

const { posts, launches } = schema;
const router = Router();

/**
 * POST /api/posts/fetch-reddit
 * Fetch Reddit post details (preview before tokenization)
 */
router.post("/fetch-reddit", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Reddit URL is required" });
    }

    console.log(`📥 Fetch request for URL: ${url}`);

    // Fetch post from Reddit
    const redditPost = await RedditService.fetchPost(url);

    // Validate post
    const validation = RedditService.validatePost(redditPost);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: validation.reason || "Post is not valid for tokenization" 
      });
    }

    // Fallback values
    let suggestedName        = redditPost.title.split(" ").slice(0, 3).join(" ").slice(0, 32);
    let suggestedSymbol      = redditPost.subreddit.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    let suggestedDescription = "";
    let suggestedBy          = "fallback";

    // Run DB duplicate check and Gemini in parallel
    const geminiKey = process.env.GEMINI_API_KEY;
    const hasText   = !!redditPost.selftext?.trim();
    const hasImage  = !!redditPost.thumbnail?.startsWith("https://");

    const [existingPosts] = await Promise.all([
      db.select().from(posts).where(eq(posts.redditPostId, redditPost.id)).limit(1),
      (async () => {
        if (!geminiKey || (!hasText && !hasImage)) return;
        try {
          const prompt = `You are a crypto memecoin naming expert. Create a viral, punchy Solana token name, ticker, and trading pitch for this Reddit post.

Rules:
- name: max 32 chars, short and catchy (2-3 words max), memecoin energy, captures the vibe/joke/theme
- symbol: max 8 chars, uppercase, no spaces, memorable (like DOGE, PEPE, SHIB, WIF)
- description: answer "why should people trade this token?" in 1-2 punchy sentences — make it hype, fun, and reference the post's theme. Write it like a memecoin pitch, first person plural ("we", "this token")
- Do NOT just copy the title words for the name — be creative, funny, or clever
${hasImage ? "- Use the thumbnail image to understand the visual vibe of the post" : ""}

Post title: "${redditPost.title}"
Subreddit: r/${redditPost.subreddit}
Upvotes: ${redditPost.upvotes}
${hasText ? `Content: "${redditPost.selftext.slice(0, 300)}"` : ""}

Reply with ONLY a JSON object, no markdown:
{"name":"<name>","symbol":"<SYMBOL>","description":"<trading pitch>"}`;

          // Fetch image and call Gemini in parallel
          const [imageBase64] = await Promise.all([
            hasImage
              ? fetch(redditPost.thumbnail!, { signal: AbortSignal.timeout(5000) })
                  .then(r => r.arrayBuffer())
                  .then(buf => Buffer.from(buf).toString("base64"))
                  .catch(() => null)
              : Promise.resolve(null),
          ]);

          const parts: any[] = [{ text: prompt }];
          if (imageBase64) parts.push({ inline_data: { mime_type: "image/jpeg", data: imageBase64 } });

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts }] }),
              signal: AbortSignal.timeout(15000),
            }
          );
          const geminiData = await geminiRes.json() as any;
          const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.name)        suggestedName        = String(parsed.name).slice(0, 32);
            if (parsed.symbol)      suggestedSymbol      = String(parsed.symbol).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
            if (parsed.description) suggestedDescription = String(parsed.description).slice(0, 300);
            suggestedBy = "gemini";
          }
        } catch (e) {
          console.warn("⚠️ Gemini failed, using fallback:", e);
        }
      })(),
    ]);

    if (existingPosts.length > 0) {
      return res.status(409).json({
        error: "This post has already been tokenized",
        existingPost: existingPosts[0],
      });
    }

    res.json({
      success: true,
      suggestedName,
      suggestedSymbol,
      suggestedDescription,
      suggestedBy,
      post: {
        redditPostId: redditPost.id,
        title: redditPost.title,
        author: redditPost.author,
        subreddit: redditPost.subreddit,
        url: redditPost.url,
        thumbnail: redditPost.thumbnail,
        content: redditPost.selftext,
        upvotes: redditPost.upvotes,
        comments: redditPost.num_comments,
        createdAt: new Date(redditPost.created_utc * 1000).toISOString(),
        age: RedditService.getPostAge(redditPost.created_utc),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching Reddit post:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch Reddit post",
    });
  }
});

/**
 * GET /api/posts/search
 * Advanced search with multiple filters
 * Query params:
 *   - q: search query (title, author, subreddit)
 *   - subreddit: filter by subreddit
 *   - author: filter by author
 *   - minPrice: minimum current price
 *   - maxPrice: maximum current price
 *   - minVolume: minimum 24h volume
 *   - minMarketCap: minimum market cap
 *   - tags: comma-separated tags
 *   - status: post status (default: active)
 *   - sortBy: sort field (trending, new, price, volume, marketCap)
 *   - limit: results per page (default: 20)
 *   - offset: pagination offset (default: 0)
 */
router.get("/search", async (req, res) => {
  try {
    const {
      q,
      subreddit,
      author,
      minPrice,
      maxPrice,
      minVolume,
      minMarketCap,
      tags,
      status = "active",
      sortBy = "trending",
      limit = 20,
      offset = 0,
    } = req.query;

    console.log(`🔍 Search request:`, { q, subreddit, author, sortBy });

    // Fetch all posts first (we'll filter in JS for flexibility)
    let query = db.select().from(posts);
    
    // Build conditions array
    const conditions: any[] = [];
    
    // Status filter
    if (status && status !== "all") {
      conditions.push(eq(posts.status, status as string));
    }
    
    // Subreddit — case-insensitive partial match
    if (subreddit) {
      conditions.push(ilike(posts.subreddit, `%${subreddit}%`));
    }

    // Author — case-insensitive partial match
    if (author) {
      conditions.push(ilike(posts.author, `%${author}%`));
    }

    // Execute base query with conditions
    let allPosts = await (conditions.length > 0
      ? query.where(and(...conditions))
      : query
    );

    // Filter by search query (title, subreddit, author)
    if (q && typeof q === "string" && q.trim()) {
      const searchTerm = q.toLowerCase().trim();
      allPosts = allPosts.filter(post => 
        post.title.toLowerCase().includes(searchTerm) ||
        post.subreddit?.toLowerCase().includes(searchTerm) ||
        post.author?.toLowerCase().includes(searchTerm) ||
        post.tokenSymbol?.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by price range
    if (minPrice) {
      const min = parseFloat(minPrice as string);
      allPosts = allPosts.filter(post => 
        post.currentPrice && parseFloat(post.currentPrice) >= min
      );
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      allPosts = allPosts.filter(post => 
        post.currentPrice && parseFloat(post.currentPrice) <= max
      );
    }

    // Filter by volume
    if (minVolume) {
      const min = parseFloat(minVolume as string);
      allPosts = allPosts.filter(post => 
        post.totalVolume && parseFloat(post.totalVolume) >= min
      );
    }

    // Filter by market cap
    if (minMarketCap) {
      const min = parseFloat(minMarketCap as string);
      allPosts = allPosts.filter(post => 
        post.marketCap && parseFloat(post.marketCap) >= min
      );
    }

    // Filter by tags
    if (tags && typeof tags === "string") {
      const tagList = tags.split(",").map(t => t.trim().toLowerCase());
      allPosts = allPosts.filter(post => {
        if (!post.tags || post.tags.length === 0) return false;
        const postTags = post.tags.map(t => t.toLowerCase());
        return tagList.some(tag => postTags.includes(tag));
      });
    }

    // Sort results
    switch (sortBy) {
      case "new":
        allPosts.sort((a, b) => 
          new Date(b.tokenizedAt).getTime() - new Date(a.tokenizedAt).getTime()
        );
        break;
      case "price":
        allPosts.sort((a, b) => 
          parseFloat(b.currentPrice || "0") - parseFloat(a.currentPrice || "0")
        );
        break;
      case "volume":
        allPosts.sort((a, b) => 
          parseFloat(b.totalVolume || "0") - parseFloat(a.totalVolume || "0")
        );
        break;
      case "marketCap":
        allPosts.sort((a, b) => 
          parseFloat(b.marketCap || "0") - parseFloat(a.marketCap || "0")
        );
        break;
      case "trending":
      default:
        // Trending = combination of volume, upvotes, and recency
        allPosts.sort((a, b) => {
          const scoreA = (parseFloat(a.totalVolume || "0") * 10) + (a.upvotes || 0) + (a.featured || 0) * 1000;
          const scoreB = (parseFloat(b.totalVolume || "0") * 10) + (b.upvotes || 0) + (b.featured || 0) * 1000;
          return scoreB - scoreA;
        });
    }

    // Paginate
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const totalResults = allPosts.length;
    const paginatedPosts = allPosts.slice(offsetNum, offsetNum + limitNum);
    const hasMore = offsetNum + limitNum < totalResults;

    return res.json({
      success: true,
      posts: paginatedPosts,
      count: paginatedPosts.length,
      totalResults,
      hasMore,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        nextOffset: offsetNum + paginatedPosts.length,
      },
      filters: {
        q,
        subreddit,
        author,
        minPrice,
        maxPrice,
        minVolume,
        minMarketCap,
        tags,
        status,
        sortBy,
      },
    });
  } catch (error) {
    console.error("❌ Error searching posts:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to search posts",
    });
  }
});

/**
 * GET /api/posts
 * List all tokenized posts (for feed)
 */
router.get("/", async (req, res) => {
  try {
    const {
      status = "active",
      limit = 50,
      offset = 0,
      subreddit,
      sortBy = "tokenizedAt", // tokenizedAt, upvotes, marketCap, totalVolume, currentPrice
      order = "desc",         // asc | desc
      since,                  // "1h" | "4h" | "24h" | "7d" | "30d"
    } = req.query;

    console.log(`📋 Fetching posts: status=${status}, limit=${limit}, offset=${offset}, sortBy=${sortBy}, order=${order}, since=${since}`);

    const dir = (col: any) => order === "asc" ? asc(col) : desc(col);

    // Build query based on filters
    const baseQuery = db.select().from(posts);

    // Apply filters
    const conditions: any[] = [];
    if (status && status !== "all") {
      conditions.push(eq(posts.status, status));
    }
    if (subreddit) {
      conditions.push(ilike(posts.subreddit, `%${subreddit}%`));
    }

    // Time window filter on tokenizedAt
    if (since && typeof since === "string") {
      const units: Record<string, number> = { "1h": 1, "4h": 4, "24h": 24, "7d": 168, "30d": 720 };
      const hours = units[since];
      if (hours) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        conditions.push(gte(posts.tokenizedAt, cutoff));
      }
    }

    // Determine sort column
    let orderColumn;
    switch (sortBy) {
      case "upvotes":
        orderColumn = dir(posts.upvotes);
        break;
      case "marketCap":
        orderColumn = dir(posts.marketCap);
        break;
      case "totalVolume":
        orderColumn = dir(posts.totalVolume);
        break;
      case "currentPrice":
        orderColumn = dir(posts.currentPrice);
        break;
      default:
        orderColumn = dir(posts.tokenizedAt);
    }

    // Execute query with all filters
    const postsList = await (conditions.length > 0
      ? baseQuery.where(and(...conditions)).orderBy(orderColumn)
      : baseQuery.orderBy(orderColumn)
    )
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Check if there are more posts by fetching one extra
    const hasMore = postsList.length === parseInt(limit as string);

    res.json({
      success: true,
      posts: postsList,
      count: postsList.length,
      hasMore,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        nextOffset: parseInt(offset as string) + postsList.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching posts:", error);
    res.status(500).json({ 
      error: "Failed to fetch posts" 
    });
  }
});

/**
 * GET /api/posts/:id
 * Get single post details
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("❌ Error fetching post:", error);
    res.status(500).json({ 
      error: "Failed to fetch post" 
    });
  }
});

/**
 * GET /api/posts/:id/creator-earnings
 * Returns the creator's USDC earnings for the token associated with this post.
 * Creator share = 50% of the partner bucket (67/134 bps).
 */
router.get("/:id/creator-earnings", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the confirmed launch for this post (by postId or redditPostId)
    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });

    // Look up the launch by mint address or reddit post id
    const [launch] = await db
      .select({
        poolAddress:   launches.poolAddress,
        creatorFeeBps: launches.creatorFeeBps,
        partnerFeeBps: launches.partnerFeeBps,
      })
      .from(launches)
      .where(
        and(
          eq(launches.status, "confirmed"),
          eq(launches.sourceId, post.redditPostId),
        ),
      )
      .limit(1);

    if (!launch?.poolAddress) {
      return res.json({ success: true, earningsUsdc: "0", poolAddress: null });
    }

    const earningsRes = await getEarnings([launch.poolAddress]);
    const earning     = earningsRes.earnings?.[0];

    if (!earning) {
      return res.json({ success: true, earningsUsdc: "0", poolAddress: launch.poolAddress });
    }

    const totalUsdc  = parseFloat(earning.claimedUsdc ?? "0") + parseFloat(earning.claimableUsdc ?? "0");
    const creatorBps = launch.creatorFeeBps ?? 67;
    const partnerBps = launch.partnerFeeBps ?? 134;
    const share      = partnerBps > 0 ? creatorBps / partnerBps : 0.5;
    const creatorUsdc = totalUsdc * share;

    return res.json({
      success:      true,
      earningsUsdc: creatorUsdc.toFixed(4),
      poolAddress:  launch.poolAddress,
    });
  } catch (err) {
    console.error("❌ Error fetching creator earnings:", err);
    res.status(500).json({ success: false, error: "Failed to fetch creator earnings" });
  }
});

/**
 * POST /api/posts/check-tokenized
 * Given a list of Reddit post IDs, returns which ones have been tokenized on the platform.
 */
router.post("/check-tokenized", async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ tokenized: {} });

    const rows = await db
      .select({
        redditPostId: posts.redditPostId,
        id: posts.id,
        tokenSymbol: posts.tokenSymbol,
        tokenMintAddress: posts.tokenMintAddress,
        status: posts.status,
      })
      .from(posts)
      .where(inArray(posts.redditPostId, ids));

    const tokenized: Record<string, { postId: string; tokenSymbol: string | null; mintAddress: string | null; status: string }> = {};
    for (const row of rows) {
      tokenized[row.redditPostId] = {
        postId: row.id,
        tokenSymbol: row.tokenSymbol,
        mintAddress: row.tokenMintAddress,
        status: row.status,
      };
    }

    res.json({ tokenized });
  } catch (err) {
    console.error("❌ Error checking tokenized posts:", err);
    res.status(500).json({ tokenized: {} });
  }
});

export default router;
