-- ── Migration: Add Registration Window To Events ──────────────────
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS reg_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reg_end_time TIMESTAMPTZ;

-- Comment for clarity
COMMENT ON COLUMN events.reg_start_time IS 'When students can start registering for the event';
COMMENT ON COLUMN events.reg_end_time IS 'When registration closes (must be before event start_time)';
