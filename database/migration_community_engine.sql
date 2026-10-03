-- ==============================================================================
-- KisaanSaathi Community Engine & Signal Intelligence Migration
-- Phases 9 & 10: Agricultural Intelligence, Anonymized Privacy & Signals
-- ==============================================================================

-- 1. TABLE: community_reports
CREATE TABLE IF NOT EXISTS community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    crop TEXT NOT NULL DEFAULT 'Chilli',
    category TEXT NOT NULL DEFAULT 'crop_health' CHECK (
        category IN (
            'pest', 'disease', 'crop_health', 'weather_damage',
            'irrigation', 'soil', 'fertilizer', 'crop_planning', 'other'
        )
    ),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    transcript TEXT,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    approx_location TEXT NOT NULL DEFAULT 'Near your locality',
    visibility TEXT NOT NULL DEFAULT 'PUBLIC_COMMUNITY' CHECK (
        visibility IN ('PUBLIC_COMMUNITY', 'ANONYMIZED_REGIONAL', 'PRIVATE', 'AEO_ONLY')
    ),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'under_review')),
    ai_classification TEXT,
    ai_confidence NUMERIC(4,3) DEFAULT 0.850,
    me_too_count INTEGER NOT NULL DEFAULT 0,
    aeo_verified BOOLEAN NOT NULL DEFAULT FALSE,
    aeo_guidance TEXT,
    officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLE: community_signals
CREATE TABLE IF NOT EXISTS community_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop TEXT NOT NULL,
    issue_category TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    affected_region TEXT NOT NULL,
    center_location GEOGRAPHY(Point, 4326),
    center_latitude DOUBLE PRECISION,
    center_longitude DOUBLE PRECISION,
    radius_km NUMERIC(5,2) DEFAULT 7.50,
    nearby_report_count INTEGER NOT NULL DEFAULT 1,
    time_window TEXT NOT NULL DEFAULT 'recent',
    signal_strength TEXT NOT NULL DEFAULT 'STRONG' CHECK (signal_strength IN ('STRONG', 'MODERATE', 'HISTORICAL')),
    confidence NUMERIC(4,3) DEFAULT 0.850,
    aeo_guidance TEXT,
    aeo_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    first_observed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_observed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLE: community_me_too
CREATE TABLE IF NOT EXISTS community_me_too (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES community_reports(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    farmer_phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_report_farmer_me_too UNIQUE (report_id, farmer_phone)
);

-- 4. SPATIAL & PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_community_reports_farmer ON community_reports(farmer_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_crop ON community_reports(crop);
CREATE INDEX IF NOT EXISTS idx_community_reports_category ON community_reports(category);
CREATE INDEX IF NOT EXISTS idx_community_reports_visibility ON community_reports(visibility);
CREATE INDEX IF NOT EXISTS idx_community_reports_created_at ON community_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reports_location ON community_reports USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_community_signals_crop ON community_signals(crop);
CREATE INDEX IF NOT EXISTS idx_community_signals_active ON community_signals(is_active);
CREATE INDEX IF NOT EXISTS idx_community_signals_location ON community_signals USING GIST(center_location);

CREATE INDEX IF NOT EXISTS idx_community_me_too_report ON community_me_too(report_id);
CREATE INDEX IF NOT EXISTS idx_community_me_too_phone ON community_me_too(farmer_phone);

-- 5. RLS POLICIES FOR ANONYMIZED PRIVACY
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_me_too ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read on active community reports" ON community_reports;
CREATE POLICY "Public read on active community reports" ON community_reports
    FOR SELECT USING (visibility IN ('PUBLIC_COMMUNITY', 'ANONYMIZED_REGIONAL'));

DROP POLICY IF EXISTS "Public insert on community reports" ON community_reports;
CREATE POLICY "Public insert on community reports" ON community_reports
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update on community reports" ON community_reports;
CREATE POLICY "Public update on community reports" ON community_reports
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public read on community signals" ON community_signals;
CREATE POLICY "Public read on community signals" ON community_signals
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert on community signals" ON community_signals;
CREATE POLICY "Public insert on community signals" ON community_signals
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public me too access" ON community_me_too;
CREATE POLICY "Public me too access" ON community_me_too
    FOR ALL USING (true);
