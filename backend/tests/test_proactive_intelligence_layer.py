import unittest
import asyncio
from app.services.alert_engine_service import alert_engine_service
from app.services.farm_memory_service import farm_memory_service
from app.services.yield_harvest_service import yield_harvest_service
from app.services.market_price_service import market_price_service
from app.services.analytics_service import analytics_service
from app.services.aeo_intelligence_service import aeo_intelligence_service


class TestProactiveIntelligenceLayer(unittest.IsolatedAsyncioTestCase):

    async def test_alert_engine_generation_and_deduplication(self):
        farmer_phone = "9876543210"
        alerts = await alert_engine_service.evaluate_farmer_alerts(
            farmer_phone=farmer_phone,
            language="te"
        )
        self.assertIsInstance(alerts, list)
        self.assertGreaterEqual(len(alerts), 1)

        first_alert = alerts[0]
        self.assertIn("title", first_alert)
        self.assertIn("priority", first_alert)
        self.assertIn(first_alert["status"], ["UNREAD", "READ", "ACTIONED", "EXPIRED"])

        # Test deduplication: evaluating again immediately should not duplicate
        initial_count = len(alerts)
        alerts_second = await alert_engine_service.evaluate_farmer_alerts(farmer_phone=farmer_phone)
        self.assertEqual(len(alerts_second), initial_count)

        # Mark read and action
        alert_id = first_alert["id"]
        read_res = await alert_engine_service.mark_alert_read(alert_id=alert_id, farmer_phone=farmer_phone)
        self.assertTrue(read_res)

        action_res = await alert_engine_service.action_alert(alert_id=alert_id, farmer_phone=farmer_phone)
        self.assertTrue(action_res)

    async def test_farm_memory_activity_logging_and_timeline(self):
        farmer_phone = "9876543210"
        # Automatic activity creation with explicit source and outcome
        event = await farm_memory_service.log_automatic_event(
            farmer_phone=farmer_phone,
            field_id="demo-field-1",
            crop_cycle_id="demo-cycle-1",
            activity_type="irrigation",
            title="💧 Drip Fertigation Run",
            description="2 hours drip irrigation with potassium balance",
            source="FARMER",
            outcome="RESOLVED"
        )
        self.assertIsNotNone(event)

        timeline = await farm_memory_service.get_farm_timeline(farmer_phone=farmer_phone)
        self.assertIsInstance(timeline, list)
        self.assertGreaterEqual(len(timeline), 1)

        # Check source and icon
        found = any(t["source"] in ["FARMER", "AEO", "AI", "WEATHER", "SYSTEM"] for t in timeline)
        self.assertTrue(found)

    async def test_yield_estimation_factors_and_harvest_plan(self):
        farmer_phone = "9876543210"
        estimate = await yield_harvest_service.estimate_crop_yield(
            farmer_phone=farmer_phone,
            crop_cycle_id="demo-cycle-1"
        )
        self.assertTrue(estimate["success"])
        self.assertIn("estimated_min_kg", estimate)
        self.assertIn("estimated_max_kg", estimate)
        self.assertGreater(estimate["estimated_max_kg"], estimate["estimated_min_kg"])
        self.assertTrue(estimate["is_ai_assisted"])
        self.assertIsInstance(estimate["factors"], list)

        # Harvest plan
        plan = await yield_harvest_service.get_harvest_plan(farmer_phone=farmer_phone)
        self.assertTrue(plan["success"])
        self.assertIn("expected_window_start", plan)
        self.assertIn("expected_window_end", plan)
        self.assertIn("weather_consideration", plan)

        # Record actual harvest
        harvest_rec = await yield_harvest_service.record_actual_harvest(
            farmer_phone=farmer_phone,
            crop_cycle_id="demo-cycle-1",
            actual_yield_kg=1650.0,
            unit="kg",
            quality_grade="Grade A"
        )
        self.assertEqual(harvest_rec["actual_yield_kg"], 1650.0)

    async def test_market_price_service(self):
        res = await market_price_service.get_market_prices(commodity="Chilli", state="Telangana")
        self.assertTrue(res["success"])
        self.assertEqual(res["commodity"], "Chilli")
        self.assertGreaterEqual(len(res["prices"]), 1)
        self.assertIn("modal_price_per_quintal", res["prices"][0])

    async def test_farm_analytics_aggregation(self):
        farmer_phone = "9876543210"
        analytics = await analytics_service.get_farm_analytics(farmer_phone=farmer_phone)
        self.assertTrue(analytics["success"])
        self.assertGreater(analytics["total_farm_area_acres"], 0.0)
        self.assertIn("total_irrigations", analytics)
        self.assertIn("resolved_issues", analytics)
        self.assertIsInstance(analytics["crops"], list)

    async def test_aeo_intelligence_prioritization_and_advisories(self):
        # AEO prioritized cases
        cases = await aeo_intelligence_service.get_prioritized_cases()
        self.assertIsInstance(cases, list)
        self.assertGreaterEqual(len(cases), 1)
        first_case = cases[0]
        self.assertIn("prioritization_reasons", first_case)
        self.assertGreaterEqual(len(first_case["prioritization_reasons"]), 1)

        # AEO Broadcast Advisory
        adv = await aeo_intelligence_service.broadcast_official_advisory(
            officer_phone="9876543299",
            officer_name="AEO Ramesh Kumar",
            region="Warangal Rural",
            crop="Chilli",
            issue_category="pest",
            title="Advisory on Thrips Management",
            advisory_text="Use sticky traps and organic neem spray; avoid chemical spray before expected rainfall."
        )
        self.assertIn("id", adv)
        self.assertEqual(adv["officer_name"], "AEO Ramesh Kumar")

        # Case Outcome Update
        outcome_res = await aeo_intelligence_service.update_case_outcome(
            case_id="case-ramesh-1",
            outcome="IMPROVING",
            officer_notes="Leaf curl reducing after neem oil application."
        )
        self.assertEqual(outcome_res["outcome"], "IMPROVING")


if __name__ == "__main__":
    unittest.main()
