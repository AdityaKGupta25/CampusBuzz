-- FIX: Adding Prize Metadata for Experience Mode & Competition Tiers
-- This adds the necessary columns to the event_prizes table to support refactored PrizeModal.

ALTER TABLE event_prizes ADD COLUMN IF NOT EXISTS rank TEXT;
ALTER TABLE event_prizes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE event_prizes ADD COLUMN IF NOT EXISTS is_perk BOOLEAN DEFAULT FALSE;

-- Optional: Update existing prizes to be marked as competition prizes if not already specified
-- UPDATE event_prizes SET rank = '1st' WHERE position = 1 AND rank IS NULL;
-- UPDATE event_prizes SET rank = '2nd' WHERE position = 2 AND rank IS NULL;
-- UPDATE event_prizes SET rank = '3rd' WHERE position = 3 AND rank IS NULL;
