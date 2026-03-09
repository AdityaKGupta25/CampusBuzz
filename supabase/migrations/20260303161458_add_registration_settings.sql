ALTER TABLE events 
ADD COLUMN IF NOT EXISTS collect_resume BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS collect_github BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS collect_linkedin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_team_event BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS min_team_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_team_size INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS registration_config JSONB DEFAULT '{"collect_resume": false, "collect_github": false, "collect_linkedin": false, "team_participation": false, "team_min_size": 1, "team_max_size": 4}'::jsonb;
