import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.crop_lifecycle_service import calculate_crop_age, determine_crop_stage
from app.services.voice_farm_extraction_service import _extract_entities_rule_based

client = TestClient(app)


class TestFarmFoundation(unittest.TestCase):

    def test_voice_entity_extraction_telugu_name_and_location(self):
        # "నా పేరు రమేష్. నేను వరంగల్ దగ్గర ఉంటాను."
        text = "నా పేరు రమేష్. నేను వరంగల్ దగ్గర ఉంటాను."
        entities = _extract_entities_rule_based(text)
        self.assertEqual(entities.get("name"), "రమేష్")
        self.assertEqual(entities.get("location"), "వరంగల్")

    def test_voice_entity_extraction_crop_and_area(self):
        # "నా రెండు ఎకరాల్లో మిరప ఉంది."
        text = "నా రెండు ఎకరాల్లో మిరప ఉంది."
        entities = _extract_entities_rule_based(text)
        self.assertEqual(entities.get("crop"), "Chilli")
        self.assertEqual(entities.get("area"), 2.0)

    def test_voice_entity_extraction_crop_age(self):
        # "మిరప వేసి 45 రోజులు అయింది."
        text = "మిరప వేసి 45 రోజులు అయింది."
        entities = _extract_entities_rule_based(text)
        self.assertEqual(entities.get("crop"), "Chilli")
        self.assertEqual(entities.get("crop_age_days"), 45)

    def test_voice_entity_extraction_irrigation_and_soil(self):
        # "ఈ పొలానికి డ్రిప్ ఉంది. ఈ పొలం నల్ల నేల."
        text = "ఈ పొలానికి డ్రిప్ ఉంది. ఈ పొలం నల్ల నేల."
        entities = _extract_entities_rule_based(text)
        self.assertEqual(entities.get("irrigation_method"), "drip")
        self.assertEqual(entities.get("soil_type"), "Black soil")

    def test_crop_lifecycle_stage_chilli_48_days(self):
        # Chilli at 48 days should be in Vegetative & Establishment stage
        stage_info = determine_crop_stage("Chilli", 48)
        self.assertEqual(stage_info["current_stage"], "Vegetative & Establishment")
        self.assertEqual(stage_info["next_stage"], "Flowering")
        self.assertTrue(stage_info["days_to_next_stage"] > 0)
        self.assertTrue(len(stage_info["stage_care_activities"]) > 0)

    def test_crop_lifecycle_stage_chilli_70_days(self):
        # Chilli at 70 days should be in Flowering stage
        stage_info = determine_crop_stage("Chilli", 70)
        self.assertEqual(stage_info["current_stage"], "Flowering")
        self.assertEqual(stage_info["next_stage"], "Fruit Development")

    def test_crop_lifecycle_unknown_crop_no_hallucination(self):
        # Unknown crop should return "Stage estimate unavailable"
        stage_info = determine_crop_stage("Dragonfruit", 45)
        self.assertEqual(stage_info["current_stage"], "Stage estimate unavailable")
        self.assertIsNone(stage_info["next_stage"])

    def test_full_farmer_to_context_flow_api(self):
        phone = "9876500001"

        # 1. Update/Onboard via voice-update endpoint
        # Farmer: Ramesh, 4 acres, Chilli, 48 days, drip, red soil
        res1 = client.post("/api/v1/farmer/voice-update", json={
            "farmer_phone": phone,
            "text_input": "నా పేరు రమేష్. నేను వరంగల్ దగ్గర ఉంటాను. నా నాలుగు ఎకరాలు పొలం ఉంది.",
            "language": "te"
        })
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertTrue(data1["success"])
        self.assertEqual(data1["extracted_entities"]["name"], "రమేష్")
        self.assertEqual(data1["extracted_entities"]["area"], 4.0)

        # 2. Add field crop & age via voice-update
        res2 = client.post("/api/v1/farmer/voice-update", json={
            "farmer_phone": phone,
            "text_input": "నా రెండు ఎకరాల్లో మిరప ఉంది. మిరప వేసి 48 రోజులు అయింది. ఈ పొలానికి డ్రిప్ ఉంది. ఈ పొలం ఎర్ర నేల.",
            "language": "te"
        })
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertTrue(data2["success"])
        self.assertEqual(data2["extracted_entities"]["crop"], "Chilli")
        self.assertEqual(data2["extracted_entities"]["crop_age_days"], 48)
        self.assertEqual(data2["extracted_entities"]["irrigation_method"], "drip")
        self.assertEqual(data2["extracted_entities"]["soil_type"], "Red soil")

        # 3. Fetch unified farm context
        res_ctx = client.get(f"/api/v1/farmer/context?phone={phone}")
        self.assertEqual(res_ctx.status_code, 200)
        ctx = res_ctx.json()
        self.assertTrue(ctx["success"])
        self.assertEqual(ctx["farmer"]["name"], "రమేష్")
        self.assertEqual(ctx["farm"]["total_area"], 4.0)
        self.assertEqual(ctx["crop"]["crop_name"], "Chilli")
        self.assertEqual(ctx["cropStage"]["crop_age_days"], 48)
        self.assertEqual(ctx["cropStage"]["current_stage"], "Vegetative & Establishment")
        self.assertEqual(ctx["cropStage"]["next_stage"], "Flowering")
        self.assertEqual(ctx["soil"]["soil_type"], "Red soil")
        self.assertTrue(ctx["weather"]["available"])
        self.assertIsNotNone(ctx["weather"]["temperature_c"])
        self.assertTrue(len(ctx["recentActivities"]) > 0)

    def test_weather_endpoint(self):
        res = client.get("/api/v1/weather/context?latitude=17.9689&longitude=79.5941")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["available"])
        self.assertIn("temperature_c", data)
        self.assertIn("relative_humidity_pct", data)
        self.assertIn("agricultural_hints", data)

    def test_soil_no_hallucination(self):
        # Verify that an empty soil record does not invent NPK values
        res = client.post("/api/v1/fields/11111111-2222-3333-4444-555555555555/soil", json={
            "field_id": "11111111-2222-3333-4444-555555555555",
            "soil_type": "Black soil",
            "source": "farmer_statement"
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIsNone(data["soil_record"]["ph"])
        self.assertIsNone(data["soil_record"]["n"])
        self.assertIsNone(data["soil_record"]["p"])
        self.assertIsNone(data["soil_record"]["k"])
        self.assertFalse(data["soil_record"]["is_verified"])


if __name__ == "__main__":
    unittest.main()
