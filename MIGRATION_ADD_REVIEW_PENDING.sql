-- Migration: Add 'review_pending' to event_status enum
-- Date: 2026-03-08

-- Note: In Postgres, you can't add to an enum within a transaction (sometimes)
-- and you can't DROP/CREATE easily if it's used in many tables.
-- The safest way for most environments is ALTER TYPE.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'event_status' 
        AND e.enumlabel = 'review_pending'
    ) THEN
        ALTER TYPE event_status ADD VALUE 'review_pending' AFTER 'revision_required';
    END IF;
END $$;

-- Also update policies to allow editing in 'review_pending' for faculty
-- and ensure notifications table has the status if needed (though it uses TEXT usually)
