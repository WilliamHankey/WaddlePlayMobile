"""Iteration 3: Playdate creation w/ private_note, match_reasons, saved resources."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@waddleplay.com"
DEMO_PW = "password123"


@pytest.fixture(scope="module")
def demo_headers():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PW}, timeout=15)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def other_headers():
    # A second, isolated user (signup)
    email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "password123", "name": "TESTOther"}, timeout=15)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestPlaydateCreation:
    """POST /api/playdates with private_note"""

    def test_create_playdate_with_private_note(self, demo_headers):
        payload = {
            "title": "TEST_Quiet park hangout",
            "category": "park",
            "location": "TEST Park",
            "date": "2026-08-01",
            "start_time": "10:00 AM",
            "end_time": "12:00 PM",
            "age_min": 4,
            "age_max": 7,
            "description": "Test playdate created by pytest.",
            "sensory_friendly_tags": ["quiet", "small groups"],
            "interests": ["nature"],
            "max_children": 5,
            "private_note": "Meet by the big oak tree.",
        }
        r = requests.post(f"{API}/playdates", headers=demo_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"].startswith("pd-")
        assert data["private_note"] == "Meet by the big oak tree."
        assert data["title"] == "TEST_Quiet park hangout"
        assert data["max_children"] == 5
        # persist id for later tests
        pytest.created_pd_id = data["id"]

    def test_get_by_host_reveals_private_note_and_reasons(self, demo_headers):
        pd_id = getattr(pytest, "created_pd_id", None)
        assert pd_id, "playdate id from previous test missing"
        r = requests.get(f"{API}/playdates/{pd_id}", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["private_note"] == "Meet by the big oak tree."
        assert "match_reasons" in data and isinstance(data["match_reasons"], list)
        assert "match_score" in data and isinstance(data["match_score"], int)

    def test_get_by_other_user_hides_private_note(self, other_headers):
        pd_id = getattr(pytest, "created_pd_id", None)
        assert pd_id
        r = requests.get(f"{API}/playdates/{pd_id}", headers=other_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "private_note" not in data or data.get("private_note") in (None, "")
        # still has match_reasons and score
        assert isinstance(data.get("match_reasons"), list)


class TestListMatchReasons:
    """GET /api/playdates includes match_reasons on every item"""

    def test_list_has_match_reasons(self, demo_headers):
        r = requests.get(f"{API}/playdates", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 5
        for p in items:
            assert "match_reasons" in p, f"missing on {p.get('id')}"
            assert isinstance(p["match_reasons"], list)
            assert "match_score" in p


class TestSavedResources:
    """POST /save + GET /resources + GET /profile/saved-resources"""

    def test_save_then_list_marks_saved_true(self, demo_headers):
        # ensure clean state
        requests.post(f"{API}/resources/rs-1/unsave", headers=demo_headers, timeout=15)
        # save
        r = requests.post(f"{API}/resources/rs-1/save", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "saved"
        # list resources includes saved=true for rs-1
        items = requests.get(f"{API}/resources", headers=demo_headers, timeout=15).json()
        rs1 = next(i for i in items if i["id"] == "rs-1")
        assert rs1["saved"] is True

    def test_unsave_clears_saved_flag(self, demo_headers):
        r = requests.post(f"{API}/resources/rs-1/unsave", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        items = requests.get(f"{API}/resources", headers=demo_headers, timeout=15).json()
        rs1 = next(i for i in items if i["id"] == "rs-1")
        assert rs1["saved"] is False

    def test_saved_resources_reverse_chronological(self, demo_headers):
        # clean
        for rid in ("rs-1", "rs-2", "rs-3"):
            requests.post(f"{API}/resources/{rid}/unsave", headers=demo_headers, timeout=15)
        # save in order rs-1, rs-2, rs-3
        for rid in ("rs-1", "rs-2", "rs-3"):
            requests.post(f"{API}/resources/{rid}/save", headers=demo_headers, timeout=15)
        r = requests.get(f"{API}/profile/saved-resources", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        ids = [i["id"] for i in items]
        # newest first
        assert ids[:3] == ["rs-3", "rs-2", "rs-1"], f"unexpected order: {ids}"
        for i in items:
            assert i["saved"] is True
        # cleanup
        for rid in ("rs-1", "rs-2", "rs-3"):
            requests.post(f"{API}/resources/{rid}/unsave", headers=demo_headers, timeout=15)
