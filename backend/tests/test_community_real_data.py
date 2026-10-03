import unittest
from unittest.mock import MagicMock
from app.services.community_service import _resolve_farmer


class TestCommunityRealData(unittest.TestCase):
    def test_resolve_farmer_by_id(self):
        client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{"id": "farmer-123", "name": "Ramesh", "phone": "+919876543210"}]
        client.table().select().eq().limit().execute.return_value = mock_response

        farmer = _resolve_farmer(client, farmer_id="farmer-123")
        self.assertEqual(farmer["id"], "farmer-123")
        self.assertEqual(farmer["name"], "Ramesh")

    def test_resolve_farmer_auto_register(self):
        client = MagicMock()
        empty_response = MagicMock()
        empty_response.data = []

        new_farmer_res = MagicMock()
        new_farmer_res.data = [{"id": "new-farmer-456", "name": "Suresh", "phone": "+919876543299"}]

        client.table().select().eq().limit().execute.return_value = empty_response
        client.table().insert().execute.return_value = new_farmer_res

        farmer = _resolve_farmer(client, farmer_phone="9876543299", farmer_name="Suresh")
        self.assertEqual(farmer["id"], "new-farmer-456")
    def test_list_posts_excludes_own_complaints(self):
        from app.services.community_service import list_posts
        
        # Test that list_posts filters out complaints where farmer matches current_farmer_phone
        res_all = list_posts(limit=20)
        self.assertTrue(res_all.get("success"))
        
        # When current_farmer_phone is Rishik (+919347025781), none of Rishik's posts should appear
        res_filtered = list_posts(limit=20, current_farmer_phone="+919347025781")
        self.assertTrue(res_filtered.get("success"))
        
        for post in res_filtered.get("posts", []):
            author_phone = post.get("author", {}).get("phone") or ""
            author_id = post.get("author", {}).get("id") or ""
            self.assertFalse(author_phone.endswith("9347025781"), f"Rishik's own complaint {post['id']} should not be in community feed")
            self.assertNotEqual(author_id, "55ab53b3-2975-4216-aab2-ffde1466e06d")
            
            # Verify no fake unsplash images
            photo_url = post.get("photo_url") or ""
            self.assertNotIn("unsplash.com", photo_url, "No fake Unsplash images should exist")


if __name__ == "__main__":
    unittest.main()
