-- ── Migration: Universal Event Rounds (V4 - TOTAL RESET) ───────────

-- 1. FORCE UNLOCK: Remove all old restrictions first
ALTER TABLE event_rounds DROP CONSTRAINT IF EXISTS event_rounds_type_check;
ALTER TABLE event_rounds DROP CONSTRAINT IF EXISTS chk_round_type;

-- 2. Ensure the 'phase' column exists
ALTER TABLE event_rounds ADD COLUMN IF NOT EXISTS phase TEXT;

-- 3. Standardize all old data to the new formats
UPDATE event_rounds SET type = 'online_test' WHERE type = 'quiz';
UPDATE event_rounds SET type = 'in_person' WHERE type = 'offline';
UPDATE event_rounds SET type = 'submission' WHERE type NOT IN ('online_test', 'in_person', 'virtual_meet', 'submission');

-- 4. Apply the NEW universal valid list
ALTER TABLE event_rounds ADD CONSTRAINT chk_round_type 
CHECK (type IN ('online_test', 'submission', 'in_person', 'virtual_meet'));

-- 5. Auto-label existing rounds
UPDATE event_rounds SET phase = 'Screening' WHERE phase IS NULL AND round_number = 1;
UPDATE event_rounds SET phase = 'Qualifier' WHERE phase IS NULL AND round_number > 1;
