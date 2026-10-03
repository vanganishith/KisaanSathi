import unittest
from datetime import datetime, date, timedelta
from app.services.farm_service import farm_service
from app.services.aeo_suggestion_matcher import aeo_suggestion_matcher
from app.services.context_engine_service import context_engine_service

class TestPlanToFarmLifecycle(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Unique phone for isolated testing
        self.test_phone = f"999{int(datetime.now().timestamp() * 1000) % 10000000:07d}"
        self.farmer_name = "Ramesh"
        self.location_name = "Medchal, Telangana"
        self.latitude = 17.629
        self.longitude = 78.481

    async def test_01_first_time_crop_selection_creates_full_hierarchy(self):
        """
        Verify Plan My Crop -> Select Crop creates Farmer -> Farm -> Field -> Soil -> Crop Cycle
        with Day 1 start date.
        """
        res = await farm_service.select_crop_for_farm(
            farmer_phone=self.test_phone,
            farmer_name=self.farmer_name,
            farm_name=f"{self.farmer_name}'s Farm",
            field_name="Field 1",
            crop_name="Cotton",
            land_area_acres=2.0,
            soil_type="BLACK",
            latitude=self.latitude,
            longitude=self.longitude,
            location_name=self.location_name,
            planted_today=True,
            crop_age_days=1,
            irrigation_method="drip",
        )

        self.assertTrue(res["success"])
        self.assertEqual(res["farmer"]["name"], "Ramesh")
        self.assertEqual(res["farm"]["name"], "Ramesh's Farm")
        self.assertEqual(res["field"]["name"], "Field 1")
        self.assertEqual(res["field"]["area_acres"], 2.0)
        self.assertEqual(res["crop_cycle"]["crop_name"], "Cotton")
        self.assertEqual(res["crop_cycle"]["status"].upper(), "ACTIVE")
        self.assertEqual(res["crop_cycle"]["crop_age_days"], 1)
        self.assertEqual(res["day_number"], 1)
        self.assertIsNotNone(res["crop_stage"])

    async def test_02_planted_earlier_calculates_correct_sowing_date(self):
        """
        Verify that selecting 'I planted 25 days ago' computes the correct start_date.
        """
        res = await farm_service.select_crop_for_farm(
            farmer_phone=self.test_phone,
            farmer_name=self.farmer_name,
            crop_name="Cotton",
            land_area_acres=2.0,
            soil_type="BLACK",
            planted_today=False,
            crop_age_days=25,
        )

        self.assertTrue(res["success"])
        self.assertEqual(res["crop_cycle"]["crop_age_days"], 25)
        self.assertEqual(res["day_number"], 25)
        expected_sowing = (date.today() - timedelta(days=25)).isoformat()
        self.assertEqual(res["crop_cycle"]["sowing_date"], expected_sowing)

    async def test_03_no_duplicate_farms_on_revisiting(self):
        """
        Verify that revisiting Plan My Crop does not duplicate Farmer or Farm records.
        """
        res1 = await farm_service.select_crop_for_farm(
            farmer_phone=self.test_phone,
            farmer_name=self.farmer_name,
            crop_name="Cotton",
            land_area_acres=2.0,
            soil_type="BLACK",
            planted_today=True,
        )
        farmer_id_1 = res1["farmer"]["id"]
        farm_id_1 = res1["farm"]["id"]

        # Farmer updates or selects again for same field
        res2 = await farm_service.select_crop_for_farm(
            farmer_phone=self.test_phone,
            farmer_name=self.farmer_name,
            field_id=res1["field"]["id"],
            crop_name="Cotton",
            land_area_acres=2.0,
            soil_type="BLACK",
            planted_today=True,
        )
        farmer_id_2 = res2["farmer"]["id"]
        farm_id_2 = res2["farm"]["id"]

        self.assertEqual(farmer_id_1, farmer_id_2)
        self.assertEqual(farm_id_1, farm_id_2)

    async def test_04_multi_field_support(self):
        """
        Verify a farmer can have Field 1 (Cotton 2ac) and Field 2 (Chilli 1ac).
        """
        # Field 1
        await farm_service.select_crop_for_farm(
            farmer_phone=self.test_phone,
            farmer_name=self.farmer_name,
            field_name="Field 1",
            crop_name="Cotton",
            land_area_acres=2.0,
            soil_type="BLACK",
            planted_today=True,
        )

        # Field 2
        await farm_service.select_crop_for_farm(
            farmer_phone=self.test_phone,
            farmer_name=self.farmer_name,
            field_name="Field 2",
            crop_name="Chilli",
            land_area_acres=1.0,
            soil_type="RED",
            planted_today=False,
            crop_age_days=15,
        )

        ctx = await context_engine_service.get_unified_context(farmer_phone=self.test_phone)
        self.assertTrue(ctx["success"])
        self.assertGreaterEqual(len(ctx.get("fields", [])), 2)
        field_names = [f["name"] for f in ctx["fields"]]
        self.assertIn("Field 1", field_names)
        self.assertIn("Field 2", field_names)

    async def test_05_aeo_suggestion_matching_engine(self):
        """
        Test targeted AEO matching:
        1. Cotton + Medchal -> MATCH
        2. Chilli + Medchal -> NO MATCH (farmer has Cotton in active crop)
        3. Cotton + Warangal -> NO MATCH (farmer is in Medchal)
        """
        # Setup farmer with Cotton in Medchal
        await farm_service.select_crop_for_farm(
            farmer_phone=self.test_phone,
            farmer_name=self.farmer_name,
            crop_name="Cotton",
            land_area_acres=2.0,
            soil_type="BLACK",
            latitude=self.latitude,
            longitude=self.longitude,
            location_name="Medchal, Telangana",
            planted_today=True,
        )

        # 1. Matching suggestion
        sugg_cotton_medchal = {
            "id": "aeo-sugg-1",
            "title": "Bollworm Advisory for Cotton",
            "message": "Inspect cotton fields for pink bollworm traps in Medchal.",
            "crop": "Cotton",
            "jurisdiction": "Medchal",
            "valid_from": (date.today() - timedelta(days=1)).isoformat(),
            "valid_until": (date.today() + timedelta(days=7)).isoformat(),
            "priority": "ADVISORY"
        }
        match1 = await aeo_suggestion_matcher.match_suggestion(sugg_cotton_medchal, farmer_phone=self.test_phone)
        self.assertTrue(match1["matched"])

        # 2. Chilli suggestion (farmer has Cotton)
        sugg_chilli_medchal = {
            "id": "aeo-sugg-2",
            "title": "Thrips Alert for Chilli",
            "message": "Chilli growers in Medchal must check leaf curls.",
            "crop": "Chilli",
            "jurisdiction": "Medchal",
            "valid_from": date.today().isoformat(),
            "valid_until": (date.today() + timedelta(days=5)).isoformat(),
            "priority": "WARNING"
        }
        match2 = await aeo_suggestion_matcher.match_suggestion(sugg_chilli_medchal, farmer_phone=self.test_phone)
        self.assertFalse(match2["matched"])

        # 3. Cotton in Warangal (farmer is in Medchal)
        sugg_cotton_warangal = {
            "id": "aeo-sugg-3",
            "title": "Cotton Warning for Warangal",
            "message": "Heavy rains forecast in Warangal district.",
            "crop": "Cotton",
            "jurisdiction": "Warangal",
            "valid_from": date.today().isoformat(),
            "valid_until": (date.today() + timedelta(days=5)).isoformat(),
            "priority": "ADVISORY"
        }
        match3 = await aeo_suggestion_matcher.match_suggestion(sugg_cotton_warangal, farmer_phone=self.test_phone)
        self.assertFalse(match3["matched"])

    async def test_06_aeo_broadcast_and_idempotent_notification(self):
        """
        Verify broadcast creates notifications for matching farmers without duplicates.
        """
        # Create farmer
        await farm_service.select_crop_for_farm(
            farmer_phone=self.test_phone,
            farmer_name=self.farmer_name,
            crop_name="Cotton",
            land_area_acres=2.0,
            soil_type="BLACK",
            latitude=self.latitude,
            longitude=self.longitude,
            location_name="Medchal, Telangana",
            planted_today=True,
        )

        sugg = {
            "id": f"sugg-{int(datetime.now().timestamp() * 1000)}",
            "title": "Pink Bollworm Alert",
            "message": "Install pheromone traps this week.",
            "crop": "Cotton",
            "jurisdiction": "Medchal",
            "priority": "ADVISORY",
            "valid_from": date.today().isoformat(),
            "valid_until": (date.today() + timedelta(days=7)).isoformat(),
        }

        res_broadcast = await aeo_suggestion_matcher.broadcast_suggestion(sugg)
        self.assertTrue(res_broadcast["success"])
        self.assertGreaterEqual(res_broadcast["notifications_created"], 1)

        # Broadcast same suggestion again -> idempotent (no double notification)
        res_broadcast2 = await aeo_suggestion_matcher.broadcast_suggestion(sugg)
        self.assertEqual(res_broadcast2["notifications_created"], 0)


if __name__ == "__main__":
    unittest.main()
