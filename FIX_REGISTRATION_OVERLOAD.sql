-- ─── FIX: REMOVE OVERLOADED REGISTRATION FUNCTION ───
-- The database has two versions of student_register_event, which is confusing Supabase.

-- 1. Drop the old 2-argument version
DROP FUNCTION IF EXISTS public.student_register_event(UUID, UUID);

-- 2. Ensure the 3-argument version is correctly defined (as per add_teams_and_registration_rpc.sql)
-- Note: It already has 'DEFAULT NULL' for p_team_name, so it handles both 2 and 3 argument calls correctly.
