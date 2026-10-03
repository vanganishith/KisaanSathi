-- ==============================================================================
-- KisaanSaathi Foundation Layer Migration
-- Farm -> Field -> Crop Cycle -> Soil Records -> Farm Activities
-- ==============================================================================

-- 1. Enable Required Extensions (if not enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. TABLE: farms
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Main Farm',
    total_area NUMERIC(8,2),
    area_unit TEXT NOT NULL DEFAULT 'acres',
    location_name TEXT,
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    irrigation_type TEXT,
    default_soil_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLE: fields
CREATE TABLE IF NOT EXISTS fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Field A',
    area NUMERIC(8,2),
    area_unit TEXT NOT NULL DEFAULT 'acres',
    location_name TEXT,
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    boundary JSONB DEFAULT NULL,
    soil_reference UUID DEFAULT NULL,
    irrigation_method TEXT,
    current_crop_cycle_id UUID DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLE: crop_cycles
CREATE TABLE IF NOT EXISTS crop_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    crop_variety TEXT,
    sowing_date DATE,
    planting_date DATE,
    area NUMERIC(8,2),
    current_stage TEXT,
    stage_source TEXT DEFAULT 'calculated_from_sowing',
    crop_age_days INTEGER,
    expected_harvest_date DATE,
    irrigation_method TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned', 'active', 'harvested', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLE: soil_records
CREATE TABLE IF NOT EXISTS soil_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    soil_type TEXT,
    ph NUMERIC(4,2),
    n NUMERIC(8,2),
    p NUMERIC(8,2),
    k NUMERIC(8,2),
    organic_matter NUMERIC(5,2),
    moisture NUMERIC(5,2),
    ec NUMERIC(6,2),
    source TEXT NOT NULL DEFAULT 'farmer_statement',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    report_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLE: farm_activities
CREATE TABLE IF NOT EXISTS farm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL CHECK (
        activity_type IN (
            'sowing', 'planting', 'irrigation', 'fertilizer', 'pesticide',
            'pest_report', 'disease_report', 'crop_health_check',
            'aeo_intervention', 'weather_event', 'harvest', 'follow_up', 'general'
        )
    ),
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Add foreign keys to incidents if not existing
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL;

-- 8. Spatial and Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_farms_farmer_id ON farms(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farms_location ON farms USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_fields_farm_id ON fields(farm_id);
CREATE INDEX IF NOT EXISTS idx_fields_location ON fields USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_crop_cycles_field_id ON crop_cycles(field_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_status ON crop_cycles(status);

CREATE INDEX IF NOT EXISTS idx_soil_records_field_id ON soil_records(field_id);

CREATE INDEX IF NOT EXISTS idx_farm_activities_field_id ON farm_activities(field_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_crop_cycle_id ON farm_activities(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_event_date ON farm_activities(event_date DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_farm_id ON incidents(farm_id);
CREATE INDEX IF NOT EXISTS idx_incidents_field_id ON incidents(field_id);
CREATE INDEX IF NOT EXISTS idx_incidents_crop_cycle_id ON incidents(crop_cycle_id);

-- 9. Automated updated_at triggers
DROP TRIGGER IF EXISTS trigger_farms_updated_at ON farms;
CREATE TRIGGER trigger_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_fields_updated_at ON fields;
CREATE TRIGGER trigger_fields_updated_at
    BEFORE UPDATE ON fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_crop_cycles_updated_at ON crop_cycles;
CREATE TRIGGER trigger_crop_cycles_updated_at
    BEFORE UPDATE ON crop_cycles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_soil_records_updated_at ON soil_records;
CREATE TRIGGER trigger_soil_records_updated_at
    BEFORE UPDATE ON soil_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Row Level Security Policies
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE soil_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on farms" ON farms;
CREATE POLICY "Allow public read on farms" ON farms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on farms" ON farms;
CREATE POLICY "Allow public insert on farms" ON farms FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on farms" ON farms;
CREATE POLICY "Allow public update on farms" ON farms FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read on fields" ON fields;
CREATE POLICY "Allow public read on fields" ON fields FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on fields" ON fields;
CREATE POLICY "Allow public insert on fields" ON fields FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on fields" ON fields;
CREATE POLICY "Allow public update on fields" ON fields FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read on crop_cycles" ON crop_cycles;
CREATE POLICY "Allow public read on crop_cycles" ON crop_cycles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on crop_cycles" ON crop_cycles;
CREATE POLICY "Allow public insert on crop_cycles" ON crop_cycles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on crop_cycles" ON crop_cycles;
CREATE POLICY "Allow public update on crop_cycles" ON crop_cycles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read on soil_records" ON soil_records;
CREATE POLICY "Allow public read on soil_records" ON soil_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on soil_records" ON soil_records;
CREATE POLICY "Allow public insert on soil_records" ON soil_records FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on soil_records" ON soil_records;
CREATE POLICY "Allow public update on soil_records" ON soil_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read on farm_activities" ON farm_activities;
CREATE POLICY "Allow public read on farm_activities" ON farm_activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on farm_activities" ON farm_activities;
CREATE POLICY "Allow public insert on farm_activities" ON farm_activities FOR INSERT WITH CHECK (true);
