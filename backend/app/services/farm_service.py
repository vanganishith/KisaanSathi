import uuid
import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, date, timezone
from app.database.session import get_supabase_client
from app.core.phone import normalize_phone
from app.services.crop_lifecycle_service import calculate_crop_age, determine_crop_stage

logger = logging.getLogger("rythubandhu.farm_service")

# ==============================================================================
# IN-MEMORY RESILIENT DATA STORE
# Used during unit tests or when Supabase client is offline/unconfigured.
# ==============================================================================
_MEMORY_STORE = {
    "farmers": {},
    "farms": {},
    "fields": {},
    "crop_cycles": {},
    "soil_records": {},
    "farm_activities": {}
}


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


# ==============================================================================
# FARMER PROFILE MANAGEMENT
# ==============================================================================

async def get_or_create_farmer(
    phone: str,
    name: Optional[str] = None,
    preferred_language: Optional[str] = "Telugu",
    location: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Dict[str, Any]:
    norm_phone = normalize_phone(phone)
    client = get_supabase_client()

    if client:
        try:
            res = client.table("farmers").select("*").eq("phone", norm_phone).limit(1).execute()
            if res.data and len(res.data) > 0:
                farmer = res.data[0]
                # Update location or language if newly provided
                updates = {}
                if preferred_language and preferred_language != farmer.get("preferred_language"):
                    updates["preferred_language"] = preferred_language
                if location and not farmer.get("village"):
                    updates["village"] = location
                if updates:
                    client.table("farmers").update(updates).eq("id", farmer["id"]).execute()
                    farmer.update(updates)
                return farmer

            # Create new farmer
            new_id = str(uuid.uuid4())
            loc_district = location.split(",")[0].strip() if location else "Medchal"
            new_farmer = {
                "id": new_id,
                "phone": norm_phone,
                "name": name.strip() if name else "Farmer",
                "preferred_language": preferred_language or "Telugu",
                "village": location or "Medchal",
                "district": loc_district,
                "state": "Telangana"
            }
            client.table("farmers").insert(new_farmer).execute()
            return new_farmer
        except Exception as e:
            logger.warning(f"[FarmService] Supabase farmer query error: {e}. Falling back to resilient store.")

    # Fallback in-memory
    for fid, f in _MEMORY_STORE["farmers"].items():
        if f.get("phone") == norm_phone:
            if name and (f.get("name") == "Farmer" or not f.get("name")):
                f["name"] = name.strip()
            if location:
                f["village"] = location
                f["district"] = location.split(",")[0].strip()
            return f

    new_id = str(uuid.uuid4())
    loc_district = location.split(",")[0].strip() if location else "Medchal"
    new_farmer = {
        "id": new_id,
        "phone": norm_phone,
        "name": name.strip() if name else "Farmer",
        "preferred_language": preferred_language or "Telugu",
        "village": location or "Medchal",
        "district": loc_district,
        "state": "Telangana",
        "latitude": latitude,
        "longitude": longitude,
        "created_at": _now_iso(),
        "updated_at": _now_iso()
    }
    _MEMORY_STORE["farmers"][new_id] = new_farmer
    return new_farmer


async def get_farmer_profile(farmer_id: Optional[str] = None, phone: Optional[str] = None) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            query = client.table("farmers").select("*")
            if farmer_id:
                res = query.eq("id", farmer_id).limit(1).execute()
            elif phone:
                res = query.eq("phone", normalize_phone(phone)).limit(1).execute()
            else:
                return None
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Profile fetch error from Supabase: {e}")

    # Fallback store
    if farmer_id and farmer_id in _MEMORY_STORE["farmers"]:
        return _MEMORY_STORE["farmers"][farmer_id]
    if phone:
        norm = normalize_phone(phone)
        for f in _MEMORY_STORE["farmers"].values():
            if f.get("phone") == norm:
                return f
    return None


async def update_farmer_profile(farmer_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    clean_updates = {k: v for k, v in updates.items() if v is not None}
    clean_updates["updated_at"] = _now_iso()

    client = get_supabase_client()
    if client:
        try:
            res = client.table("farmers").update(clean_updates).eq("id", farmer_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Error updating farmer in Supabase: {e}")

    if farmer_id in _MEMORY_STORE["farmers"]:
        _MEMORY_STORE["farmers"][farmer_id].update(clean_updates)
        return _MEMORY_STORE["farmers"][farmer_id]
    return None


# ==============================================================================
# FARM CRUD
# ==============================================================================

async def create_farm(farmer_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    farm_id = str(uuid.uuid4())
    farm_record = {
        "id": farm_id,
        "farmer_id": farmer_id,
        "name": data.get("name") or "Main Farm",
        "total_area": float(data["total_area"]) if data.get("total_area") is not None else None,
        "area_unit": data.get("area_unit") or "acres",
        "location_name": data.get("location_name"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "irrigation_type": data.get("irrigation_type"),
        "default_soil_type": data.get("default_soil_type"),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }

    client = get_supabase_client()
    if client:
        try:
            res = client.table("farms").insert(farm_record).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase create farm error: {e}. Storing in memory fallback.")

    _MEMORY_STORE["farms"][farm_id] = farm_record
    return farm_record


async def list_farms_by_farmer(farmer_id: str) -> List[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            res = client.table("farms").select("*").eq("farmer_id", farmer_id).order("created_at", desc=False).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            logger.warning(f"[FarmService] Supabase list farms error: {e}")

    return [f for f in _MEMORY_STORE["farms"].values() if f.get("farmer_id") == farmer_id]


async def get_farm_by_id(farm_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            res = client.table("farms").select("*").eq("id", farm_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase get farm error: {e}")

    return _MEMORY_STORE["farms"].get(farm_id)


async def update_farm(farm_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    clean = {k: v for k, v in updates.items() if v is not None}
    clean["updated_at"] = _now_iso()

    client = get_supabase_client()
    if client:
        try:
            res = client.table("farms").update(clean).eq("id", farm_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase update farm error: {e}")

    if farm_id in _MEMORY_STORE["farms"]:
        _MEMORY_STORE["farms"][farm_id].update(clean)
        return _MEMORY_STORE["farms"][farm_id]
    return None


# ==============================================================================
# FIELD CRUD
# ==============================================================================

async def create_field(farm_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    field_id = str(uuid.uuid4())
    area_val = float(data.get("area_acres") or data.get("area") or 2.0)
    field_record = {
        "id": field_id,
        "farm_id": farm_id,
        "name": data.get("name") or "Field A",
        "area": area_val,
        "area_unit": data.get("area_unit") or "acres",
        "location_name": data.get("location_name"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "boundary": data.get("boundary"),
        "soil_type": data.get("soil_type") or data.get("soil_reference"),
        "irrigation_method": data.get("irrigation_method"),
        "current_crop_cycle_id": data.get("current_crop_cycle_id"),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }

    client = get_supabase_client()
    if client:
        try:
            res = client.table("fields").insert(field_record).execute()
            if res.data and len(res.data) > 0:
                inserted = dict(res.data[0])
                inserted["area_acres"] = inserted.get("area") or area_val
                _MEMORY_STORE["fields"][field_id] = inserted
                return inserted
        except Exception as e:
            logger.warning(f"[FarmService] Supabase create field error: {e}")

    field_record["area_acres"] = area_val
    _MEMORY_STORE["fields"][field_id] = field_record
    return field_record


async def list_fields_by_farm(farm_id: str) -> List[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            res = client.table("fields").select("*").eq("farm_id", farm_id).order("created_at", desc=False).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            logger.warning(f"[FarmService] Supabase list fields error: {e}")

    return [f for f in _MEMORY_STORE["fields"].values() if f.get("farm_id") == farm_id]


async def get_field_by_id(field_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            res = client.table("fields").select("*").eq("id", field_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase get field error: {e}")

    return _MEMORY_STORE["fields"].get(field_id)


async def update_field(field_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    clean = {k: v for k, v in updates.items() if v is not None}
    clean["updated_at"] = _now_iso()

    client = get_supabase_client()
    if client:
        try:
            res = client.table("fields").update(clean).eq("id", field_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase update field error: {e}")

    if field_id in _MEMORY_STORE["fields"]:
        _MEMORY_STORE["fields"][field_id].update(clean)
        return _MEMORY_STORE["fields"][field_id]
    return None


# ==============================================================================
# CROP CYCLE CRUD
# ==============================================================================

async def create_crop_cycle(field_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    cycle_id = str(uuid.uuid4())
    sowing_date = data.get("sowing_date")
    planting_date = data.get("planting_date")
    stated_age = data.get("crop_age_days")

    # Compute crop age and stage automatically
    crop_age_days, age_source = calculate_crop_age(
        sowing_date=sowing_date,
        planting_date=planting_date,
        stated_age_days=stated_age
    )

    stage_info = determine_crop_stage(
        crop_name=data.get("crop_name"),
        crop_age_days=crop_age_days,
        stated_stage=data.get("current_stage")
    )

    current_stage = stage_info.get("current_stage") or data.get("current_stage")

    cycle_record = {
        "id": cycle_id,
        "field_id": field_id,
        "crop_name": data.get("crop_name"),
        "crop_variety": data.get("crop_variety"),
        "sowing_date": str(sowing_date) if sowing_date else None,
        "planting_date": str(planting_date) if planting_date else None,
        "area": float(data["area"]) if data.get("area") is not None else None,
        "crop_age_days": crop_age_days,
        "current_stage": current_stage,
        "stage_source": age_source if age_source != "unavailable" else (data.get("stage_source") or "calculated_from_sowing"),
        "expected_harvest_date": str(data.get("expected_harvest_date")) if data.get("expected_harvest_date") else None,
        "irrigation_method": data.get("irrigation_method"),
        "status": data.get("status") or "active",
        "metadata": data.get("metadata") or {},
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }

    client = get_supabase_client()
    if client:
        try:
            res = client.table("crop_cycles").insert(cycle_record).execute()
            # Link to field
            client.table("fields").update({"current_crop_cycle_id": cycle_id}).eq("id", field_id).execute()
            if res.data and len(res.data) > 0:
                record = res.data[0]
                record["next_stage"] = stage_info.get("next_stage")
                record["days_to_next_stage"] = stage_info.get("days_to_next_stage")
                return record
        except Exception as e:
            logger.warning(f"[FarmService] Supabase create crop cycle error: {e}")

    _MEMORY_STORE["crop_cycles"][cycle_id] = cycle_record
    if field_id in _MEMORY_STORE["fields"]:
        _MEMORY_STORE["fields"][field_id]["current_crop_cycle_id"] = cycle_id

    result = dict(cycle_record)
    result["next_stage"] = stage_info.get("next_stage")
    result["days_to_next_stage"] = stage_info.get("days_to_next_stage")
    return result


async def list_crop_cycles_by_field(field_id: str) -> List[Dict[str, Any]]:
    client = get_supabase_client()
    cycles = []
    if client:
        try:
            res = client.table("crop_cycles").select("*").eq("field_id", field_id).order("created_at", desc=True).execute()
            if res.data is not None:
                cycles = res.data
        except Exception as e:
            logger.warning(f"[FarmService] Supabase list crop cycles error: {e}")

    if not cycles:
        cycles = [c for c in _MEMORY_STORE["crop_cycles"].values() if c.get("field_id") == field_id]

    # Dynamically augment with live age & stage calculation
    augmented = []
    for c in cycles:
        item = dict(c)
        age, _ = calculate_crop_age(
            sowing_date=item.get("sowing_date"),
            planting_date=item.get("planting_date"),
            stated_age_days=item.get("crop_age_days")
        )
        if age is not None:
            item["crop_age_days"] = age
            stage_info = determine_crop_stage(item.get("crop_name"), age, item.get("current_stage"))
            item["current_stage"] = stage_info.get("current_stage")
            item["next_stage"] = stage_info.get("next_stage")
            item["days_to_next_stage"] = stage_info.get("days_to_next_stage")
            item["approx_harvest_window"] = stage_info.get("approx_harvest_window")
        augmented.append(item)
    return augmented


async def get_crop_cycle_by_id(cycle_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    cycle = None
    if client:
        try:
            res = client.table("crop_cycles").select("*").eq("id", cycle_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                cycle = res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase get crop cycle error: {e}")

    if not cycle:
        cycle = _MEMORY_STORE["crop_cycles"].get(cycle_id)

    if cycle:
        item = dict(cycle)
        age, _ = calculate_crop_age(
            sowing_date=item.get("sowing_date"),
            planting_date=item.get("planting_date"),
            stated_age_days=item.get("crop_age_days")
        )
        if age is not None:
            item["crop_age_days"] = age
            stage_info = determine_crop_stage(item.get("crop_name"), age, item.get("current_stage"))
            item["current_stage"] = stage_info.get("current_stage")
            item["next_stage"] = stage_info.get("next_stage")
            item["days_to_next_stage"] = stage_info.get("days_to_next_stage")
            item["approx_harvest_window"] = stage_info.get("approx_harvest_window")
        return item
    return None


async def update_crop_cycle(cycle_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    clean = {k: v for k, v in updates.items() if v is not None}
    clean["updated_at"] = _now_iso()

    # Recalculate age/stage if dates or age updated
    if "sowing_date" in clean or "planting_date" in clean or "crop_age_days" in clean or "crop_name" in clean:
        existing = await get_crop_cycle_by_id(cycle_id) or {}
        merged = {**existing, **clean}
        age, source = calculate_crop_age(
            sowing_date=merged.get("sowing_date"),
            planting_date=merged.get("planting_date"),
            stated_age_days=merged.get("crop_age_days")
        )
        if age is not None:
            clean["crop_age_days"] = age
            clean["stage_source"] = source
            stg = determine_crop_stage(merged.get("crop_name"), age, merged.get("current_stage"))
            if stg.get("current_stage"):
                clean["current_stage"] = stg["current_stage"]

    client = get_supabase_client()
    if client:
        try:
            res = client.table("crop_cycles").update(clean).eq("id", cycle_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase update crop cycle error: {e}")

    if cycle_id in _MEMORY_STORE["crop_cycles"]:
        _MEMORY_STORE["crop_cycles"][cycle_id].update(clean)
        return _MEMORY_STORE["crop_cycles"][cycle_id]
    return None


# ==============================================================================
# SOIL RECORD CRUD
# ==============================================================================

async def create_soil_record(field_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    soil_id = str(uuid.uuid4())
    soil_record = {
        "id": soil_id,
        "field_id": field_id,
        "soil_type": data.get("soil_type"),
        "ph": float(data["ph"]) if data.get("ph") is not None else None,
        "n": float(data["n"]) if data.get("n") is not None else None,
        "p": float(data["p"]) if data.get("p") is not None else None,
        "k": float(data["k"]) if data.get("k") is not None else None,
        "organic_matter": float(data["organic_matter"]) if data.get("organic_matter") is not None else None,
        "moisture": float(data["moisture"]) if data.get("moisture") is not None else None,
        "ec": float(data["ec"]) if data.get("ec") is not None else None,
        "source": data.get("source") or "farmer_statement",
        "is_verified": bool(data.get("is_verified", False)),
        "report_url": data.get("report_url"),
        "notes": data.get("notes"),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }

    client = get_supabase_client()
    if client:
        try:
            res = client.table("soil_records").insert(soil_record).execute()
            # Link to field
            client.table("fields").update({"soil_reference": soil_id}).eq("id", field_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase create soil record error: {e}")

    _MEMORY_STORE["soil_records"][soil_id] = soil_record
    if field_id in _MEMORY_STORE["fields"]:
        _MEMORY_STORE["fields"][field_id]["soil_reference"] = soil_id
    return soil_record


async def get_soil_record_by_field(field_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            res = client.table("soil_records").select("*").eq("field_id", field_id).order("created_at", desc=True).limit(1).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase get soil record error: {e}")

    field_soils = [s for s in _MEMORY_STORE["soil_records"].values() if s.get("field_id") == field_id]
    if field_soils:
        return field_soils[-1]
    return None


async def update_soil_record(record_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    clean = {k: v for k, v in updates.items() if v is not None}
    clean["updated_at"] = _now_iso()

    client = get_supabase_client()
    if client:
        try:
            res = client.table("soil_records").update(clean).eq("id", record_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"[FarmService] Supabase update soil record error: {e}")

    if record_id in _MEMORY_STORE["soil_records"]:
        _MEMORY_STORE["soil_records"][record_id].update(clean)
        return _MEMORY_STORE["soil_records"][record_id]
    return None


# ==============================================================================
# FARM ACTIVITY CRUD & TIMELINE
# ==============================================================================

async def record_farm_activity(
    field_id: str,
    activity_type: str,
    title: str,
    description: Optional[str] = None,
    crop_cycle_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    event_date: Optional[Union[datetime, str]] = None
) -> Dict[str, Any]:
    act_id = str(uuid.uuid4())
    act_record = {
        "id": act_id,
        "field_id": field_id,
        "crop_cycle_id": crop_cycle_id,
        "activity_type": activity_type,
        "title": title,
        "description": description,
        "event_date": str(event_date) if event_date else _now_iso(),
        "source": "FARMER",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }

    client = get_supabase_client()
    if client:
        try:
            res = client.table("farm_activities").insert(act_record).execute()
            if res.data and len(res.data) > 0:
                inserted = dict(res.data[0])
                inserted["metadata"] = metadata or {}
                _MEMORY_STORE["farm_activities"][act_id] = inserted
                return inserted
        except Exception as e:
            logger.warning(f"[FarmService] Supabase create activity error: {e}")

    act_record["metadata"] = metadata or {}
    _MEMORY_STORE["farm_activities"][act_id] = act_record
    return act_record


create_activity = record_farm_activity



async def list_activities_by_field(field_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    db_acts: List[Dict[str, Any]] = []
    client = get_supabase_client()
    if client:
        try:
            res = client.table("farm_activities").select("*").eq("field_id", field_id).order("event_date", desc=True).limit(limit).execute()
            if res.data:
                db_acts = res.data
        except Exception as e:
            logger.warning(f"[FarmService] Supabase list activities error: {e}")

    mem_acts = [a for a in _MEMORY_STORE["farm_activities"].values() if a.get("field_id") == field_id]
    
    # Merge and deduplicate by id
    seen_ids = set()
    combined = []
    for act in db_acts + mem_acts:
        act_id = act.get("id")
        if act_id and act_id not in seen_ids:
            seen_ids.add(act_id)
            combined.append(act)
        elif not act_id:
            combined.append(act)

    combined.sort(key=lambda x: str(x.get("event_date", x.get("created_at", ""))), reverse=True)
    return combined[:limit]


# ==============================================================================
# UNIFIED CROP SELECTION & FARM SETUP FLOW
# ==============================================================================

async def select_crop_for_farm(
    farmer_phone: str,
    crop_name: str,
    area_acres: Optional[float] = None,
    soil_type: str = "BLACK",
    farmer_name: Optional[str] = "Farmer",
    farm_name: Optional[str] = None,
    field_name: Optional[str] = None,
    location_name: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    planted_today: bool = True,
    planting_date: Optional[str] = None,
    crop_age_days: Optional[int] = None,
    irrigation_method: Optional[str] = "drip",
    field_id: Optional[str] = None,
    farm_id: Optional[str] = None,
    land_area_acres: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Core Product Flow: Connects 'Plan My Crop' selection into a real persisted farm lifecycle.
    1. Gets or creates the Farmer.
    2. Reuses existing Farm or creates one.
    3. Reuses existing Field or creates a new Field for multi-field farms.
    4. Records Soil data.
    5. Creates an active Crop Cycle with dynamic start date (Day 1 if today, or specified age).
    6. Logs event into Farm Memory.
    """
    from datetime import timedelta
    norm_phone = normalize_phone(farmer_phone)
    actual_acres = float(land_area_acres if land_area_acres is not None else (area_acres if area_acres is not None else 2.0))

    # 1. Get or create Farmer
    farmer = await get_or_create_farmer(
        phone=norm_phone,
        name=farmer_name,
        location=location_name,
        latitude=latitude,
        longitude=longitude
    )
    resolved_farmer_id = farmer["id"]

    # 2. Get or create Farm
    active_farm = None
    if farm_id:
        active_farm = await get_farm_by_id(farm_id)

    if not active_farm:
        farms = await list_farms_by_farmer(resolved_farmer_id)
        if farms:
            active_farm = farms[0]
            # Update default soil or area if empty
            if not active_farm.get("default_soil_type") or not active_farm.get("total_area"):
                await update_farm(active_farm["id"], {
                    "total_area": active_farm.get("total_area") or actual_acres,
                    "default_soil_type": active_farm.get("default_soil_type") or soil_type
                })
        else:
            active_farm = await create_farm(resolved_farmer_id, {
                "name": farm_name or f"{farmer.get('name', 'Main')} Farm",
                "total_area": actual_acres,
                "location_name": location_name or farmer.get("village"),
                "latitude": latitude or farmer.get("latitude"),
                "longitude": longitude or farmer.get("longitude"),
                "default_soil_type": soil_type,
                "irrigation_type": irrigation_method
            })

    # 3. Get or create Field
    active_field = None
    if field_id:
        active_field = await get_field_by_id(field_id)

    if not active_field:
        fields = await list_fields_by_farm(active_farm["id"])
        if fields and len(fields) == 1 and not fields[0].get("current_crop_cycle_id") and not field_name:
            active_field = fields[0]
            await update_field(active_field["id"], {
                "area": actual_acres,
                "soil_reference": soil_type,
                "irrigation_method": irrigation_method
            })
        else:
            target_field_name = field_name or f"Field {len(fields) + 1}"
            active_field = await create_field(active_farm["id"], {
                "name": target_field_name,
                "area": actual_acres,
                "soil_reference": soil_type,
                "irrigation_method": irrigation_method,
                "location_name": location_name or active_farm.get("location_name"),
                "latitude": latitude or active_farm.get("latitude"),
                "longitude": longitude or active_farm.get("longitude"),
            })

    # 4. Record Soil Data
    await create_soil_record(active_field["id"], {
        "soil_type": soil_type,
        "source": "farmer_statement",
        "is_verified": True
    })

    # 5. Compute Sowing Date and Initial Crop Age
    now_date = datetime.now(timezone.utc).date()
    calculated_age = 1
    sowing_date_iso = now_date.isoformat()

    if planted_today or (not planting_date and not crop_age_days):
        sowing_date_iso = now_date.isoformat()
        calculated_age = 1
    elif crop_age_days is not None and int(crop_age_days) > 0:
        calculated_age = int(crop_age_days)
        sowing_date_iso = (now_date - timedelta(days=calculated_age)).isoformat()
    elif planting_date:
        try:
            p_dt = datetime.fromisoformat(str(planting_date).replace("Z", "")).date()
            calculated_age = max(1, (now_date - p_dt).days)
            sowing_date_iso = p_dt.isoformat()
        except Exception:
            sowing_date_iso = now_date.isoformat()
            calculated_age = 1

    stage_info = determine_crop_stage(crop_name=crop_name, crop_age_days=calculated_age)

    # 6. Create Active Crop Cycle
    crop_cycle = await create_crop_cycle(active_field["id"], {
        "crop_name": crop_name,
        "area": actual_acres,
        "sowing_date": sowing_date_iso,
        "crop_age_days": calculated_age,
        "current_stage": stage_info.get("current_stage"),
        "irrigation_method": irrigation_method,
        "status": "active"
    })

    # 7. Log Activity in Farm Memory
    try:
        from app.services.farm_memory_service import farm_memory_service
        await farm_memory_service.log_automatic_event(
            farmer_phone=norm_phone,
            field_id=active_field["id"],
            crop_cycle_id=crop_cycle["id"],
            activity_type="sowing",
            title=f"🌱 {crop_name} Sown ({active_field.get('name', 'Field')})",
            description=f"{crop_name} planted on {area_acres} acres ({soil_type} soil). Day {calculated_age} active.",
            source="PLAN_MY_CROP",
            outcome="ACTIVE"
        )
    except Exception as e:
        logger.warning(f"[FarmService] Error logging sowing activity: {e}")

    return {
        "success": True,
        "message": f"Successfully started {crop_name} on {active_field.get('name', 'Field')} ({area_acres} acres).",
        "farmer": farmer,
        "farm": active_farm,
        "field": active_field,
        "crop_cycle": crop_cycle,
        "crop_stage": stage_info,
        "day_number": calculated_age
    }


class FarmService:
    """Class wrapper providing object interface to farm service functions."""
    get_or_create_farmer = staticmethod(get_or_create_farmer)
    get_farmer_profile = staticmethod(get_farmer_profile)
    update_farmer_profile = staticmethod(update_farmer_profile)
    create_farm = staticmethod(create_farm)
    list_farms_by_farmer = staticmethod(list_farms_by_farmer)
    get_farm_by_id = staticmethod(get_farm_by_id)
    update_farm = staticmethod(update_farm)
    create_field = staticmethod(create_field)
    list_fields_by_farm = staticmethod(list_fields_by_farm)
    get_field_by_id = staticmethod(get_field_by_id)
    update_field = staticmethod(update_field)
    create_crop_cycle = staticmethod(create_crop_cycle)
    list_crop_cycles_by_field = staticmethod(list_crop_cycles_by_field)
    get_crop_cycle_by_id = staticmethod(get_crop_cycle_by_id)
    update_crop_cycle = staticmethod(update_crop_cycle)
    create_soil_record = staticmethod(create_soil_record)
    get_soil_record_by_field = staticmethod(get_soil_record_by_field)
    update_soil_record = staticmethod(update_soil_record)
    record_farm_activity = staticmethod(record_farm_activity)
    list_activities_by_field = staticmethod(list_activities_by_field)
    select_crop_for_farm = staticmethod(select_crop_for_farm)


farm_service = FarmService()


