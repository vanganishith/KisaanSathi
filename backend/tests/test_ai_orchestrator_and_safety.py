import unittest
import asyncio
from unittest.mock import patch, MagicMock
from PIL import Image
import io

from app.services.ai_orchestrator_service import (
    AIOrchestrator,
    AIEvidenceContract,
    CompletenessEngine,
    IntentEngine,
    RiskEngine
)


class TestAIOrchestratorAndSafety(unittest.TestCase):

    def setUp(self):
        self.orchestrator = AIOrchestrator()

    def test_completeness_engine_missing_crop(self):
        # Query with symptoms but missing crop should trigger gating
        res = CompletenessEngine.evaluate_inquiry(
            text="ఆకుల కింద చిన్న నల్లటి పురుగులు కనిపిస్తున్నాయి, ఆకులు ముడుచుకుంటున్నాయి.",
            known_crop=None,
            language="te"
        )
        self.assertFalse(res["is_complete"])
        self.assertIn("crop", res["missing_fields"])
        self.assertIsNotNone(res["prompt_question"])
        self.assertTrue(len(res["suggested_chips"]) > 0)

    def test_completeness_engine_crop_supplied_unlocks(self):
        # Query with explicit crop should unlock workflow
        res = CompletenessEngine.evaluate_inquiry(
            text="మిరపలో ఆకులు ముడుచుకుంటున్నాయి.",
            known_crop=None,
            language="te"
        )
        self.assertTrue(res["is_complete"])
        self.assertEqual(res["detected_crop"], "Chilli")
        self.assertTrue(res["workflow_unlocked"])

    def test_evidence_contract_structure_and_clamping(self):
        contract = AIEvidenceContract.create(
            observation="Observed leaf curling and yellowing on Chilli foliage.",
            possible_condition="Possible Chilli Thrips Infestation",
            evidence=["Curled leaves", "Dry weather in forecast"],
            confidence=1.5,  # Should be clamped to 1.0
            severity=-0.2,   # Should be clamped to 0.0
            evidence_quality="high",
            uncertainties=["Requires physical inspection"],
            recommended_next_action="Inspect leaf undersides.",
            requires_aeo_review=True
        )
        self.assertEqual(contract["confidence"], 1.0)
        self.assertEqual(contract["severity"], 0.0)
        self.assertEqual(contract["evidence_quality"], "HIGH")
        self.assertTrue(contract["requires_aeo_review"])
        self.assertIn("model_metadata", contract)

    def test_risk_engine_distinguishes_confidence_quality_and_severity(self):
        # High severity (0.90) but low evidence quality should not produce ungrounded certainty
        priority, reasons = RiskEngine.calculate_priority(
            severity=0.90,
            confidence=0.40,
            evidence_quality="DEGRADED",
            is_community_outbreak=True,
            is_sensitive_crop_stage=True
        )
        self.assertIn(priority, ["HIGH", "CRITICAL"])
        self.assertTrue(any("quality is low or degraded" in r for r in reasons))
        self.assertTrue(any("flowering/fruiting" in r for r in reasons))

    def test_intent_classification(self):
        self.assertEqual(IntentEngine.classify("ఈరోజు నీళ్లు పెట్టాలా?"), "IRRIGATION")
        self.assertEqual(IntentEngine.classify("ఏ ఎరువు వేయాలి?"), "FERTILIZER")
        self.assertEqual(IntentEngine.classify("ఆకులు ఎండిపోతున్నాయి, పురుగులు ఉన్నాయి"), "CROP_HEALTH")
        self.assertEqual(IntentEngine.classify("వర్షం ఎప్పుడు పడుతుంది?"), "WEATHER_RISK")
        self.assertEqual(IntentEngine.classify("ఎందుకు అలా చెప్పారు?"), "FOLLOW_UP_EXPLANATION")

    def test_blurry_and_degraded_image_handling(self):
        # Create a small blank image (low quality/unusable)
        img = Image.new("RGB", (20, 20), color=(10, 10, 10))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        raw_bytes = buf.getvalue()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            self.orchestrator.vision_engine.analyze_visual_evidence(
                image_data_list=[raw_bytes],
                crop_name="Chilli",
                context={},
                language="te"
            )
        )
        self.assertEqual(result["evidence_quality"], "DEGRADED")
        self.assertTrue(result["confidence"] < 0.50)
        self.assertTrue(result["requires_aeo_review"])

    def test_orchestrate_decision_flow_incomplete_then_complete(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # 1. Incomplete request
        res1 = loop.run_until_complete(
            self.orchestrator.orchestrate_decision(
                query="నా ఆకులు రాలిపోతున్నాయి",
                crop=None
            )
        )
        self.assertEqual(res1["workflow_status"], "NEEDS_CLARIFICATION")
        self.assertIn("crop", res1["missing_fields"])

        # 2. Complete request
        res2 = loop.run_until_complete(
            self.orchestrator.orchestrate_decision(
                query="మిరపలో ఆకులు రాలిపోతున్నాయి",
                crop="Chilli"
            )
        )
        self.assertEqual(res2["workflow_status"], "COMPLETED")
        self.assertEqual(res2["crop"], "Chilli")
        self.assertIn("contract", res2)


if __name__ == "__main__":
    unittest.main()
