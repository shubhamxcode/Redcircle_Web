import { Router } from "express";
import { RedditService } from "../services/reddit.service";
import { db } from "../db";
import * as schema from "../db";
import { eq, desc, and, gte, lte, like, or, sql } from "drizzle-orm";

const { posts } = schema;
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

    // Check if post is already tokenized
    const existingPost = await db
      .select()
      .from(posts)
      .where(eq(posts.redditPostId, redditPost.id))
      .limit(1);

    if (existingPost.length > 0) {
      return res.status(409).json({ 
        error: "This post has already been tokenized",
        existingPost: existingPost[0]
      });
    }

    // Return post data for preview
    res.json({
      success: true,
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
      error: error instanceof Error ? error.message : "Failed to fetch Reddit post" 
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
    const conditions = [];
    
    // Status filter
    if (status && status !== "all") {
      conditions.push(eq(posts.status, status as string));
    }
    
    // Subreddit exact match
    if (subreddit) {
      conditions.push(eq(posts.subreddit, subreddit as string));
    }
    
    // Author exact match
    if (author) {
      conditions.push(eq(posts.author, author as string));
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
      sortBy = "tokenizedAt" // tokenizedAt, upvotes, marketCap, totalVolume
    } = req.query;

    console.log(`📋 Fetching posts: status=${status}, limit=${limit}, offset=${offset}`);

    // Build query based on filters
    const baseQuery = db.select().from(posts);
    
    // Apply filters
    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(posts.status, status));
    }
    if (subreddit) {
      conditions.push(eq(posts.subreddit, subreddit as string));
    }

    // Determine sort column
    let orderColumn;
    switch (sortBy) {
      case "upvotes":
        orderColumn = desc(posts.upvotes);
        break;
      case "marketCap":
        orderColumn = desc(posts.marketCap);
        break;
      case "totalVolume":
        orderColumn = desc(posts.totalVolume);
        break;
      default:
        orderColumn = desc(posts.tokenizedAt);
    }

    // Execute query with all filters
    const postsList = await (conditions.length > 0
      ? baseQuery.where(conditions[0]).orderBy(orderColumn)
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

export default router;
