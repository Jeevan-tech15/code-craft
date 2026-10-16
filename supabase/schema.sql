-- ==============================================================================
-- EcoTwin AI — Master Supabase Database Schema, Realtime & Seed Script
-- Compatible with Supabase SQL Editor (100% Idempotent — Safe to run repeatedly)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUMS & DOMAIN CHECKS
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE building_id_enum AS ENUM ('engineering', 'library', 'laboratory', 'cafeteria');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity_enum AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status_enum AS ENUM ('active', 'investigating', 'resolved', 'follow_up_scheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_category_enum AS ENUM ('electricity', 'water', 'waste', 'carbon', 'equipment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE follow_up_status_enum AS ENUM ('verified_improved', 'inconclusive', 'requires_rework');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE sensor_type_enum AS ENUM ('smart_meter', 'flow_sensor', 'air_quality', 'solar_inverter', 'thermal_sensor', 'acoustic_leak');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 3. CORE CAMPUS TABLES
-- ==============================================================================

-- TABLE: buildings (The 4 campus facilities)
CREATE TABLE IF NOT EXISTS public.buildings (
    id building_id_enum PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical')),
    efficiency_score NUMERIC(5, 2) DEFAULT 85.0,
    active_alerts_count INT DEFAULT 0,
    area_sq_ft INT NOT NULL,
    occupancy_current INT DEFAULT 0,
    occupancy_capacity INT NOT NULL,
    electricity_kwh NUMERIC(10, 2) DEFAULT 0,
    water_liters INT DEFAULT 0,
    waste_kg INT DEFAULT 0,
    carbon_tons NUMERIC(8, 2) DEFAULT 0,
    solar_generation_kwh NUMERIC(10, 2) DEFAULT 0,
    zone TEXT NOT NULL,
    floor_count INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: historical_telemetry (24-hour hourly curves for electricity, water, waste, carbon)
CREATE TABLE IF NOT EXISTS public.historical_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id building_id_enum REFERENCES public.buildings(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL, -- e.g. '00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:00'
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    electricity_kwh NUMERIC(8, 2) NOT NULL,
    water_liters INT NOT NULL,
    waste_kg INT NOT NULL,
    carbon_tons NUMERIC(6, 2) NOT NULL
);

-- TABLE: sensors (Real-time smart meters, submeters, acoustic leak detectors)
CREATE TABLE IF NOT EXISTS public.sensors (
    id TEXT PRIMARY KEY, -- e.g. 'SM-ENG-01'
    building_id building_id_enum REFERENCES public.buildings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type sensor_type_enum NOT NULL,
    value TEXT NOT NULL,
    unit TEXT NOT NULL,
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'degraded', 'offline')),
    is_simulated BOOLEAN DEFAULT TRUE,
    last_reading_time TEXT DEFAULT 'Just now',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: anomalies (Specific anomaly instances detected on equipment)
CREATE TABLE IF NOT EXISTS public.anomalies (
    id TEXT PRIMARY KEY,
    building_id building_id_enum REFERENCES public.buildings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    severity alert_severity_enum NOT NULL,
    timestamp TEXT NOT NULL,
    equipment_id TEXT NOT NULL,
    evidence_value TEXT NOT NULL,
    baseline_value TEXT NOT NULL,
    possible_cause TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: alerts (Operational environmental & decarbonization alerts)
CREATE TABLE IF NOT EXISTS public.alerts (
    id TEXT PRIMARY KEY, -- e.g. 'ALT-2026-089'
    title TEXT NOT NULL,
    description TEXT,
    building_id building_id_enum REFERENCES public.buildings(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL,
    severity alert_severity_enum NOT NULL,
    status alert_status_enum DEFAULT 'active',
    category alert_category_enum NOT NULL,
    timestamp TEXT NOT NULL,
    equipment_id TEXT NOT NULL,
    sensor_id TEXT NOT NULL,
    supporting_readings JSONB DEFAULT '[]'::jsonb,
    possible_causes TEXT[] DEFAULT ARRAY[]::TEXT[],
    next_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
    recommendation_id TEXT,
    follow_up_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: recommendations (AI-generated actionable sustainability recommendations)
CREATE TABLE IF NOT EXISTS public.recommendations (
    id TEXT PRIMARY KEY, -- e.g. 'REC-ENG-001'
    title TEXT NOT NULL,
    description TEXT,
    building_id building_id_enum REFERENCES public.buildings(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('energy', 'water', 'waste', 'carbon', 'hvac')),
    priority alert_severity_enum NOT NULL,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'verified', 'completed')),
    projected_savings JSONB NOT NULL DEFAULT '{}'::jsonb,
    difficulty TEXT DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'High')),
    payback_period TEXT,
    assignee TEXT,
    deadline TEXT,
    verification_criteria TEXT,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    steps TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: inspections (Field audit & visual inspection submissions)
CREATE TABLE IF NOT EXISTS public.inspections (
    id TEXT PRIMARY KEY, -- e.g. 'INSP-4821'
    building_id building_id_enum REFERENCES public.buildings(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL,
    zone TEXT NOT NULL,
    equipment_tag TEXT NOT NULL,
    inspector_name TEXT NOT NULL,
    role TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT NOT NULL,
    image_url TEXT,
    vision_analysis_status TEXT DEFAULT 'unavailable' CHECK (vision_analysis_status IN ('unavailable', 'completed', 'pending')),
    vision_result JSONB,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'verified')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: follow_ups (Verified corrective actions with audit trails)
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id TEXT PRIMARY KEY, -- e.g. 'FOL-782'
    alert_id TEXT REFERENCES public.alerts(id) ON DELETE SET NULL,
    recommendation_id TEXT REFERENCES public.recommendations(id) ON DELETE SET NULL,
    building_id building_id_enum REFERENCES public.buildings(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL,
    verifier_name TEXT NOT NULL,
    role TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    pre_reading TEXT NOT NULL,
    post_reading TEXT NOT NULL,
    status follow_up_status_enum NOT NULL,
    notes TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: reports (Generated sustainability audit reports)
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY, -- e.g. 'REP-M8B2J'
    title TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    date_range JSONB NOT NULL,
    building_filter TEXT NOT NULL,
    summary JSONB NOT NULL,
    building_breakdown JSONB NOT NULL,
    key_recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
    follow_up_audit_trail JSONB DEFAULT '[]'::jsonb
);

-- ==============================================================================
-- 4. VIRTUAL CAMPUS CAMERAS & EVENT PERSISTENCE
-- ==============================================================================

-- TABLE: logical_cameras (4 virtual cameras sharing the physical webcam)
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

-- TABLE: camera_events (Verified real-time visual detection events)
CREATE TABLE IF NOT EXISTS public.camera_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code TEXT UNIQUE NOT NULL,
    camera_id TEXT NOT NULL REFERENCES public.logical_cameras(id) ON DELETE CASCADE,
    building_id building_id_enum NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL,
    detected_class TEXT NOT NULL,
    confidence NUMERIC(6, 4) NOT NULL, -- True geometric similarity / confidence [0.0 - 1.0]
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    evidence_storage_path TEXT,
    evidence_image_url TEXT,
    model_name TEXT NOT NULL,
    model_version TEXT DEFAULT '1.0.0',
    persistence_status TEXT DEFAULT 'stored' CHECK (persistence_status IN ('stored', 'evidence_pending', 'evidence_failed')),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries and isolation
CREATE INDEX IF NOT EXISTS idx_camera_events_camera_id ON public.camera_events(camera_id);
CREATE INDEX IF NOT EXISTS idx_camera_events_building_id ON public.camera_events(building_id);
CREATE INDEX IF NOT EXISTS idx_camera_events_detected_at ON public.camera_events(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_building_id ON public.alerts(building_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_sensors_building_id ON public.sensors(building_id);

-- ==============================================================================
-- 5. BUSINESS LOGIC TRIGGER: AUTO-RESOLVE ALERT ON VERIFIED FOLLOW-UP
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_follow_up_resolution()
RETURNS TRIGGER AS $$
BEGIN
    -- If follow-up is linked to an alert
    IF NEW.alert_id IS NOT NULL THEN
        IF NEW.status = 'verified_improved' THEN
            UPDATE public.alerts 
            SET status = 'resolved', follow_up_id = NEW.id, updated_at = NOW()
            WHERE id = NEW.alert_id;
        ELSIF NEW.status = 'requires_rework' THEN
            UPDATE public.alerts 
            SET status = 'active', follow_up_id = NEW.id, updated_at = NOW()
            WHERE id = NEW.alert_id;
        ELSE
            UPDATE public.alerts 
            SET status = 'investigating', follow_up_id = NEW.id, updated_at = NOW()
            WHERE id = NEW.alert_id;
        END IF;

        -- Recalculate building active alert count and health status
        UPDATE public.buildings b
        SET 
            active_alerts_count = (
                SELECT COUNT(*) FROM public.alerts 
                WHERE building_id = b.id AND status IN ('active', 'investigating')
            ),
            status = CASE 
                WHEN EXISTS (SELECT 1 FROM public.alerts WHERE building_id = b.id AND severity = 'critical' AND status IN ('active', 'investigating')) THEN 'critical'
                WHEN EXISTS (SELECT 1 FROM public.alerts WHERE building_id = b.id AND status IN ('active', 'investigating')) THEN 'warning'
                ELSE 'normal'
            END,
            efficiency_score = CASE 
                WHEN NOT EXISTS (SELECT 1 FROM public.alerts WHERE building_id = b.id AND status IN ('active', 'investigating')) THEN LEAST(98.0, b.efficiency_score + 6.0)
                ELSE b.efficiency_score
            END,
            updated_at = NOW()
        WHERE b.id = NEW.building_id;
    END IF;

    -- If linked to a recommendation, update recommendation status
    IF NEW.recommendation_id IS NOT NULL THEN
        IF NEW.status = 'verified_improved' THEN
            UPDATE public.recommendations SET status = 'completed', updated_at = NOW() WHERE id = NEW.recommendation_id;
        ELSIF NEW.status = 'requires_rework' THEN
            UPDATE public.recommendations SET status = 'in_progress', updated_at = NOW() WHERE id = NEW.recommendation_id;
        ELSE
            UPDATE public.recommendations SET status = 'verified', updated_at = NOW() WHERE id = NEW.recommendation_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_follow_up_resolution ON public.follow_ups;
CREATE TRIGGER trigger_follow_up_resolution
AFTER INSERT ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.handle_follow_up_resolution();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES (Idempotent Drop + Create)
-- ==============================================================================

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logical_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_events ENABLE ROW LEVEL SECURITY;

-- Buildings Policies
DROP POLICY IF EXISTS "Public Read Buildings" ON public.buildings;
CREATE POLICY "Public Read Buildings" ON public.buildings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Update Buildings" ON public.buildings;
CREATE POLICY "Public Update Buildings" ON public.buildings FOR UPDATE USING (true);

-- Telemetry Policies
DROP POLICY IF EXISTS "Public Read Telemetry" ON public.historical_telemetry;
CREATE POLICY "Public Read Telemetry" ON public.historical_telemetry FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Telemetry" ON public.historical_telemetry;
CREATE POLICY "Public Insert Telemetry" ON public.historical_telemetry FOR INSERT WITH CHECK (true);

-- Sensors Policies
DROP POLICY IF EXISTS "Public Read Sensors" ON public.sensors;
CREATE POLICY "Public Read Sensors" ON public.sensors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Update Sensors" ON public.sensors;
CREATE POLICY "Public Update Sensors" ON public.sensors FOR UPDATE USING (true);

-- Anomalies Policies
DROP POLICY IF EXISTS "Public Read Anomalies" ON public.anomalies;
CREATE POLICY "Public Read Anomalies" ON public.anomalies FOR SELECT USING (true);

-- Alerts Policies
DROP POLICY IF EXISTS "Public Read Alerts" ON public.alerts;
CREATE POLICY "Public Read Alerts" ON public.alerts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Alerts" ON public.alerts;
CREATE POLICY "Public Insert Alerts" ON public.alerts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Alerts" ON public.alerts;
CREATE POLICY "Public Update Alerts" ON public.alerts FOR UPDATE USING (true);

-- Recommendations Policies
DROP POLICY IF EXISTS "Public Read Recommendations" ON public.recommendations;
CREATE POLICY "Public Read Recommendations" ON public.recommendations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Update Recommendations" ON public.recommendations;
CREATE POLICY "Public Update Recommendations" ON public.recommendations FOR UPDATE USING (true);

-- Inspections Policies
DROP POLICY IF EXISTS "Public Read Inspections" ON public.inspections;
CREATE POLICY "Public Read Inspections" ON public.inspections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Inspections" ON public.inspections;
CREATE POLICY "Public Insert Inspections" ON public.inspections FOR INSERT WITH CHECK (true);

-- Follow-Ups Policies
DROP POLICY IF EXISTS "Public Read FollowUps" ON public.follow_ups;
CREATE POLICY "Public Read FollowUps" ON public.follow_ups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert FollowUps" ON public.follow_ups FOR INSERT WITH CHECK (true);

-- Reports Policies
DROP POLICY IF EXISTS "Public Read Reports" ON public.reports;
CREATE POLICY "Public Read Reports" ON public.reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Reports" ON public.reports;
CREATE POLICY "Public Insert Reports" ON public.reports FOR INSERT WITH CHECK (true);

-- Logical Cameras Policies
DROP POLICY IF EXISTS "Public Read Logical Cameras" ON public.logical_cameras;
CREATE POLICY "Public Read Logical Cameras" ON public.logical_cameras FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Update Logical Cameras" ON public.logical_cameras;
CREATE POLICY "Public Update Logical Cameras" ON public.logical_cameras FOR UPDATE USING (true);

-- Camera Events Policies
DROP POLICY IF EXISTS "Public Read Camera Events" ON public.camera_events;
CREATE POLICY "Public Read Camera Events" ON public.camera_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Camera Events" ON public.camera_events;
CREATE POLICY "Public Insert Camera Events" ON public.camera_events FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 7. STORAGE BUCKETS CONFIGURATION
-- ==============================================================================

-- Bucket: camera-evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('camera-evidence', 'camera-evidence', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Camera Evidence" ON storage.objects;
CREATE POLICY "Public Read Camera Evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'camera-evidence');

DROP POLICY IF EXISTS "Public Upload Camera Evidence" ON storage.objects;
CREATE POLICY "Public Upload Camera Evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'camera-evidence');

-- Bucket: inspection-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-images', 'inspection-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access Inspection Images" ON storage.objects;
CREATE POLICY "Public Access Inspection Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspection-images');

DROP POLICY IF EXISTS "Public Upload Inspection Images" ON storage.objects;
CREATE POLICY "Public Upload Inspection Images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inspection-images');

-- ==============================================================================
-- 8. SUPABASE REALTIME ENABLEMENT
-- ==============================================================================

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.camera_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_ups;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.buildings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 9. COMPLETE INITIAL SEED DATA
-- ==============================================================================

-- Seed: The 4 Campus Buildings
INSERT INTO public.buildings 
(id, name, code, tagline, description, status, efficiency_score, active_alerts_count, area_sq_ft, occupancy_current, occupancy_capacity, electricity_kwh, water_liters, waste_kg, carbon_tons, solar_generation_kwh, zone, floor_count)
VALUES
('engineering', 'Engineering Block', 'ENG-BLK-A', 'Heavy Lab Prototyping & Bifacial Solar PV Farm', 'Houses computational, robotics, and prototyping engineering labs. Features a 180kW rooftop solar PV array and dual chillers.', 'warning', 78.5, 2, 84000, 1420, 1800, 1240.6, 18500, 340, 1.14, 640.2, 'North Academic Sector', 5),
('library', 'Central Library', 'LIB-CTR-C', 'Digital Learning Commons & Geothermal Plant', 'Five-story learning commons with automated smart LED zoning, daylight-harvesting facades, and greywater recycling.', 'critical', 64.2, 1, 62000, 890, 1200, 580.4, 14200, 120, 0.48, 0.0, 'Central Quad Sector', 5),
('laboratory', 'Science Laboratory', 'SCI-LAB-01', 'Fume Hood Exhausts & High-Purity Water Systems', 'Specialized wet labs, cleanrooms, and chemical synthesis wings. High continuous air changes per hour (ACH).', 'normal', 91.0, 0, 72000, 410, 600, 940.8, 8900, 210, 0.86, 110.0, 'West Research Sector', 4),
('cafeteria', 'Dining Commons', 'DIN-COM-S', 'Commercial Kitchen & Bio-Digester Composting Hub', 'Central campus dining facility. Operates commercial walk-in refrigeration, bio-gas digester, and dishwashing water recovery.', 'normal', 86.8, 0, 38000, 650, 950, 490.2, 12800, 520, 0.52, 45.0, 'South Student Commons', 2)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    efficiency_score = EXCLUDED.efficiency_score,
    active_alerts_count = EXCLUDED.active_alerts_count;

-- Seed: The 4 Logical Camera Profiles (Shared Physical Webcam Index 0)
INSERT INTO public.logical_cameras 
(id, name, building_id, building_name, zone, is_enabled, physical_device_index, is_demo_mode, connection_status)
VALUES
('camera-1', 'Camera 1 — Engineering Block', 'engineering', 'Engineering Block', 'North Rooftop & Prototyping Lab', true, 0, true, 'READY'),
('camera-2', 'Camera 2 — Central Library', 'library', 'Central Library', 'Basement Hydronic Loop & Restrooms', true, 0, true, 'INACTIVE IN DEMO MODE'),
('camera-3', 'Camera 3 — Advanced Science Laboratory', 'laboratory', 'Science Laboratory', 'West Wet Lab & Cleanroom Sector', true, 0, true, 'INACTIVE IN DEMO MODE'),
('camera-4', 'Camera 4 — Campus Dining Commons', 'cafeteria', 'Dining Commons', 'South Kitchen & Bio-Digester Hub', true, 0, true, 'INACTIVE IN DEMO MODE')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    building_id = EXCLUDED.building_id,
    building_name = EXCLUDED.building_name,
    zone = EXCLUDED.zone,
    physical_device_index = EXCLUDED.physical_device_index,
    is_demo_mode = EXCLUDED.is_demo_mode;

-- Seed: 24h Historical Telemetry
INSERT INTO public.historical_telemetry (building_id, timestamp, electricity_kwh, water_liters, waste_kg, carbon_tons) VALUES
('engineering', '00:00', 42.0, 320, 10, 0.04),
('engineering', '04:00', 68.0, 410, 12, 0.06),
('engineering', '08:00', 110.0, 1200, 45, 0.10),
('engineering', '12:00', 185.0, 2400, 90, 0.17),
('engineering', '16:00', 165.0, 2100, 75, 0.15),
('engineering', '20:00', 95.0, 1100, 30, 0.09),
('engineering', '23:00', 58.0, 450, 15, 0.05),
('library', '00:00', 25.0, 180, 5, 0.02),
('library', '04:00', 48.6, 2900, 8, 0.04),
('library', '08:00', 65.0, 1400, 25, 0.06),
('library', '12:00', 88.0, 2100, 40, 0.08),
('library', '16:00', 92.0, 2200, 35, 0.09),
('library', '20:00', 45.0, 800, 15, 0.04),
('library', '23:00', 30.0, 300, 8, 0.03)
ON CONFLICT DO NOTHING;

-- Seed: Sensors
INSERT INTO public.sensors (id, building_id, name, type, value, unit, status, is_simulated, last_reading_time) VALUES
('SM-ENG-01', 'engineering', 'Main Switchgear Submeter', 'smart_meter', '412.4', 'kW', 'online', true, '10s ago'),
('SOL-ENG-03', 'engineering', 'Inverter String 3 DC/AC', 'solar_inverter', '18.2', 'kW', 'degraded', true, '12s ago'),
('WTR-LIB-02', 'library', 'Basement Hydronic Inflow Submeter', 'flow_sensor', '48.6', 'L/min', 'degraded', true, '5s ago'),
('LEAK-LIB-01', 'library', 'Zone B Acoustic Vibration Leak Node', 'acoustic_leak', '72', 'dB', 'degraded', true, '8s ago'),
('AQ-LAB-01', 'laboratory', 'Cleanroom Volatile Organic Sensor', 'air_quality', '410', 'ppm CO2', 'online', true, '15s ago'),
('THM-CAF-01', 'cafeteria', 'Walk-in Freezer Heat Exchanger', 'thermal_sensor', '-18.4', '°C', 'online', true, '20s ago')
ON CONFLICT (id) DO NOTHING;

-- Seed: Operational Alerts
INSERT INTO public.alerts 
(id, title, description, building_id, building_name, severity, status, category, timestamp, equipment_id, sensor_id, supporting_readings, possible_causes, next_actions) VALUES
(
    'ALT-2026-089',
    'Overnight HVAC Compressor Short-Cycling',
    'Zone B Rooftop Air Handler 2 ran at 85% duty cycle between 02:30 AM and 05:45 AM while occupancy was 0, resulting in an unneeded 184 kWh load.',
    'engineering',
    'Engineering Block',
    'high',
    'active',
    'electricity',
    'Today, 04:15 AM',
    'AHU-ENG-02B',
    'SM-ENG-01',
    '[{"metric": "Overnight Power Draw", "value": "68.4 kWh/hr", "normalRange": "< 14.0 kWh/hr", "deviation": "+388%"}, {"metric": "Damper Actuator Position", "value": "88% Open", "normalRange": "15% Minimum", "deviation": "Stuck open"}]'::jsonb,
    ARRAY['BMS night setback override failed to clear after floor sanitization', 'Faulty zone temperature sensor reading false high', 'Pneumatic damper actuator jammed mechanically'],
    ARRAY['Trigger BMS soft reset on Controller ENG-AHU-02B', 'Verify pneumatic air supply pressure at 18 psi', 'Dispatch technician for manual inspection of damper linkage']
),
(
    'ALT-2026-092',
    'Continuous Potable Water Consumption Anomaly',
    'Basement hydronic meter recorded persistent flow of 48.6 L/min between 01:00 AM and 04:30 AM. Acoustic sensor detected 72 dB high-frequency vibration.',
    'library',
    'Central Library',
    'critical',
    'active',
    'water',
    'Today, 03:22 AM',
    'HYD-LIB-B01',
    'WTR-LIB-02',
    '[{"metric": "Basement Night Inflow", "value": "48.6 L/min", "normalRange": "< 2.0 L/min", "deviation": "+2330%"}, {"metric": "Acoustic Leak Intensity", "value": "72 dB", "normalRange": "< 32 dB", "deviation": "+125%"}]'::jsonb,
    ARRAY['Failed commercial flush valve solenoid in ground floor restrooms', 'Sub-slab copper supply line rupture near north riser', 'Fire suppression line check valve back-leakage'],
    ARRAY['Isolate ground floor north plumbing stack valve V-12', 'Inspect acoustic pinpoint logger near riser core', 'Log visual inspection and schedule emergency plumber']
),
(
    'ALT-2026-097',
    'Solar Inverter 3 DC/AC Conversion Degradation',
    'Inverter 3 output is 22% lower than adjacent arrays under equivalent 820 W/m² solar irradiance.',
    'engineering',
    'Engineering Block',
    'medium',
    'investigating',
    'electricity',
    'Yesterday, 01:45 PM',
    'INV-ENG-03',
    'SOL-ENG-03',
    '[{"metric": "Inverter 3 Power Yield", "value": "18.2 kW", "normalRange": "23.4 kW", "deviation": "-22.2%"}, {"metric": "DC String Voltage", "value": "520 V", "normalRange": "610 V", "deviation": "-14.7%"}]'::jsonb,
    ARRAY['Micro-cracking on string 4 panels or bypass diode failure', 'Dust/bird fouling concentration on south corner', 'DC combiner box fuse blown'],
    ARRAY['Run I-V curve tracer on strings 3A through 3D', 'Inspect DC disconnect switch contacts', 'Schedule module surface washdown']
)
ON CONFLICT (id) DO NOTHING;

-- Seed: Sustainability Recommendations
INSERT INTO public.recommendations 
(id, title, description, building_id, building_name, category, priority, status, projected_savings, difficulty, payback_period, assignee, deadline, verification_criteria, is_ai_generated, steps) VALUES
(
    'REC-ENG-001',
    'Automate BMS Night Setback for Engineering AHU-02B',
    'Reprogram controller schedule logic to enforce 12.0 kWh/hr baseline ceiling between 22:00 and 06:00 unless occupancy sensors trigger an override.',
    'engineering',
    'Engineering Block',
    'hvac',
    'high',
    'in_progress',
    '{"kwh": 4800, "costSavingsMonthly": "$340/mo", "co2eTons": 3.8}'::jsonb,
    'Easy',
    'Immediate',
    'Sarah Jenkins, PE',
    'Tomorrow, 5:00 PM',
    'Post-intervention SCADA readings must stay below 14.0 kWh/hr over two consecutive nights.',
    true,
    ARRAY['Access Johnson Controls Metasys BMS portal', 'Clear manual night override schedule', 'Verify damper closes to 15% minimum ventilation', 'Sample submeter readings from 00:00 to 04:00']
),
(
    'REC-LIB-002',
    'Replace Library North Restroom Flush Solenoids & Valves',
    'Rebuild dual flushometer valves with low-flow 1.1 GPF diaphragm kits and calibrate line pressure regulator to 45 psi.',
    'library',
    'Central Library',
    'water',
    'critical',
    'todo',
    '{"waterLiters": 68000, "costSavingsMonthly": "$510/mo"}'::jsonb,
    'Medium',
    '0.8 months',
    'Marco Ruiz (Facilities)',
    'Friday, 12:00 PM',
    'Potable water inflow must drop to zero during unoccupied night window.',
    false,
    ARRAY['Shut off isolate stack valve V-12', 'Disassemble Sloan flush valves and replace worn diaphragms', 'Pressurize system and check for micro-seepage', 'Verify zero night baseline on SCADA flow meter']
)
ON CONFLICT (id) DO NOTHING;
