-- ==============================================================================
-- KISAANSAATHI (RYTHUBANDHU) — ALL-IN-ONE MASTER DATABASE MIGRATION & SEED
-- Compatible with PostgreSQL 14+ and Supabase
-- Run this in your Supabase SQL Editor to enable all Phase 1-18 capabilities!
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ==============================================================================
-- 2. CORE ACTORS: FARMERS & OFFICERS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    preferred_language TEXT NOT NULL DEFAULT 'Telugu',
    village TEXT,
    district TEXT,
    state TEXT DEFAULT 'Telangana',
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'Telugu';

CREATE TABLE IF NOT EXISTS officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'AEO',
    assigned_area TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. FARM FOUNDATION: FARMS, FIELDS, CROP CYCLES, SOIL & ACTIVITIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Main Farm',
    total_area NUMERIC(8,2) DEFAULT 4.0,
    area_unit TEXT NOT NULL DEFAULT 'acres',
    village TEXT,
    district TEXT,
    state TEXT DEFAULT 'Telangana',
    location_name TEXT,
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    irrigation_type TEXT DEFAULT 'Drip',
    default_soil_type TEXT DEFAULT 'Red soil',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Field A',
    area NUMERIC(8,2) DEFAULT 2.0,
    area_unit TEXT NOT NULL DEFAULT 'acres',
    location_name TEXT,
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    boundary JSONB DEFAULT NULL,
    soil_reference UUID DEFAULT NULL,
    irrigation_method TEXT DEFAULT 'Drip',
    irrigation_source TEXT DEFAULT 'Drip',
    soil_type TEXT DEFAULT 'Red soil',
    current_crop_cycle_id UUID DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crop_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    crop_variety TEXT,
    variety TEXT,
    sowing_date DATE DEFAULT (CURRENT_DATE - INTERVAL '48 days'),
    planting_date DATE,
    area NUMERIC(8,2) DEFAULT 2.0,
    current_stage TEXT DEFAULT 'Flowering',
    stage_source TEXT DEFAULT 'calculated_from_sowing',
    crop_age_days INTEGER DEFAULT 48,
    expected_harvest_date DATE DEFAULT (CURRENT_DATE + INTERVAL '45 days'),
    irrigation_method TEXT DEFAULT 'Drip',
    target_yield NUMERIC(10,2) DEFAULT 3200.0,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE crop_cycles ADD COLUMN IF NOT EXISTS variety TEXT;
ALTER TABLE crop_cycles ADD COLUMN IF NOT EXISTS target_yield NUMERIC(10,2) DEFAULT 3200.0;
ALTER TABLE crop_cycles ADD COLUMN IF NOT EXISTS crop_age_days INTEGER DEFAULT 48;

CREATE TABLE IF NOT EXISTS soil_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    soil_type TEXT DEFAULT 'Red soil',
    ph NUMERIC(4,2) DEFAULT 6.8,
    n NUMERIC(8,2) DEFAULT 240.0,
    p NUMERIC(8,2) DEFAULT 18.0,
    k NUMERIC(8,2) DEFAULT 280.0,
    organic_matter NUMERIC(5,2) DEFAULT 0.65,
    moisture NUMERIC(5,2) DEFAULT 22.0,
    ec NUMERIC(6,2) DEFAULT 0.45,
    source TEXT NOT NULL DEFAULT 'farmer_statement',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    report_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source TEXT NOT NULL DEFAULT 'FARMER',
    outcome TEXT DEFAULT 'UNKNOWN',
    cost NUMERIC(10,2) DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE farm_activities ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'FARMER';
ALTER TABLE farm_activities ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'UNKNOWN';
ALTER TABLE farm_activities ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- ==============================================================================
-- 4. RECOMMENDATIONS & DECISION ENGINE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL,
    title TEXT NOT NULL,
    primary_action TEXT NOT NULL,
    summary TEXT NOT NULL,
    reasoning TEXT,
    confidence NUMERIC(4,3) DEFAULT 0.85,
    requires_aeo BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}'::jsonb,
    valid_until TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. INCIDENTS, CLUSTERS & MULTIMODAL EVIDENCE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop TEXT NOT NULL,
    possible_condition TEXT,
    center_location GEOGRAPHY(Point, 4326),
    incident_count INTEGER NOT NULL DEFAULT 1,
    confirmation_count INTEGER NOT NULL DEFAULT 0,
    risk_score DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    assigned_aeo_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
    crop TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL DEFAULT 'Telugu',
    location GEOGRAPHY(Point, 4326),
    location_source TEXT DEFAULT 'GPS',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    photo_url TEXT,
    photo_urls TEXT[],
    audio_url TEXT,
    status TEXT NOT NULL DEFAULT 'NEW',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    priority_reasons TEXT[],
    risk_score DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS photo_urls TEXT[];
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority_reasons TEXT[];

CREATE TABLE IF NOT EXISTS ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    transcript TEXT,
    detected_language TEXT,
    crop_detected TEXT,
    symptoms JSONB,
    possible_conditions JSONB,
    vision_prediction TEXT,
    vision_confidence DOUBLE PRECISION,
    llm_summary TEXT,
    structured_data JSONB,
    model_name TEXT,
    model_version TEXT,
    requires_aeo_review BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    distance_km DOUBLE PRECISION,
    is_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    sender_id UUID,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    photo_url TEXT,
    photo_urls TEXT[],
    notes TEXT,
    officer_status TEXT DEFAULT 'PENDING_REVIEW',
    officer_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS field_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS advisories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
    crop_condition TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    chemical_dosage TEXT,
    organic_alternatives TEXT,
    urgency TEXT NOT NULL DEFAULT 'MEDIUM',
    follow_up_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. COMMUNITY ENGINE (REPORTS, ME TOO & SIGNALS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    crop TEXT NOT NULL,
    category TEXT DEFAULT 'crop_health',
    title TEXT,
    description TEXT,
    transcript TEXT,
    symptoms TEXT[] DEFAULT '{}',
    issue_description TEXT,
    village TEXT,
    district TEXT,
    state TEXT DEFAULT 'Telangana',
    approx_location TEXT,
    visibility TEXT DEFAULT 'PUBLIC_COMMUNITY',
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    photo_urls TEXT[] DEFAULT '{}',
    audio_url TEXT,
    ai_classification TEXT,
    ai_confidence DOUBLE PRECISION DEFAULT 0.85,
    me_too_count INTEGER NOT NULL DEFAULT 0,
    aeo_verified BOOLEAN NOT NULL DEFAULT FALSE,
    aeo_guidance TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'crop_health';
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS approx_location TEXT;
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'PUBLIC_COMMUNITY';
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS ai_classification TEXT;
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION DEFAULT 0.85;
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS aeo_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS aeo_guidance TEXT;

CREATE TABLE IF NOT EXISTS community_me_too (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES community_reports(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (report_id, farmer_id)
);

CREATE TABLE IF NOT EXISTS community_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop TEXT NOT NULL,
    issue_category TEXT NOT NULL,
    report_count INTEGER NOT NULL DEFAULT 1,
    confidence NUMERIC(4,3) DEFAULT 0.85,
    village TEXT,
    district TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    user_transcript TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    intent TEXT,
    audio_response_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. PROACTIVE INTELLIGENCE: ALERTS, YIELD, HARVEST & AEO ADVISORIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS farm_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    farmer_phone TEXT,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    detailed_reasoning TEXT,
    action_type TEXT DEFAULT 'VIEW_PLAN',
    suggested_action TEXT DEFAULT 'VIEW_PLAN',
    action_data JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'UNREAD',
    source TEXT NOT NULL DEFAULT 'SYSTEM',
    expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
    read_at TIMESTAMPTZ,
    action_taken_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE farm_alerts ADD COLUMN IF NOT EXISTS farmer_phone TEXT;
ALTER TABLE farm_alerts ADD COLUMN IF NOT EXISTS action_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE farm_alerts ADD COLUMN IF NOT EXISTS suggested_action TEXT DEFAULT 'VIEW_PLAN';

CREATE TABLE IF NOT EXISTS yield_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
    estimated_min_kg NUMERIC(10,2) NOT NULL,
    estimated_max_kg NUMERIC(10,2) NOT NULL,
    estimated_unit TEXT NOT NULL DEFAULT 'kg',
    confidence_level TEXT NOT NULL DEFAULT 'MEDIUM',
    confidence_score NUMERIC(4,3) DEFAULT 0.78,
    factors JSONB DEFAULT '[]'::jsonb,
    disclaimer TEXT DEFAULT 'AI-assisted estimate based on historical and contextual factors. Not a guaranteed outcome.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS harvest_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    actual_yield_kg NUMERIC(10,2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    quality_grade TEXT DEFAULT 'Grade A',
    market_sold_price_per_unit NUMERIC(10,2),
    sold_date DATE DEFAULT CURRENT_DATE,
    buyer_type TEXT DEFAULT 'APMC Mandi',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS harvest_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
    earliest_harvest_date DATE NOT NULL,
    latest_harvest_date DATE NOT NULL,
    days_to_window INTEGER DEFAULT 45,
    weather_consideration TEXT,
    readiness_checklist JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aeo_advisories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    target_crop TEXT NOT NULL,
    region_mandal TEXT NOT NULL,
    issue_title TEXT NOT NULL,
    guidance_text TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'MEDIUM',
    broadcast_channel TEXT DEFAULT 'IN_APP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 8. INDEXES FOR HIGH-SPEED QUERYING & GEOSPATIAL SEARCH
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
CREATE INDEX IF NOT EXISTS idx_farms_farmer ON farms(farmer_id);
CREATE INDEX IF NOT EXISTS idx_fields_farm ON fields(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_field ON crop_cycles(field_id);
CREATE INDEX IF NOT EXISTS idx_soil_records_field ON soil_records(field_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_field ON farm_activities(field_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_cycle ON farm_activities(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_cycle ON recommendations(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_incidents_farmer ON incidents(farmer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_crop ON community_reports(crop);
CREATE INDEX IF NOT EXISTS idx_community_signals_crop ON community_signals(crop);
CREATE INDEX IF NOT EXISTS idx_farm_alerts_farmer ON farm_alerts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farm_alerts_status ON farm_alerts(status);
CREATE INDEX IF NOT EXISTS idx_yield_estimates_cycle ON yield_estimates(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_harvest_plans_cycle ON harvest_plans(crop_cycle_id);

-- ==============================================================================
-- 9. PERMISSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- Configures open access for anon & authenticated roles to ensure zero 42501 errors
-- ==============================================================================

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'farmers', 'officers', 'farms', 'fields', 'crop_cycles', 'soil_records',
        'farm_activities', 'recommendations', 'clusters', 'incidents', 'ai_analysis',
        'community_confirmations', 'case_messages', 'case_followups', 'field_visits',
        'advisories', 'community_reports', 'community_me_too', 'community_signals',
        'voice_conversations', 'farm_alerts', 'yield_estimates', 'harvest_records',
        'harvest_plans', 'aeo_advisories'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON %I;', t);
        EXECUTE format('CREATE POLICY "Public Full Access" ON %I FOR ALL USING (true) WITH CHECK (true);', t);
    END LOOP;
END $$;

-- ==============================================================================
-- 10. DEMO SEED DATA (RAMESH KUMAR & FULL SCENARIO)
-- ==============================================================================

-- Demo Farmer: Ramesh Kumar
INSERT INTO farmers (id, name, phone, preferred_language, village, district, state, latitude, longitude)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Ramesh Kumar',
    '+919876543210',
    'Telugu',
    'Geesugonda',
    'Warangal',
    'Telangana',
    17.9689,
    79.6750
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    preferred_language = EXCLUDED.preferred_language,
    village = EXCLUDED.village;

-- Demo AEO Officer: Srinivas Rao
INSERT INTO officers (id, name, phone, email, role, assigned_area, is_active)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Srinivas Rao',
    '+919440012345',
    'srinivas.aeo@telangana.gov.in',
    'AEO',
    'Medchal–Malkajgiri & Warangal Division',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    assigned_area = EXCLUDED.assigned_area;

-- Demo Farm (4.0 acres)
INSERT INTO farms (id, farmer_id, name, total_area, village, district, state, latitude, longitude)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Ramesh Main Farm',
    4.0,
    'Geesugonda',
    'Warangal',
    'Telangana',
    17.9689,
    79.6750
) ON CONFLICT (id) DO UPDATE SET
    total_area = EXCLUDED.total_area,
    village = EXCLUDED.village;

-- Demo Field (2.0 acres)
INSERT INTO fields (id, farm_id, name, area, irrigation_source, soil_type)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'Field A (North Plot)',
    2.0,
    'Drip',
    'Red soil'
) ON CONFLICT (id) DO UPDATE SET
    area = EXCLUDED.area,
    irrigation_source = EXCLUDED.irrigation_source,
    soil_type = EXCLUDED.soil_type;

-- Demo Crop Cycle (Chilli, 48 days age, flowering)
INSERT INTO crop_cycles (id, field_id, crop_name, variety, sowing_date, current_stage, crop_age_days, target_yield, status)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'Chilli',
    'Teja / Guntur Sannam',
    CURRENT_DATE - INTERVAL '48 days',
    'Flowering',
    48,
    3200.0,
    'active'
) ON CONFLICT (id) DO UPDATE SET
    crop_name = EXCLUDED.crop_name,
    variety = EXCLUDED.variety,
    current_stage = EXCLUDED.current_stage,
    crop_age_days = EXCLUDED.crop_age_days;

-- Demo Soil Record
INSERT INTO soil_records (id, field_id, soil_type, is_verified, source)
VALUES (
    '70000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'Red soil',
    TRUE,
    'AEO Soil Health Card'
) ON CONFLICT (id) DO UPDATE SET
    soil_type = EXCLUDED.soil_type,
    is_verified = EXCLUDED.is_verified;

-- Demo Activities (Farm Memory Timeline)
INSERT INTO farm_activities (id, field_id, crop_cycle_id, activity_type, title, description, source, outcome, recorded_at)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'SOWING',
        'Chilli Sowing & Transplantation',
        'Planted nursery-raised Teja chilli seedlings on raised beds with drip layout.',
        'FARMER',
        'RESOLVED',
        CURRENT_TIMESTAMP - INTERVAL '48 days'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'IRRIGATION',
        'Scheduled Drip Irrigation',
        'Supplied 18mm drip water based on red soil drainage and low evaporation rate.',
        'AI',
        'RESOLVED',
        CURRENT_TIMESTAMP - INTERVAL '3 days'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'AEO_INTERVENTION',
        'AEO S. Rao Advisory',
        'Recommended organic neem oil spray (10,000 PPM) for early thrips deterrence.',
        'AEO',
        'IMPROVING',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    )
ON CONFLICT (id) DO NOTHING;

-- Demo Proactive Alerts
INSERT INTO farm_alerts (id, farmer_id, field_id, crop_cycle_id, alert_type, priority, title, summary, action_type, status, source)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111',
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'WEATHER',
        'HIGH',
        'Heavy Rainfall Expected Tomorrow',
        'Avoid irrigation in Chilli field today to prevent root zone saturation.',
        'VIEW_PLAN',
        'UNREAD',
        'WEATHER'
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'COMMUNITY_RISK',
        'HIGH',
        'Nearby Crop Health Concern',
        '6 nearby Chilli farmers reported thrips symptoms recently in Geesugonda.',
        'CHECK_CROP',
        'UNREAD',
        'COMMUNITY_SIGNAL'
    )
ON CONFLICT (id) DO NOTHING;

-- Demo Yield Estimate & Harvest Plan
INSERT INTO yield_estimates (id, crop_cycle_id, estimated_min_kg, estimated_max_kg, estimated_unit, confidence_level, factors)
VALUES (
    '60000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    2800.0,
    3600.0,
    'kg',
    'MEDIUM',
    '[{"name": "Crop Stage", "impact": "POSITIVE", "description": "Healthy flowering stage progress"}, {"name": "Irrigation", "impact": "POSITIVE", "description": "Drip system maintained optimal soil moisture"}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO harvest_plans (id, crop_cycle_id, earliest_harvest_date, latest_harvest_date, days_to_window, weather_consideration, readiness_checklist)
VALUES (
    '50000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    CURRENT_DATE + INTERVAL '42 days',
    CURRENT_DATE + INTERVAL '52 days',
    42,
    'Rain is expected around early harvest window. Monitor drying yards.',
    '["Pods turning uniform deep red color", "Soil moisture reduced 7 days prior to plucking", "Clean tarpaulins arranged for sun drying"]'::jsonb
) ON CONFLICT (id) DO NOTHING;