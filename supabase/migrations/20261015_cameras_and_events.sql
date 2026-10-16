-- ==============================================================================
-- EcoTwin AI — Phase 1: Virtual Campus Cameras & Real Event Attribution
-- Migration: 20261015_cameras_and_events.sql
-- ==============================================================================

-- 1. Ensure building_id_enum exists
DO $$ BEGIN
    CREATE TYPE building_id_enum AS ENUM ('engineering', 'library', 'laboratory', 'cafeteria');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE: logical_cameras
CREATE TABLE IF NOT EXISTS public.logical_cameras (
    id TEXT PRIMARY KEY, -- 'camera-1', 'camera-2', 'camera-3', 'camera-4'
    name TEXT NOT NULL,
    building_id building_id_enum NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL,
    zone TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    physical_device_index INT DEFAULT 0,
    is_demo_mode BOOLEAN DEFAULT TRUE,
    connection_status TEXT DEFAULT 'NOT CONFIGURED',
    last_frame_at TIMESTAMPTZ,
    last_detection_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: camera_events
CREATE TABLE IF NOT EXISTS public.camera_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code TEXT UNIQUE NOT NULL,
    camera_id TEXT NOT NULL REFERENCES public.logical_cameras(id) ON DELETE CASCADE,
    building_id building_id_enum NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL,
    detected_class TEXT NOT NULL,
    confidence NUMERIC(6, 4) NOT NULL, -- actual confidence, e.g. 0.8845
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    evidence_storage_path TEXT,
    evidence_image_url TEXT,
    model_name TEXT NOT NULL,
    model_version TEXT DEFAULT '1.0.0',
    persistence_status TEXT DEFAULT 'stored' CHECK (persistence_status IN ('stored', 'evidence_pending', 'evidence_failed')),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES for fast querying & attribution isolation
CREATE INDEX IF NOT EXISTS idx_camera_events_camera_id ON public.camera_events(camera_id);
CREATE INDEX IF NOT EXISTS idx_camera_events_building_id ON public.camera_events(building_id);
CREATE INDEX IF NOT EXISTS idx_camera_events_detected_at ON public.camera_events(detected_at DESC);

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.logical_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Logical Cameras" ON public.logical_cameras FOR SELECT USING (true);
CREATE POLICY "Public Update Logical Cameras" ON public.logical_cameras FOR UPDATE USING (true);
CREATE POLICY "Public Read Camera Events" ON public.camera_events FOR SELECT USING (true);
CREATE POLICY "Public Insert Camera Events" ON public.camera_events FOR INSERT WITH CHECK (true);

-- 6. PRIVATE STORAGE BUCKET FOR EVIDENCE IMAGES
INSERT INTO storage.buckets (id, name, public)
VALUES ('camera-evidence', 'camera-evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Camera Evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'camera-evidence');

CREATE POLICY "Public Upload Camera Evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'camera-evidence');

-- 7. INITIAL SEED: The Four Logical Campus Cameras
-- Shared physical device index 0 in demo mode, individually attributable to buildings
INSERT INTO public.logical_cameras 
(id, name, building_id, building_name, zone, is_enabled, physical_device_index, is_demo_mode, connection_status)
VALUES
('camera-1', 'Camera 1 — Engineering Block', 'engineering', 'Engineering Block', 'North Rooftop & Prototyping Lab', true, 0, true, 'NOT CONFIGURED'),
('camera-2', 'Camera 2 — Central Library', 'library', 'Central Library', 'Basement Hydronic Loop & Restrooms', true, 0, true, 'NOT CONFIGURED'),
('camera-3', 'Camera 3 — Advanced Science Laboratory', 'laboratory', 'Science Laboratory', 'West Wet Lab & Cleanroom Sector', true, 0, true, 'NOT CONFIGURED'),
('camera-4', 'Camera 4 — Campus Dining Commons', 'cafeteria', 'Dining Commons', 'South Kitchen & Bio-Digester Hub', true, 0, true, 'NOT CONFIGURED')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    building_id = EXCLUDED.building_id,
    building_name = EXCLUDED.building_name,
    zone = EXCLUDED.zone,
    physical_device_index = EXCLUDED.physical_device_index,
    is_demo_mode = EXCLUDED.is_demo_mode;
