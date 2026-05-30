/**
 * Reddit API Service
 * Fetches Reddit post data using Reddit's OAuth API
 */

export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  thumbnail: string | null;
  selftext: string; // Post body/content
  upvotes: number;
  num_comments: number;
  created_utc: number;
  is_video: boolean;
  post_hint?: string;
  preview?: {
    images?: Array<{
      source: {
        url: string;
        width: number;
        height: number;
      };
    }>;
  };
}

export interface TrendingRedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  redditUrl: string;
  thumbnail: string | null;
  upvotes: number;
  numComments: number;
  createdUtc: number;
}

export interface RedditApiResponse {
  kind: string;
  data: {
    children: Array<{
      kind: string;
      data: any;
    }>;
  };
}

export class RedditService {
  private static readonly BASE_URL = "https://www.reddit.com";
  private static readonly OAUTH_BASE_URL = "https://oauth.reddit.com";
  private static readonly USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  
  // OAuth credentials from environment
  private static readonly CLIENT_ID = process.env.REDDIT_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
  
  // Cache for OAuth token
  private static accessToken: string | null = null;
  private static tokenExpiry: number = 0;

  /**
   * Get OAuth access token (application-only)
   */
  private static async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      console.warn("⚠️ Reddit OAuth credentials not configured, falling back to public API");
      return "";
    }

    try {
      const auth = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64');
      
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.USER_AGENT,
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`OAuth token request failed: ${response.status}`);
      }

      const data = (await response.json()) as { access_token: string };
      this.accessToken = data.access_token;
      // Set expiry to 50 minutes (tokens last 1 hour, but refresh earlier)
      this.tokenExpiry = Date.now() + (50 * 60 * 1000);
      
      console.log("✅ Reddit OAuth token acquired");
      return this.accessToken as string;
    } catch (error) {
      console.error("❌ Failed to get Reddit OAuth token:", error);
      return "";
    }
  }

  /**
   * Extract Reddit post ID from various URL formats
   */
  static extractPostId(url: string): string | null {
    const patterns = [
      /reddit\.com\/r\/[^/]+\/comments\/([a-z0-9]+)/i,
      /redd\.it\/([a-z0-9]+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1] || null;
    }

    return null;
  }

  // Resolve Reddit share links (reddit.com/r/sub/s/XXXX) to the full post URL
  static async resolveShareUrl(url: string): Promise<string> {
    if (!/reddit\.com\/r\/[^/]+\/s\//i.test(url)) return url;
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: { "User-Agent": this.USER_AGENT },
      });
      return res.url || url;
    } catch {
      return url;
    }
  }

  /**
   * Build Reddit JSON API URL from post ID
   */
  static buildApiUrl(postId: string): string | null {
    // Reddit's JSON API: Add .json to any URL
    return `${this.BASE_URL}/comments/${postId}.json`;
  }

  /**
   * Fetch post data from Reddit
   */
  static async fetchPost(url: string): Promise<RedditPost> {
    const resolvedUrl = await this.resolveShareUrl(url);
    const postId = this.extractPostId(resolvedUrl);

    if (!postId) {
      throw new Error("Invalid Reddit URL. Please provide a valid Reddit post URL.");
    }

    console.log(`🔍 Fetching Reddit post: ${postId}`);

    try {
      // Try OAuth first if credentials are available
      const accessToken = await this.getAccessToken();
      
      let response;
      let apiUrl;
      
      if (accessToken) {
        // Use OAuth endpoint
        apiUrl = `${this.OAUTH_BASE_URL}/comments/${postId}`;
        console.log(`🔐 Using OAuth API: ${apiUrl}`);
        
        response = await fetch(apiUrl, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "User-Agent": this.USER_AGENT,
          },
        });
      } else {
        // Fallback to public JSON API
        apiUrl = `${this.BASE_URL}/comments/${postId}.json`;
        console.log(`🌐 Using public API: ${apiUrl}`);
        
        response = await fetch(apiUrl, {
          headers: {
            "User-Agent": this.USER_AGENT,
          },
        });
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Reddit post not found. Please check the URL.");
        }
        if (response.status === 403) {
          throw new Error("Access forbidden. Reddit may be blocking requests from this server. Please configure Reddit OAuth credentials.");
        }
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as RedditApiResponse[];

      // Reddit returns an array: [post_data, comments_data]
      if (!data || data.length === 0 || !data[0]?.data?.children?.[0]) {
        throw new Error("Invalid response from Reddit API.");
      }

      const postData = data[0].data.children[0].data;

      // Enhanced Thumbnail Extraction Strategy
      let thumbnail: string | null = null;
      
      // 1. Check for high-quality preview images first (usually better than thumbnails)
      if (postData.preview?.images?.[0]?.source?.url) {
        thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
      } 
      // 2. Check the "url" field if it's a direct link to an image
      else if (postData.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(postData.url)) {
        thumbnail = postData.url;
      }
      // 3. Handle reddit galleries (use the first image)
      else if (postData.is_gallery && postData.media_metadata) {
        const firstEntry: any = Object.values(postData.media_metadata)[0];
        if (firstEntry?.s?.u) {
          thumbnail = firstEntry.s.u.replace(/&amp;/g, "&");
        }
      }
      // 4. Fallback to the standard thumbnail field if it's a valid URL
      else if (postData.thumbnail && /^http/i.test(postData.thumbnail)) {
        thumbnail = postData.thumbnail;
      }
      // 5. Check media/secure_media for video thumbnails
      else if (postData.secure_media?.oembed?.thumbnail_url) {
        thumbnail = postData.secure_media.oembed.thumbnail_url;
      }
      
      // Final fallback to Reddit logo if still no image found
      if (!thumbnail) {
        thumbnail = "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png";
      }

      const post: RedditPost = {
        id: postData.id,
        title: postData.title,
        author: postData.author,
        subreddit: postData.subreddit,
        url: `https://reddit.com${postData.permalink}`,
        permalink: postData.permalink,
        thumbnail,
        selftext: postData.selftext || "",
        upvotes: postData.ups || 0,
        num_comments: postData.num_comments || 0,
        created_utc: postData.created_utc,
        is_video: postData.is_video || false,
        post_hint: (postData.post_hint as string) || undefined,
        preview: postData.preview as RedditPost["preview"],
      };

      console.log(`✅ Reddit post fetched: "${post.title}" by u/${post.author}`);
      
      return post;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error fetching Reddit post:`, error.message);
        throw error;
      }
      console.error(`❌ Unknown error fetching Reddit post:`, error);
      throw new Error("Failed to fetch Reddit post. Please try again.");
    }
  }

  /**
   * Get post age in human-readable format
   */
  static getPostAge(createdUtc: number): string {
    const now = Date.now() / 1000;
    const diffSeconds = now - createdUtc;
    
    const minutes = Math.floor(diffSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }

  /**
   * Fetch hot/trending posts from a given subreddit listing
   */
  static async fetchHotPosts(subreddit = "popular", limit = 25): Promise<TrendingRedditPost[]> {
    const accessToken = await this.getAccessToken();

    let response;
    if (accessToken) {
      response = await fetch(
        `${this.OAUTH_BASE_URL}/r/${subreddit}/hot?limit=${limit}&raw_json=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": this.USER_AGENT,
          },
        },
      );
    } else {
      response = await fetch(
        `${this.BASE_URL}/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`,
        { headers: { "User-Agent": this.USER_AGENT } },
      );
    }

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data: { children: Array<{ data: Record<string, any> }> };
    };

    return data.data.children.map(({ data: p }) => {
      let thumbnail: string | null = null;
      if (p.preview?.images?.[0]?.source?.url) {
        thumbnail = p.preview.images[0].source.url.replace(/&amp;/g, "&");
      } else if (p.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(p.url)) {
        thumbnail = p.url;
      } else if (p.thumbnail && /^https?:/i.test(p.thumbnail)) {
        thumbnail = p.thumbnail;
      }

      return {
        id: p.id as string,
        title: p.title as string,
        author: p.author as string,
        subreddit: p.subreddit as string,
        redditUrl: `https://reddit.com${p.permalink as string}`,
        thumbnail,
        upvotes: (p.ups as number) || 0,
        numComments: (p.num_comments as number) || 0,
        createdUtc: p.created_utc as number,
      };
    });
  }

  /**
   * Validate if a post is suitable for tokenization
   */
  static validatePost(post: RedditPost): { valid: boolean; reason?: string } {
    // Check if post is deleted or removed
    if (post.author === "[deleted]" || post.author === "[removed]") {
      return { valid: false, reason: "This post has been deleted or removed." };
    }

    // Check if post is too old (optional: e.g., older than 1 year)
    const postAgeMonths = (Date.now() / 1000 - post.created_utc) / (30 * 24 * 60 * 60);
    if (postAgeMonths > 12) {
      return { valid: false, reason: "Post is too old. Please tokenize posts less than 1 year old." };
    }

    return { valid: true };
  }
}

