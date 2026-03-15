-- Add profile columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT;

COMMENT ON COLUMN users.avatar_url IS 'Public URL of the user profile picture.';
COMMENT ON COLUMN users.bio IS 'A short professional biography.';
COMMENT ON COLUMN users.social_links IS 'Social media links (JSON mapping).';
COMMENT ON COLUMN users.employee_id IS 'Official institutional identifier (Faculty/Staff only).';
