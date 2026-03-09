-- ── Migration: Submissions Expansion & Storage ──────────────────────────────────
-- 1. Extend submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 2. Create the 'event-submissions' bucket for student submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-submissions', 'event-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Public Access (For faculty/staff to view/download)
CREATE POLICY "Submissions Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-submissions');

-- Allow Students to Upload (Authenticated users)
CREATE POLICY "Student Submissions Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-submissions');

-- Allow Students to Manage their own submissions
CREATE POLICY "Student Submissions Management"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'event-submissions')
WITH CHECK (bucket_id = 'event-submissions');

-- 3. Update RLS on submissions table (ensure students can also insert)
CREATE POLICY "submissions_insert_student"
    ON submissions FOR INSERT
    WITH CHECK (
        student_id = current_user_id()
    );

-- Allow students to update their own pending submissions
CREATE POLICY "submissions_update_student"
    ON submissions FOR UPDATE
    USING (
        student_id = current_user_id()
        AND status = 'pending'
    );
