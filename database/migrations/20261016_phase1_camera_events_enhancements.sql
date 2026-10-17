-- ==============================================================================
-- EcoTwin AI — Phase 1: Camera Events Schema Enhancements & Storage Policies
-- Migration: 20261016_phase1_camera_events_enhancements.sql
-- Idempotent: Safe to execute multiple times in Supabase SQL Editor
-- ==============================================================================

-- 1. Add enhanced fields to public.camera_events
ALTER TABLE public.camera_events 
    ADD COLUMN IF NOT EXISTS item_name TEXT,
    ADD COLUMN IF NOT EXISTS waste_category TEXT,
    ADD COLUMN IF NOT EXISTS zone TEXT,
    ADD COLUMN IF NOT EXISTS similarity_score NUMERIC(6, 4),
    ADD COLUMN IF NOT EXISTS bbox JSONB,
    ADD COLUMN IF NOT EXISTS polygon JSONB,
    ADD COLUMN IF NOT EXISTS match_inliers INT,
    ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'unreviewed',
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add constraint for review_status if not present
DO $$ BEGIN
    ALTER TABLE public.camera_events DROP CONSTRAINT IF EXISTS check_review_status;
    ALTER TABLE public.camera_events 
        ADD CONSTRAINT check_review_status 
        CHECK (review_status IN ('unreviewed', 'pending_review', 'verified_waste', 'false_positive', 'resolved'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add composite indexes for analytics & fast filtering
CREATE INDEX IF NOT EXISTS idx_camera_events_review_status ON public.camera_events(review_status);
CREATE INDEX IF NOT EXISTS idx_camera_events_item_name ON public.camera_events(item_name);
CREATE INDEX IF NOT EXISTS idx_camera_events_waste_category ON public.camera_events(waste_category);
CREATE INDEX IF NOT EXISTS idx_camera_events_composite ON public.camera_events(building_id, camera_id, detected_at DESC);

-- 4. Storage Bucket Configuration for camera-evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('camera-evidence', 'camera-evidence', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Storage RLS Policies: Allow anon & authenticated uploads & public reads
DROP POLICY IF EXISTS "Public Read Camera Evidence" ON storage.objects;
CREATE POLICY "Public Read Camera Evidence"
ON storage.objects FOR SELECT
TO public, anon, authenticated
USING (bucket_id = 'camera-evidence');

DROP POLICY IF EXISTS "Public Upload Camera Evidence" ON storage.objects;
CREATE POLICY "Public Upload Camera Evidence"
ON storage.objects FOR INSERT
TO public, anon, authenticated
WITH CHECK (bucket_id = 'camera-evidence');

DROP POLICY IF EXISTS "Public Update Camera Evidence" ON storage.objects;
CREATE POLICY "Public Update Camera Evidence"
ON storage.objects FOR UPDATE
TO public, anon, authenticated
USING (bucket_id = 'camera-evidence');

-- 6. Enable Supabase Realtime on camera_events (if not already added)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.camera_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
