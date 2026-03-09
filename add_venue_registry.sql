-- ============================================================
-- Migration: Enhanced Venue Registry with Multi-Tenancy
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add missing columns to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_type     TEXT; -- e.g., 'Auditorium', 'Lab', 'Ground'
ALTER TABLE venues ADD COLUMN IF NOT EXISTS location_type  TEXT; -- e.g., 'Indoor', 'Outdoor'
ALTER TABLE venues ADD COLUMN IF NOT EXISTS amenities      TEXT[] DEFAULT '{}';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS photo_url      TEXT;

-- 2. Index for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_venues_institution_id ON venues(institution_id);

-- 3. Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies if any
DROP POLICY IF EXISTS "venues_tenant_select" ON venues;
DROP POLICY IF EXISTS "venues_tenant_manage" ON venues;

-- 5. Create new policies

-- SELECT: All authenticated users in the same institution can view venues
CREATE POLICY "venues_tenant_select"
ON venues FOR SELECT
USING (institution_id = get_my_institution_id());

-- INSERT/UPDATE/DELETE: Restricted to Admins and HODs of the same institution
CREATE POLICY "venues_tenant_manage"
ON venues FOR ALL
TO authenticated
USING (
    institution_id = get_my_institution_id() 
    AND (EXISTS (
        SELECT 1 FROM users 
        WHERE auth_uid = auth.uid() 
        AND role IN ('admin', 'hod')
    ))
)
WITH CHECK (
    institution_id = get_my_institution_id()
    AND (EXISTS (
        SELECT 1 FROM users 
        WHERE auth_uid = auth.uid() 
        AND role IN ('admin', 'hod')
    ))
);

-- 6. Storage Bucket for Venue Photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-photos', 'venue-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Venue Photos Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'venue-photos');

CREATE POLICY "Venue Photos Faculty Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'venue-photos');

CREATE POLICY "Venue Photos Faculty Management"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'venue-photos')
WITH CHECK (bucket_id = 'venue-photos');
