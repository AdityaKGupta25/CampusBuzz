-- Migration: Add archive request columns to events
-- PURPOSE: Allow HODs to nudge faculty to archive completed events.

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS archive_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archive_request_note TEXT;

COMMENT ON COLUMN events.archive_requested IS 'Flag set by HOD to nudge faculty to lock/archive a completed event.';
COMMENT ON COLUMN events.archive_request_note IS 'Optional message from HOD explaining why archiving is requested.';
