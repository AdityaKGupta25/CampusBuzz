-- 1. Create the 'sponsor-logos' bucket
-- This must be run in the Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsor-logos', 'sponsor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Access (Anyone can see the logos)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'sponsor-logos');

-- 3. Allow Faculty Upload (Authenticated users can upload)
CREATE POLICY "Faculty Logo Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sponsor-logos');

-- 4. Allow Faculty Update/Delete (Optional but recommended)
CREATE POLICY "Faculty Logo Management"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'sponsor-logos')
WITH CHECK (bucket_id = 'sponsor-logos');

-- 5. Ensure 'event-banners' also exists just in case
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Banner Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-banners');

CREATE POLICY "Banner Faculty Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-banners');

-- 6. Create the 'event-rulebooks' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-rulebooks', 'event-rulebooks', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Public Access (Anyone can see/download rulebooks)
CREATE POLICY "Rulebook Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-rulebooks');

-- Allow Faculty Upload (Authenticated users can upload rulebooks)
CREATE POLICY "Rulebook Faculty Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-rulebooks');

-- Allow Faculty Management (Delete/Update)
CREATE POLICY "Rulebook Faculty Management"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'event-rulebooks')
WITH CHECK (bucket_id = 'event-rulebooks');
