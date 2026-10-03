-- ==============================================================================
-- KisaanSaathi Core Intelligence Layer Migration
-- Recommendations, Crop Health Assessments, and Intelligence History
-- ==============================================================================

-- 1. TABLE: recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
    intent TEXT NOT NULL CHECK (
        intent IN (
            'IRRIGATION', 'FERTILIZER', 'CROP_HEALTH', 'GENERAL_CROP_ADVICE',
            'WEATHER_RISK', 'CROP_PLANNING', 'HARVEST_PLANNING', 'YIELD_ESTIMATION'
        )
    ),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    farmer_response TEXT NOT NULL,
    reasoning TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    confidence NUMERIC(4,3) DEFAULT 0.850,
    actions JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    factors JSONB DEFAULT '[]'::jsonb,
    requires_aeo BOOLEAN NOT NULL DEFAULT FALSE,
    language TEXT NOT NULL DEFAULT 'te',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'applied', 'dismissed', 'superseded')),
    context_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLE: crop_health_assessments
CREATE TABLE IF NOT EXISTS crop_health_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    transcript TEXT,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    possible_issues JSONB DEFAULT '[]'::jsonb,
    observations JSONB DEFAULT '[]'::jsonb,
    evidence JSONB DEFAULT '[]'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    confidence NUMERIC(4,3) DEFAULT 0.800,
    image_status TEXT NOT NULL DEFAULT 'VALID' CHECK (image_status IN ('VALID', 'IMAGE_INSUFFICIENT', 'NO_VEGETATION', 'BLURRY')),
    requires_aeo BOOLEAN NOT NULL DEFAULT TRUE,
    aeo_status TEXT NOT NULL DEFAULT 'pending' CHECK (aeo_status IN ('pending', 'reviewed', 'escalated', 'resolved')),
    language TEXT NOT NULL DEFAULT 'te',
    farmer_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES for fast lookup
CREATE INDEX IF NOT EXISTS idx_recommendations_farmer ON recommendations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_field ON recommendations(field_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_intent ON recommendations(intent);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crop_health_farmer ON crop_health_assessments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_crop_health_field ON crop_health_assessments(field_id);
CREATE INDEX IF NOT EXISTS idx_crop_health_incident ON crop_health_assessments(incident_id);
CREATE INDEX IF NOT EXISTS idx_crop_health_created_at ON crop_health_assessments(created_at DESC);
