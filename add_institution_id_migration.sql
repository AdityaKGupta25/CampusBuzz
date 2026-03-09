-- ============================================================
-- Migration: Add institution_id to users and departments
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add institution_id to departments (scope depts per college)
ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;

-- 2. Add institution_id to users (scope users per college)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL;

-- 3. Index for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_departments_institution_id ON departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_users_institution_id       ON users(institution_id);

-- 4. Update departments UNIQUE constraint to be per-institution
--    (two colleges can both have a "Computer Science" dept)
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE departments
    ADD CONSTRAINT departments_name_institution_unique UNIQUE (name, institution_id);
