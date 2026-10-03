import unittest
import asyncio
from app.services.community_signal_service import (
    create_community_report,
    create_community_report_by_voice,
    record_me_too,
    get_active_community_signals,
    get_community_feed,
    search_community_reports,
)
from app.services.context_engine_service import get_farm_context
from app.services.ai_decision_engine_service import (
    generate_farm_recommendation,
    get_today_plan,
    classify_intent_from_query,
)
from app.services.tts_service import TTSService


class TestCommunityAndVoiceLayer(unittest.IsolatedAsyncioTestCase):

    async def test_create_community_report_and_privacy_sanitization(self):
        # 1. Create a community report
        res = await create_community_report(
            farmer_phone="9876543210",
            crop="Chilli",
            category="pest",
            title="Severe Chilli Leaf Curling",
            description="Leaves are curling upwards with tiny white specks.",
            latitude=17.9689,
            longitude=79.5941,
            language="te"
        )
        self.assertTrue(res["success"])
        rep = res["report"]
        self.assertEqual(rep["crop"], "Chilli")
        self.assertEqual(rep["category"], "pest")
        self.assertIn("Warangal", rep["approx_location"])

        # 2. Verify Feed sanitizes private information
        feed = await get_community_feed(farmer_phone="9876543210", crop="Chilli")
        self.assertTrue(feed["success"])
        self.assertGreater(len(feed["reports"]), 0)
        
        # Check that feed reports never contain raw phone numbers
        for r in feed["reports"]:
            self.assertNotIn("farmer_phone", r)
            self.assertNotIn("phone", r)
            self.assertIn("approx_location", r)

    async def test_voice_community_report_creation(self):
        res = await create_community_report_by_voice(
            farmer_phone="9876543210",
            voice_input="నా మిరప పంటలో తెల్లదోమ ఎక్కువగా ఉంది ఆకులు పసుపు రంగులోకి మారుతున్నాయి",
            language="te"
        )
        self.assertTrue(res["success"])
        rep = res["report"]
        self.assertEqual(rep["crop"], "Chilli")
        self.assertEqual(rep["category"], "pest")

    async def test_me_too_interaction_and_duplicate_prevention(self):
        # Get existing report
        feed = await get_community_feed(crop="Chilli")
        rep_id = feed["reports"][0]["id"]
        initial_count = feed["reports"][0]["me_too_count"]

        # First Me Too click
        me_too_res1 = await record_me_too(report_id=rep_id, farmer_phone="9988776655")
        self.assertTrue(me_too_res1["success"])
        self.assertEqual(me_too_res1["new_me_too_count"], initial_count + 1)
        self.assertFalse(me_too_res1["already_confirmed"])

        # Duplicate Me Too from same phone
        me_too_res2 = await record_me_too(report_id=rep_id, farmer_phone="9988776655")
        self.assertTrue(me_too_res2["success"])
        self.assertTrue(me_too_res2["already_confirmed"])
        self.assertEqual(me_too_res2["new_me_too_count"], initial_count + 1)

    async def test_active_community_signals_and_context_engine_injection(self):
        # 1. Signals generation
        signals = get_active_community_signals(crop="Chilli", latitude=17.9689, longitude=79.5941)
        self.assertGreater(len(signals), 0)
        self.assertEqual(signals[0]["crop"], "Chilli")
        self.assertIn(signals[0]["signal_strength"], ["STRONG", "MODERATE", "HISTORICAL"])

        # 2. Context Engine Integration
        ctx = await get_farm_context(farmer_phone="9876543210")
        self.assertTrue(ctx["success"])
        self.assertIn("communitySignals", ctx)
        self.assertGreater(len(ctx["communitySignals"]), 0)

    async def test_ai_decision_engine_with_community_risk_and_followup_memory(self):
        # 1. Ask initial question
        res1 = await generate_farm_recommendation(
            farmer_phone="9876543210",
            user_question="నా పంటకు ఈరోజు నీళ్లు పెట్టాలా?",
            language="te"
        )
        self.assertTrue(res1["success"])

        # 2. Ask follow-up "Why?" ("ఎందుకు?")
        res2 = await generate_farm_recommendation(
            farmer_phone="9876543210",
            user_question="ఎందుకు?",
            language="te"
        )
        self.assertTrue(res2["success"])
        self.assertEqual(res2["recommendation"]["intent"], "FOLLOW_UP_EXPLANATION")
        self.assertIn("ఎందుకంటే", res2["farmer_response"])

        # 3. Today's Plan includes Community Risk priority
        plan = await get_today_plan(farmer_phone="9876543210", language="te")
        self.assertTrue(plan["success"])
        types = [p["type"] for p in plan["priorities"]]
        self.assertIn("IRRIGATION", types)
        self.assertIn("COMMUNITY_RISK", types)

    async def test_tts_service_synthesis(self):
        tts_res = await TTSService.synthesize_speech(
            text="ఈరోజు మీ పంటకు నీరు పెట్టాల్సిన అవసరం లేదు.",
            language="te"
        )
        self.assertTrue(tts_res["success"])
        self.assertEqual(tts_res["language"], "te")


if __name__ == "__main__":
    unittest.main()
