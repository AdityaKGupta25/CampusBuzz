-- Migration to add Participation Tracks and Rulebook URL to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS participation_tracks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rulebook_url TEXT;

-- Update existing records to have empty tracks if null
UPDATE events SET participation_tracks = '[]'::jsonb WHERE participation_tracks IS NULL;
