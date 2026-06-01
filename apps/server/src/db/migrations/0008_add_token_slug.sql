-- Add tokenSlug to launches and posts for unique, collision-safe token URLs
ALTER TABLE "launches"
  ADD COLUMN IF NOT EXISTS "token_slug" text;

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "token_slug" text;

CREATE UNIQUE INDEX IF NOT EXISTS "posts_token_slug_idx" ON "posts" ("token_slug");
