-- Migration: Phase 13-17 Proactive Intelligence, Farm Memory, Yield Estimation, Harvest, Analytics & AEO Intelligence

-- 1. Farm Alerts & Proactive Notifications Table
CREATE TABLE IF NOT EXISTS public.farm_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_phone TEXT NOT NULL,
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
    crop_cycle_id UUID REFERENCES public.crop_cycles(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('WEATHER', 'IRRIGATION', 'FERTILIZER', 'CROP_STAGE', 'CROP_HEALTH', 'DISEASE_RISK', 'COMMUNITY_RISK', 'HARVEST', 'GENERAL_FARM', 'AEO_ADVISORY')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    detailed_reasoning TEXT,
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    source TEXT NOT NULL DEFAULT 'DECISION_ENGINE',
    status TEXT NOT NULL DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ', 'DISMISSED', 'ACTIONED', 'EXPIRED')),
    action_type TEXT DEFAULT 'VIEW_PLAN',
    action_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    action_taken_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_farm_alerts_phone_status ON public.farm_alerts(farmer_phone, status);
CREATE INDEX IF NOT EXISTS idx_farm_alerts_created_at ON public.farm_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farm_alerts_expires_at ON public.farm_alerts(expires_at);

-- 2. Extended Activity Source & Outcome Tracking on Farm Activities
ALTER TABLE public.farm_activities 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'FARMER' CHECK (source IN ('FARMER', 'AI', 'AEO', 'WEATHER', 'SYSTEM', 'COMMUNITY')),
ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'UNKNOWN' CHECK (outcome IN ('RESOLVED', 'IMPROVING', 'NO_CHANGE', 'WORSENING', 'UNKNOWN')),
ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;

-- 3. Yield Estimates Table
CREATE TABLE IF NOT EXISTS public.yield_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID REFERENCES public.crop_cycles(id) ON DELETE CASCADE,
    farmer_phone TEXT NOT NULL,
    crop_name TEXT NOT NULL,
    estimated_min_kg DOUBLE PRECISION NOT NULL,
    estimated_max_kg DOUBLE PRECISION NOT NULL,
    estimated_unit TEXT DEFAULT 'kg',
    confidence DOUBLE PRECISION DEFAULT 0.80,
    factors JSONB DEFAULT '[]'::jsonb,
    is_ai_assisted BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yield_estimates_cycle ON public.yield_estimates(crop_cycle_id);

-- 4. Harvest Records Table (Actual Harvest Output)
CREATE TABLE IF NOT EXISTS public.harvest_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID REFERENCES public.crop_cycles(id) ON DELETE CASCADE,
    farmer_phone TEXT NOT NULL,
    harvest_date DATE DEFAULT CURRENT_DATE,
    actual_yield_kg DOUBLE PRECISION NOT NULL,
    unit TEXT DEFAULT 'kg',
    quality_grade TEXT DEFAULT 'standard',
    market_sold_price_per_unit DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harvest_records_cycle ON public.harvest_records(crop_cycle_id);

-- 5. Harvest Plans Table
CREATE TABLE IF NOT EXISTS public.harvest_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID REFERENCES public.crop_cycles(id) ON DELETE CASCADE,
    expected_window_start DATE,
    expected_window_end DATE,
    weather_consideration TEXT,
    monitoring_points JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AEO Official Advisories Table
CREATE TABLE IF NOT EXISTS public.aeo_advisories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_phone TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    region TEXT NOT NULL,
    crop TEXT,
    issue_category TEXT,
    title TEXT NOT NULL,
    advisory_text TEXT NOT NULL,
    target_farmers_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aeo_advisories_region_crop ON public.aeo_advisories(region, crop);

-- 7. RLS Policies
ALTER TABLE public.farm_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aeo_advisories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own alerts" ON public.farm_alerts
    FOR SELECT USING (farmer_phone = current_setting('request.jwt.claim.phone', true) OR current_setting('request.jwt.claim.role', true) = 'authenticated');

CREATE POLICY "Farmers can manage own alerts" ON public.farm_alerts
    FOR ALL USING (farmer_phone = current_setting('request.jwt.claim.phone', true) OR current_setting('request.jwt.claim.role', true) = 'authenticated');

CREATE POLICY "Farmers can view own yield estimates" ON public.yield_estimates
    FOR SELECT USING (farmer_phone = current_setting('request.jwt.claim.phone', true) OR current_setting('request.jwt.claim.role', true) = 'authenticated');

CREATE POLICY "Farmers can view own harvest records" ON public.harvest_records
    FOR SELECT USING (farmer_phone = current_setting('request.jwt.claim.phone', true) OR current_setting('request.jwt.claim.role', true) = 'authenticated');

CREATE POLICY "Public read for AEO Advisories" ON public.aeo_advisories
    FOR SELECT USING (true);
