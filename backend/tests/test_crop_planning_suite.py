import unittest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.services.crop_planning_service import (
    resolve_agricultural_season,
    get_verified_crop_schemes,
    _get_fallback_recommendations,
)


class TestCropPlanningSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_season_resolution_kharif(self):
        """Test Kharif season resolution during monsoon months (July)."""
        dt = datetime(2026, 7, 15)
        res = resolve_agricultural_season(dt, state="Telangana")
        self.assertEqual(res["season"], "KHARIF")
        self.assertIn("Kharif", res["season_name"])
        self.assertIn("June", res["sowing_period"])

    def test_season_resolution_rabi(self):
        """Test Rabi season resolution during winter months (December)."""
        dt = datetime(2026, 12, 10)
        res = resolve_agricultural_season(dt, state="Andhra Pradesh")
        self.assertEqual(res["season"], "RABI")
        self.assertIn("Rabi", res["season_name"])

    def test_season_resolution_zaid(self):
        """Test Zaid summer season resolution (April)."""
        dt = datetime(2026, 4, 20)
        res = resolve_agricultural_season(dt, state="Telangana")
        self.assertEqual(res["season"], "ZAID")
        self.assertIn("Zaid", res["season_name"])

    def test_season_resolution_tamil_nadu_variation(self):
        """Test regional calendar variation for Tamil Nadu (Samba in November)."""
        dt = datetime(2026, 11, 5)
        res = resolve_agricultural_season(dt, state="Tamil Nadu")
        self.assertEqual(res["season"], "SAMBA")

    def test_verified_crop_schemes_grounding(self):
        """Test that government schemes strictly map from verified catalog without hallucination."""
        # Cotton in black soil should match PMFBY crop insurance and PMKSY micro irrigation
        schemes = get_verified_crop_schemes("Cotton", "Telangana", "BLACK", "KHARIF")
        self.assertGreaterEqual(len(schemes), 1)
        scheme_names = [s["name"] for s in schemes]
        self.assertTrue(any("PMFBY" in name or "Pradhan Mantri Fasal Bima" in name for name in scheme_names))

        # Groundnut in red soil should match NFSM / PMFBY
        gn_schemes = get_verified_crop_schemes("Groundnut", "Andhra Pradesh", "RED", "KHARIF")
        self.assertGreaterEqual(len(gn_schemes), 1)

    def test_fallback_recommendation_math_exactness(self):
        """Test that total investment and return math accurately multiplies acreage."""
        acres = 4.5
        recs = _get_fallback_recommendations("BLACK", "KHARIF", acres, "en")
        self.assertGreaterEqual(len(recs), 2)
        for r in recs:
            per_acre_inv = r["estimated_investment_per_acre"]
            tot_inv = r["estimated_total_investment"]
            self.assertEqual(tot_inv, round(per_acre_inv * acres))

            ret_min = r["estimated_return_per_acre_min"]
            tot_ret_min = r["estimated_total_return_min"]
            self.assertEqual(tot_ret_min, round(ret_min * acres))

    def test_api_validation_negative_or_zero_acres(self):
        """Test that 0 or negative acres returns HTTP 422/400 validation error."""
        res = self.client.post("/api/v1/crop-planning/recommend", json={
            "land_area_acres": 0,
            "soil_type": "BLACK"
        })
        self.assertIn(res.status_code, (400, 422))

    def test_api_validation_invalid_soil_type(self):
        """Test that non-supported soil types return validation error."""
        res = self.client.post("/api/v1/crop-planning/recommend", json={
            "land_area_acres": 2,
            "soil_type": "SANDY_LOAM"
        })
        self.assertIn(res.status_code, (400, 422))

    def test_api_successful_recommendation_response(self):
        """Test end-to-end recommendation response structure."""
        res = self.client.post("/api/v1/crop-planning/recommend", json={
            "land_area_acres": 2,
            "soil_type": "BLACK",
            "language": "en"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIn("recommendations", data)
        self.assertGreaterEqual(len(data["recommendations"]), 2)
        self.assertIn("summary", data)
        self.assertIn("government_support", data)

        # Check math on first recommendation
        first_rec = data["recommendations"][0]
        self.assertIn("estimated_investment_per_acre", first_rec)
        self.assertIn("estimated_total_investment", first_rec)
        self.assertEqual(
            first_rec["estimated_total_investment"],
            round(first_rec["estimated_investment_per_acre"] * 2)
        )


if __name__ == "__main__":
    unittest.main()
