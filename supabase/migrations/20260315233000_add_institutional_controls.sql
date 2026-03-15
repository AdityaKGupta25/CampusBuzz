-- Add high-level Institutional Controls
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS marketplace_access BOOLEAN DEFAULT TRUE;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'standard' CHECK (security_level IN ('standard', 'strict', 'emergency_freeze'));
