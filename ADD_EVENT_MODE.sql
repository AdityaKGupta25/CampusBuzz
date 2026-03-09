-- Migration: Event Type Differentiation (Competition vs Experience)
-- Distinguishes between competitive hackathons and informative experience shows (concerts, lectures, etc)

-- 1. Add the is_competition column
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_competition BOOLEAN DEFAULT true;

-- 2. Update existing sub-events to be competitions by default if they were created before this migration
-- (This is handled by the DEFAULT clause, but being explicit for clarity)
UPDATE events SET is_competition = true WHERE is_competition IS NULL;

-- 3. Add a check constraint to ensure only sub-events or appropriate top-level events can toggle this 
-- (Optional: Fests are always collections of competitions/experiences, but sub-events must choose)
-- For now we allow it for all to keep it flexible.
