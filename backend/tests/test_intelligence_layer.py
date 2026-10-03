import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.crop_knowledge_base import get_crop_knowledge, get_soil_properties
from app.services.ai_decision_engine_service import classify_intent_from_query

client = TestClient(app)


class TestCoreIntelligenceLayer(unittest.TestCase):

    def test_crop_knowledge_base_lookup(self):
        chilli_kb = get_crop_knowledge("Chilli")
        self.assertIsNotNone(chilli_kb)
        self.assertIn("critical_moisture_stages", chilli_kb)
        self.assertIn("Flowering", chilli_kb["critical_moisture_stages"])
        self.assertIn("nutrient_guidance", chilli_kb)
        self.assertIn("common_pests", chilli_kb)

        soil_props = get_soil_properties("Black soil")
        self.assertEqual(soil_props["water_retention_days"], 4)

    def test_intent_classification_from_telugu_queries(self):
        self.assertEqual(classify_intent_from_query("నా పంటకు ఎప్పుడు నీళ్లు పెట్టాలి?"), "IRRIGATION")
        self.assertEqual(classify_intent_from_query("ఈరోజు ఎరువు వేయవచ్చా?"), "FERTILIZER")
        self.assertEqual(classify_intent_from_query("ఆకులు ముడుచుకుపోయాయి పురుగు మందు ఏమిటి?"), "CROP_HEALTH")
        self.assertEqual(classify_intent_from_query("వర్షం వస్తుందా?"), "WEATHER_RISK")
        self.assertEqual(classify_intent_from_query("ఇప్పుడు నా చేనులో ఏం చేయాలి?"), "GENERAL_CROP_ADVICE")

    def test_irrigation_recommendation_defer_on_rain_or_recent_irrigation(self):
        phone = "9876543201"
        
        # 1. Onboard Ramesh (Chilli, 48 days, drip, red soil)
        client.post("/api/v1/farmer/voice-update", json={
            "farmer_phone": phone,
            "text_input": "నా పేరు రమేష్. నేను వరంగల్ దగ్గర ఉంటాను. నా రెండు ఎకరాల్లో మిరప ఉంది. మిరప వేసి 48 రోజులు అయింది. ఈ పొలానికి డ్రిప్ ఉంది. ఈ పొలం ఎర్ర నేల.",
            "language": "te"
        })

        # 2. Get irrigation recommendation
        res = client.get(f"/api/v1/ai/irrigation/recommendation?farmer_phone={phone}&language=te")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("decision", data)
        self.assertIn(data["decision"], ["DEFER", "IRRIGATE_NOW", "IRRIGATE_SOON", "MONITOR_RAIN"])
        self.assertTrue(len(data["farmer_response"]) > 0)
        self.assertTrue(len(data["factors"]) > 0)

    def test_fertilizer_recommendation_no_npk_fabrication(self):
        phone = "9876543202"
        
        # 1. Onboard without soil test
        client.post("/api/v1/farmer/voice-update", json={
            "farmer_phone": phone,
            "text_input": "నా పేరు లక్ష్మణ్. నా మూడు ఎకరాల్లో పత్తి ఉంది.",
            "language": "te"
        })

        # 2. Request fertilizer advice
        res = client.get(f"/api/v1/ai/fertilizer/recommendation?farmer_phone={phone}&language=te")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertFalse(data["soil_test_available"])
        self.assertTrue(data["requires_soil_test"])
        self.assertTrue(len(data["stage_advisory"]) > 0)
        self.assertTrue(len(data["recommended_inputs"]) > 0)

    def test_crop_health_insufficient_image_no_hallucination(self):
        # Empty / non-vegetation fake image should return IMAGE_INSUFFICIENT
        res = client.post("/api/v1/ai/crop-health", json={
            "farmer_phone": "9876543203",
            "images": ["data:image/jpeg;base64,ZmFrZS1pbWFnZS1ieXRlcw=="],  # invalid bytes
            "transcript": "నా టమాటా పంటలో ఆకులు ఎందుకు ఇలా ఉన్నాయి",
            "language": "te"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["image_status"], "IMAGE_INSUFFICIENT")
        self.assertEqual(len(data["possible_issues"]), 0)
        self.assertIn("స్పష్టంగా", data["farmer_summary"])

    def test_today_plan_priorities_assembly(self):
        phone = "9876543204"
        
        client.post("/api/v1/farmer/voice-update", json={
            "farmer_phone": phone,
            "text_input": "నా పేరు శ్రీనివాస్. నా నాలుగు ఎకరాల్లో మిరప ఉంది. మిరప వేసి 48 రోజులు అయింది.",
            "language": "te"
        })

        res = client.get(f"/api/v1/ai/plan/today?farmer_phone={phone}&language=te")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["crop_name"], "Chilli")
        self.assertEqual(data["crop_age_days"], 48)
        self.assertTrue(len(data["priorities"]) >= 3)
        
        # Verify core priorities present
        types = [p["type"] for p in data["priorities"]]
        self.assertIn("IRRIGATION", types)
        self.assertIn("FERTILIZER", types)
        self.assertIn("WEATHER_RISK", types)

    def test_ai_recommend_endpoint_dispatcher(self):
        phone = "9876543205"
        
        res = client.post("/api/v1/ai/recommend", json={
            "farmer_phone": phone,
            "user_question": "నా పంటకు ఎప్పుడు నీళ్లు పెట్టాలి?",
            "language": "te"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["recommendation"]["intent"], "IRRIGATION")
        self.assertTrue(len(data["farmer_response"]) > 0)


if __name__ == "__main__":
    unittest.main()
