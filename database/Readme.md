# KisaanSaathi Database

## Overview

KisaanSaathi uses **Supabase PostgreSQL with PostGIS** as its primary database.

The database is designed to support:

- Farmer identification using phone numbers
- Agricultural incident reporting
- AEO/AO officer assignment
- Geographic incident and officer tracking
- AI-based incident analysis
- Geographic and temporal incident clustering
- Community-based incident confirmation
- Farmer community posts and comments
- Spatial queries using PostGIS

---

## Technology

- **Database:** PostgreSQL
- **Platform:** Supabase
- **Geospatial Extension:** PostGIS
- **UUID Extension:** uuid-ossp
- **Geospatial Coordinate System:** EPSG:4326
- **Geospatial Data Type:** `GEOGRAPHY(Point, 4326)`

The schema enables both `uuid-ossp` and `postgis` extensions.

---

## Database Structure

The database consists of the following core tables:

### 1. `farmers`

Stores farmer identity, contact information, preferred language, location, and timestamps.

Important fields:

- `id` - UUID primary key
- `name` - Farmer name
- `phone` - Unique farmer lookup key
- `preferred_language`
- `village`
- `district`
- `state`
- `location` - Geographic point

Farmers are identified primarily through their unique phone number.

---

### 2. `officers`

Stores Agricultural Extension Officers (AEOs), Agricultural Officers (AOs), and administrators.

Important fields:

- `id` - UUID primary key
- `name`
- `phone`
- `email`
- `role`
- `assigned_area`
- `location`
- `is_active`

Supported roles:

- `AEO`
- `AO`
- `ADMIN`

---

### 3. `clusters`

Represents geographic/temporal groups of similar agricultural incidents.

Important fields:

- `crop`
- `possible_condition`
- `center_location`
- `incident_count`
- `confirmation_count`
- `risk_score`
- `confidence`
- `status`

Cluster statuses:

- `EMERGING`
- `ACTIVE`
- `CONFIRMED`
- `RESOLVED`
- `DISMISSED`

---

### 4. `incidents`

This is the core table for farmer-reported agricultural problems.

Each incident belongs to a farmer and can optionally be assigned to an officer and/or cluster.

Important fields:

- `farmer_id`
- `assigned_aeo_id`
- `cluster_id`
- `crop`
- `description`
- `language`
- `location`
- `location_source`
- `photo_url`
- `photos`
- `audio_url`
- `status`
- `priority`
- `risk_score`
- `reported_at`
- `acknowledged_at`
- `resolved_at`

Supported location sources:

- `GPS`
- `REGISTERED_AREA`
- `MANUAL`
- `UNKNOWN`

Incident lifecycle:

```text
NEW
  ↓
AI_ANALYZED
  ↓
AEO_NOTIFIED
  ↓
ACKNOWLEDGED
  ↓
INVESTIGATING
  ↓
ACTION_TAKEN
  ↓
RESOLVED