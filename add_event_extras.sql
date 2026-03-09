-- ─── Migration: Add FAQs, Sponsors & Resource Links to events ──────────────────
-- Run this in Supabase SQL Editor (safe to re-run)

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS faqs           JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS sponsors       JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS resource_links JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('faqs', 'sponsors', 'resource_links');
