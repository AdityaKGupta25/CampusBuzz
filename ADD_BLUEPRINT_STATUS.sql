-- ── Migration: Add review_pending_blueprint to event_status enum ──
-- PURPOSE: Support the new student blueprint editing flow.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'event_status' AND e.enumlabel = 'review_pending_blueprint'
    ) THEN
        ALTER TYPE event_status ADD VALUE 'review_pending_blueprint';
    END IF;
END $$;
