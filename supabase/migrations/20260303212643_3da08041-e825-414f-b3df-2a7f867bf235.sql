ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS primary_path text;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS primary_offer text;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS source text DEFAULT 'local';