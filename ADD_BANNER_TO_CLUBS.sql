-- Add missing columns for clubs UI
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;
