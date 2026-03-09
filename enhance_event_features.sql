
-- 1. ENHANCE events table with JSONB configs
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rich_description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_schema JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS prizes_config JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS club_id UUID; 

-- 2. CREATE or FIX clubs table
CREATE TABLE IF NOT EXISTS clubs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Force add columns if partially exists
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url    TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS leader_id   UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. ENFORCE UNIQUE CONSTRAINT on clubs.name (Required for ON CONFLICT to work)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clubs_name_unique' OR (contype = 'u' AND conrelid = 'clubs'::regclass)
    ) THEN
        ALTER TABLE clubs ADD CONSTRAINT clubs_name_unique UNIQUE (name);
    END IF;
EXCEPTION
    WHEN others THEN NULL; -- Ignore if already exists or fails
END $$;

-- 4. FIX Round Number column in event_rounds
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_rounds' AND column_name='round_number') THEN
        ALTER TABLE event_rounds ADD COLUMN round_number INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 5. Enable RLS for clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clubs_select_all" ON clubs;
DROP POLICY IF EXISTS "clubs_manage_admin" ON clubs;

CREATE POLICY "clubs_select_all" ON clubs FOR SELECT USING (true);
CREATE POLICY "clubs_manage_admin" ON clubs FOR ALL USING (current_user_role() = 'admin');

-- 6. SEED data with fallback for unique constraint
INSERT INTO clubs (name, description)
VALUES 
    ('Coding Ninjas', 'Primary technical club for software and algorithms'),
    ('Design Studio', 'Visual arts and UI/UX design collective'),
    ('Robotics Cell', 'Mechatronics and automation research group')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
