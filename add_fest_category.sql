
-- Migration: Add fest_category to events table
-- This allows grouping sub-events into specific categories (e.g. Robotics, Coding) within a domain.

ALTER TABLE events ADD COLUMN IF NOT EXISTS fest_category TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'fest_category';
