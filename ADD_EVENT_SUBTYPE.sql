
-- Migration: Add event_subtype and has_tracks to events table
-- Redsigning Event Architecture

ALTER TABLE events 
    ADD COLUMN IF NOT EXISTS event_subtype TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS has_tracks BOOLEAN DEFAULT FALSE;

-- Update event_type constraint if it exists
-- Checking if event_type is an enum or text
-- In schema.sql it wasn't defined in the table but used in code.
-- Let's check if there is an event_type column and what its type is.
