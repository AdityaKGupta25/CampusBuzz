-- Migration: Fix Row Level Security for Institutions table
-- Purpose: Allow institution members to read branding and Admins to update logos/name.

-- 1. Enable RLS (already enabled, but ensuring)
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy policies if any
DROP POLICY IF EXISTS "Allow members to read their institution" ON institutions;
DROP POLICY IF EXISTS "Allow admins to update their institution" ON institutions;
DROP POLICY IF EXISTS "institutions_tenant_select" ON institutions;
DROP POLICY IF EXISTS "institutions_tenant_update" ON institutions;

-- 3. SELECT: Any user can see their own institution's branding
CREATE POLICY "institutions_tenant_select"
ON institutions FOR SELECT
USING (
    id IN (
        SELECT institution_id FROM users 
        WHERE auth_uid = auth.uid()
    )
);

-- 4. UPDATE: Only institution admins can update branding
CREATE POLICY "institutions_tenant_update"
ON institutions FOR UPDATE
USING (
    id IN (
        SELECT institution_id FROM users 
        WHERE auth_uid = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    id IN (
        SELECT institution_id FROM users 
        WHERE auth_uid = auth.uid() AND role = 'admin'
    )
);
