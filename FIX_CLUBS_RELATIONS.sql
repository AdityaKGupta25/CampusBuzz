-- Fix relationships for the Admin Directory Command Center

-- 1. CLUBS: Add missing department_id and FK for leader_id
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- 2. EVENTS: Add missing FK for club_id
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_club_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_club_id_fkey FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- 3. EVENTS: Add missing faculty_in_charge_id
ALTER TABLE events ADD COLUMN IF NOT EXISTS faculty_in_charge_id UUID REFERENCES users(id) ON DELETE SET NULL;
